import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import query, query_one
from ..deps import get_current_user, require_partner, require_not_operator
from ..config import settings

router = APIRouter()
logger = logging.getLogger("dtl.ai")

# Simple in-memory cache for anomalies (reset on restart)
_anomaly_cache: dict = {"data": None, "at": None}


def _get_claude_client():
    if not settings.ANTHROPIC_API_KEY:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except ImportError:
        return None


class TTNScanRequest(BaseModel):
    image_url: str   # URL like /uploads/filename.jpg


class QueryRequest(BaseModel):
    question: str


@router.post("/ai/scan-ttn")
def scan_ttn(body: TTNScanRequest, user: dict = Depends(get_current_user)):
    """OCR a TTN photo using Claude Vision. Returns extracted fields as JSON."""
    client = _get_claude_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI недоступен")

    # Build absolute URL for the image
    image_url = body.image_url
    if image_url.startswith('/uploads/'):
        # Read the file from disk and send as base64
        import os, base64
        uploads_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'uploads')
        filename = os.path.basename(image_url)
        filepath = os.path.join(uploads_dir, filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Файл не найден")
        with open(filepath, 'rb') as f:
            img_data = base64.standard_b64encode(f.read()).decode('utf-8')
        # Detect media type
        ext = filename.lower().split('.')[-1]
        media_type = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}.get(ext, 'image/jpeg')

        message_content = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": img_data}
            },
            {"type": "text", "text": "Извлеки данные из этой транспортной накладной (ТТН) и верни ТОЛЬКО JSON без пояснений."}
        ]
    else:
        message_content = [
            {"type": "image", "source": {"type": "url", "url": image_url}},
            {"type": "text", "text": "Извлеки данные из этой транспортной накладной (ТТН) и верни ТОЛЬКО JSON без пояснений."}
        ]

    system_prompt = """Ты OCR-система для российских транспортных накладных (ТТН) на нефтепродукты.
Из фото извлеки данные в JSON:
{
  "ttn_number": "номер ТТН или накладной",
  "date": "YYYY-MM-DD",
  "volume_liters": число (если в литрах),
  "volume_cubic": число (если в кубометрах),
  "supplier": "название поставщика",
  "driver": "ФИО водителя",
  "truck_plate": "гос. номер машины",
  "temperature": число (°C, если указано),
  "density": число (г/см³, если указано)
}
Если поле не найдено — верни null. Отвечай ТОЛЬКО JSON, без markdown, без пояснений."""

    try:
        import anthropic
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": message_content}]
        )
        text = resp.content[0].text.strip()
        # Strip markdown code fences if present
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
            text = text.rsplit('```', 1)[0].strip()
        data = json.loads(text)
        return {"ok": True, "data": data}
    except json.JSONDecodeError:
        return {"ok": True, "data": {}, "raw": text}
    except Exception as e:
        logger.warning(f"TTN scan error: {e}")
        raise HTTPException(status_code=503, detail=f"AI ошибка: {str(e)[:100]}")


DB_SCHEMA_SUMMARY = """
Таблицы PostgreSQL базы данных DTL (Diesel Trade Logistic):
- users(id, name, email, role) — роли: partner, artem, operator
- fuel_receipts(id, received_at, source, volume_nominal, volume_adjusted, ttn_confirmed, ttn_number) — приёмка топлива на базу
- fuel_dispatches(id, dispatched_at, truck_id, driver_id, site_id, order_id, volume, tariff, status, delivered_at) — рейсы на участки
  status: dispatched, in_transit, delivered, cancelled
- trucks(id, name, owner, tank_volume, status) — автопарк (owner: DTL, Артём)
- drivers(id, name, truck_id) — водители
- sites(id, name) — участки доставки
- clients(id, name) — клиенты
- orders(id, client_id, paid_at, amount_paid, volume_ordered, status) — заказы клиентов
- hire_deliveries(id, delivery_at, client_id, supplier_id, carrier_id, volume_liters, amount_client, margin) — найм (Хаб→Тында)
- income_records(id, income_at, client_id, amount) — доходы
- company_expenses(id, expense_at, category, amount) — расходы компании
- fleet_expenses(id, truck_id, expense_at, category, amount) — расходы автопарка
- debt_records(id, recorded_at, debtor, amount, type) — долги (type: ДОЛГ или ОПЛАТА)
- carriers(id, name) — перевозчики
- suppliers(id, name) — поставщики
- tariffs(id, site_id, truck_owner, amount) — тарифы рейсов
- cash_to_artem(id, given_at, amount_given, amount_spent, is_settled) — наличные Артёму
- fuel_advances(id, given_at, recipient, volume, amount, status) — авансы топлива
- monthly_reconciliations(id, period, calculated_stock, physical_stock, difference) — сверки
- balance_entries(id, period, category, object_name, amount, entry_type) — баланс

Формула остатка на базе:
SELECT COALESCE(SUM(volume_adjusted) FILTER (WHERE ttn_confirmed), 0)
     - COALESCE(SUM(CASE WHEN status != 'cancelled' THEN volume ELSE 0 END), 0) FROM fuel_dispatches
FROM fuel_receipts, fuel_dispatches

Выручка = SUM(hire_deliveries.amount_client) — фактические продажи найм
"""


FINANCIAL_TABLES = {"income_records", "company_expenses", "debt_records", "hire_deliveries", "cash_to_artem", "balance_entries"}

@router.post("/ai/query")
def ai_query(body: QueryRequest, user: dict = Depends(require_not_operator)):
    """Translate a Russian question to SQL, execute, return formatted answer."""
    client = _get_claude_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI-запросы временно недоступны")

    if not body.question or len(body.question) > 500:
        raise HTTPException(status_code=400, detail="Вопрос слишком длинный")

    role = user.get("role", "")
    is_artem = role == "artem"

    # Role-based schema: Artem sees fleet/dispatch data, not financial tables
    if is_artem:
        schema_note = """
ВАЖНО: У пользователя роль "artem". Он может видеть только:
- trucks (только owner='Артём'), drivers, fleet_expenses (только его машины)
- fuel_dispatches, fuel_receipts, sites, orders, clients, fuel_advances
НЕ используй таблицы: income_records, company_expenses, debt_records, hire_deliveries, cash_to_artem, balance_entries
Если вопрос касается этих таблиц — верни: ERROR: нет доступа к финансовым данным"""
    else:
        schema_note = ""

    # Step 1: Generate SQL
    sql_prompt = f"""Ты аналитик базы данных DTL (Diesel Trade Logistic). Схема БД:

{DB_SCHEMA_SUMMARY}
{schema_note}

Пользователь спрашивает: "{body.question}"

Сгенерируй SQL запрос (ТОЛЬКО SELECT, без INSERT/UPDATE/DELETE/DROP).
Верни ТОЛЬКО SQL запрос без пояснений, без markdown, без ```.
Если вопрос не про данные или нужен не-SELECT запрос — верни: ERROR: не могу выполнить"""

    try:
        import anthropic
        sql_resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": sql_prompt}]
        )
        sql = sql_resp.content[0].text.strip()

        if sql.upper().startswith("ERROR:"):
            return {"ok": False, "answer": sql.replace("ERROR:", "").strip()}

        # Safety check: only SELECT
        sql_upper = sql.upper().strip()
        if not sql_upper.startswith("SELECT") and not sql_upper.startswith("WITH"):
            return {"ok": False, "answer": "Могу выполнять только SELECT-запросы"}

        # Disallow dangerous keywords
        for kw in ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT"]:
            if kw in sql_upper:
                return {"ok": False, "answer": "Запрос содержит недопустимые операции"}

        # Role check: Artem cannot access financial tables
        if is_artem:
            for tbl in FINANCIAL_TABLES:
                if tbl.upper() in sql_upper:
                    return {"ok": False, "answer": "Нет доступа к финансовым данным"}

        # Execute SQL with limit safety
        if "LIMIT" not in sql_upper:
            sql = sql.rstrip(";") + " LIMIT 100"

        rows = query(sql)

        # Step 2: Format the answer
        result_json = json.dumps(rows, ensure_ascii=False, default=str)

        format_prompt = f"""Пользователь спросил: "{body.question}"
SQL вернул результат: {result_json[:3000]}

Ответь кратко на русском языке, используя числа из результата. 1-3 предложения максимум."""

        fmt_resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": format_prompt}]
        )
        answer = fmt_resp.content[0].text.strip()

        return {"ok": True, "answer": answer, "rows_count": len(rows)}

    except Exception as e:
        logger.warning(f"AI query error: {e}")
        if "rate_limit" in str(e).lower():
            raise HTTPException(status_code=429, detail="Лимит AI-запросов исчерпан")
        raise HTTPException(status_code=503, detail="AI временно недоступен")


@router.get("/ai/anomalies")
def get_anomalies(user: dict = Depends(require_partner)):
    """Return cached anomaly analysis (refreshed daily)."""
    global _anomaly_cache

    # Return cache if fresh (< 6 hours)
    if _anomaly_cache["data"] and _anomaly_cache["at"]:
        age = datetime.now() - _anomaly_cache["at"]
        if age < timedelta(hours=6):
            return _anomaly_cache["data"]

    client = _get_claude_client()
    if not client:
        return {"anomalies": [], "checked_at": None}

    try:
        # Gather data for anomaly detection
        recent_receipts = query("""
            SELECT source, volume_adjusted, received_at::date as date
            FROM fuel_receipts WHERE received_at > NOW() - INTERVAL '30 days'
            AND ttn_confirmed = TRUE ORDER BY received_at DESC
        """)

        stalled_orders = query("""
            SELECT o.id, c.name as client_name, o.volume_ordered,
                   COALESCE(SUM(fd.volume) FILTER (WHERE fd.status='delivered'), 0) as delivered
            FROM orders o
            LEFT JOIN clients c ON c.id = o.client_id
            LEFT JOIN fuel_dispatches fd ON fd.order_id = o.id
            WHERE o.status = 'active'
            GROUP BY o.id, c.name, o.volume_ordered
            HAVING o.volume_ordered > 0
            AND COALESCE(SUM(fd.volume) FILTER (WHERE fd.status='delivered'), 0) < o.volume_ordered * 0.95
        """)

        balance_row = query_one("SELECT balance_cubic FROM v_base_balance")
        balance = float(balance_row["balance_cubic"]) if balance_row else 0

        data_summary = f"""
Текущий остаток базы: {balance:.1f} куб

Последние приёмки (30 дней):
{json.dumps(recent_receipts[:20], default=str, ensure_ascii=False)}

Активные заказы с прогрессом:
{json.dumps(stalled_orders[:10], default=str, ensure_ascii=False)}
"""

        import anthropic
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": f"""Проанализируй данные DTL и найди аномалии или проблемы:

{data_summary}

Верни JSON массив (максимум 5 аномалий):
[{{"type": "warning|critical|info", "title": "Короткий заголовок", "description": "Детальное описание"}}]

Отвечай ТОЛЬКО JSON без пояснений."""}]
        )

        text = resp.content[0].text.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
            text = text.rsplit('```', 1)[0].strip()

        anomalies = json.loads(text)
        result = {"anomalies": anomalies, "checked_at": datetime.now().isoformat()}
        _anomaly_cache = {"data": result, "at": datetime.now()}
        return result

    except Exception as e:
        logger.warning(f"Anomaly check error: {e}")
        return {"anomalies": [], "checked_at": None, "error": str(e)[:100]}
