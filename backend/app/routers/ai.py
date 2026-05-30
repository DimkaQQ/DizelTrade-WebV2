import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import query, query_one, execute
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
        kwargs = {"api_key": settings.ANTHROPIC_API_KEY}
        if settings.ANTHROPIC_BASE_URL:
            kwargs["base_url"] = settings.ANTHROPIC_BASE_URL
        return anthropic.Anthropic(**kwargs)
    except ImportError:
        return None


def _log_ai_interaction(user_id: int, user_content: str, assistant_content: str, usage_or_tokens, model: str):
    """Log user question and assistant answer to ai_interactions table."""
    try:
        if isinstance(usage_or_tokens, int):
            tokens = usage_or_tokens
        elif usage_or_tokens is not None:
            tokens = getattr(usage_or_tokens, 'input_tokens', 0) + getattr(usage_or_tokens, 'output_tokens', 0)
        else:
            tokens = 0
        execute(
            "INSERT INTO ai_interactions (user_id, role, content, tokens_used, model) VALUES (%s, 'user', %s, 0, %s)",
            (user_id, user_content[:4000], model),
        )
        execute(
            "INSERT INTO ai_interactions (user_id, role, content, tokens_used, model) VALUES (%s, 'assistant', %s, %s, %s)",
            (user_id, assistant_content[:4000], tokens, model),
        )
    except Exception as log_err:
        logger.warning(f"Failed to log AI interaction: {log_err}")


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
            model="claude-opus-4-7",
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

APP_NAVIGATION = """
Навигация в приложении DTL Management:
- Дашборд (#home) — сводка: остаток на базе, рейсы в пути, выручка
- База Тында (#base) — вкладки:
    Главная — баланс базы, рейсы в пути
    Приёмки (#base?tab=receipts) — оформить приёмку топлива с ТТН
    Рейсы (#base?tab=trips) — записать новый рейс: кнопка "+ Рейс"
    Наличные (#base?tab=cash) — выдача наличных Артёму
    Авансы (#base?tab=advances) — авансы топлива
    Сверка (#base?tab=reconcile) — сверка остатков
- Найм (#hire) — доставки по найму (клиент → поставщик → перевозчик, маржа)
- Доходы (#income) — записи поступлений от клиентов
- Расходы (#expenses) — общие расходы компании
- Долги (#debts) — учёт долгов и оплат
- Автопарк (#fleet) — список машин, архив (прокрути вниз), расходы по машинам
- Аналитика (#analytics) — клиенты, поставщики, машины, финансовый итог по месяцам
- Год итоги (#annual) — годовая сводка
"""


@router.post("/ai/query")
def ai_query(body: QueryRequest, user: dict = Depends(require_not_operator)):
    """General assistant: answers app usage questions and data queries via NL→SQL."""
    client = _get_claude_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI-запросы временно недоступны")

    if not body.question or len(body.question) > 500:
        raise HTTPException(status_code=400, detail="Вопрос слишком длинный")

    # Enforce daily cost limit (partners only)
    if user.get("role") == "partner":
        try:
            limit_row = query_one("SELECT value FROM settings WHERE key = 'ai_daily_limit_rub'")
            daily_limit = float(limit_row["value"]) if limit_row else 500.0
            usage_row = query_one(
                "SELECT COALESCE(SUM(tokens_used), 0) AS tokens FROM ai_interactions WHERE DATE(created_at) = CURRENT_DATE"
            )
            today_tokens = int(usage_row["tokens"] if usage_row else 0)
            today_cost = today_tokens / 1000 * 4.5
            if today_cost >= daily_limit:
                raise HTTPException(status_code=429, detail=f"Дневной лимит AI исчерпан ({daily_limit:.0f} ₽). Сбросится завтра.")
        except HTTPException:
            raise
        except Exception:
            pass

    role = user.get("role", "")
    is_artem = role == "artem"

    artem_restriction = """
ОГРАНИЧЕНИЕ ДОСТУПА: пользователь видит только fleet/dispatch данные (trucks owner='Артём', drivers, fleet_expenses, fuel_dispatches, fuel_receipts).
Финансовые таблицы (income_records, company_expenses, debt_records, hire_deliveries, cash_to_artem) — недоступны.
""" if is_artem else ""

    write_actions = """
Ты также можешь ЗАПИСЫВАТЬ данные. Если пользователь просит что-то записать/добавить/зафиксировать — верни JSON действия:
{{"type":"action","action":"ИМЯ_ДЕЙСТВИЯ","description":"Описание того что будет записано (для подтверждения пользователем)","data":{{...}}}}

Доступные действия:
- create_income: записать поступление денег. data: {{income_at (YYYY-MM-DD), amount (число), client_name (строка), volume (число тонн, если есть), comment}}
- create_expense: записать расход компании. data: {{expense_at, category (одна из: Топливо, Зарплата, Ремонт, ТО, Аренда, Прочие), amount, comment}}
- create_hire: записать найм-доставку. data: {{delivery_at, client_name, supplier_name (поставщик, может быть null), carrier_name (перевозчик, может быть null), volume_liters, price_client, amount_client, margin, comment}}
- create_debt: записать долг или оплату долга. data: {{recorded_at, debtor (имя должника), amount, type ("ДОЛГ" или "ОПЛАТА"), comment}}
- create_fleet_expense: расход по машине. data: {{truck_name, expense_at, category (Ремонт/ТО/Зарплата/Топливо/Резина/Страховка/Прочие), amount, comment}}
""" if not is_artem else ""

    system_prompt = f"""Ты ИИ-ассистент системы управления DTL (Diesel Trade Logistic).
{artem_restriction}
{APP_NAVIGATION}

База данных:
{DB_SCHEMA_SUMMARY}
{write_actions}
Правила:
1. Если вопрос о том КАК что-то сделать — ответь текстом, кратко (1-3 предложения).
2. Если просят ДАННЫЕ (суммы, статистика) — верни JSON: {{"type":"sql","query":"SELECT ..."}}
3. Если просят ЗАПИСАТЬ что-то — верни JSON действия (см. выше).
4. Отвечай только на русском языке.
5. НЕ используй markdown: никаких **, *, #, [], (), ``. Пиши обычным текстом."""

    try:
        import anthropic
        resp = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=600,
            system=system_prompt,
            messages=[{"role": "user", "content": body.question}]
        )
        text = resp.content[0].text.strip()

        # Try to parse as JSON (sql or action)
        sql_query = None
        action_data = None
        if text.startswith('{') or '"type"' in text:
            try:
                clean = text
                if clean.startswith('```'):
                    clean = clean.split('\n', 1)[1] if '\n' in clean else clean[3:]
                    clean = clean.rsplit('```', 1)[0].strip()
                parsed = json.loads(clean)
                if parsed.get("type") == "sql":
                    sql_query = parsed.get("query", "").strip()
                elif parsed.get("type") == "action" and not is_artem:
                    action_data = parsed
            except (json.JSONDecodeError, AttributeError):
                pass

        # Return action for frontend confirmation
        if action_data:
            _log_ai_interaction(user["id"], body.question, action_data.get("description", text), getattr(resp, 'usage', None), "claude-opus-4-7")
            return {"ok": True, "type": "action", "action": action_data.get("action"), "description": action_data.get("description", ""), "data": action_data.get("data", {})}

        if sql_query:
            # Safety check
            sql_upper = sql_query.upper().strip()
            if not sql_upper.startswith("SELECT") and not sql_upper.startswith("WITH"):
                return {"ok": True, "answer": "Могу выполнять только SELECT-запросы для получения данных."}
            for kw in ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT"]:
                if kw in sql_upper:
                    return {"ok": True, "answer": "Не могу выполнить этот запрос — он изменяет данные."}
            if is_artem:
                for tbl in FINANCIAL_TABLES:
                    if tbl.upper() in sql_upper:
                        return {"ok": True, "answer": "У вас нет доступа к финансовым данным."}
            if "LIMIT" not in sql_upper:
                sql_query = sql_query.rstrip(";") + " LIMIT 100"

            rows = query(sql_query)
            result_json = json.dumps(rows, ensure_ascii=False, default=str)

            fmt_resp = client.messages.create(
                model="claude-opus-4-7",
                max_tokens=300,
                messages=[{"role": "user", "content": f'Вопрос: "{body.question}"\nДанные: {result_json[:3000]}\n\nОтветь кратко на русском, 1-3 предложения.'}]
            )
            answer = fmt_resp.content[0].text.strip()
            total_tokens = 0
            if hasattr(resp, 'usage') and resp.usage:
                total_tokens += getattr(resp.usage, 'input_tokens', 0) + getattr(resp.usage, 'output_tokens', 0)
            if hasattr(fmt_resp, 'usage') and fmt_resp.usage:
                total_tokens += getattr(fmt_resp.usage, 'input_tokens', 0) + getattr(fmt_resp.usage, 'output_tokens', 0)
            _log_ai_interaction(user["id"], body.question, answer, total_tokens, "claude-opus-4-7")
            return {"ok": True, "answer": answer, "rows_count": len(rows)}

        # Direct text answer
        _log_ai_interaction(user["id"], body.question, text, getattr(resp, 'usage', None), "claude-opus-4-7")
        return {"ok": True, "answer": text}

    except Exception as e:
        logger.warning(f"AI query error: {e}")
        if "rate_limit" in str(e).lower():
            raise HTTPException(status_code=429, detail="Лимит AI-запросов исчерпан")
        raise HTTPException(status_code=503, detail="AI временно недоступен")


class ExecuteRequest(BaseModel):
    action: str
    data: Dict[str, Any]


def _resolve_client(name: str) -> int:
    if not name: raise HTTPException(400, "Не указан клиент")
    row = query_one("SELECT id FROM clients WHERE LOWER(name) = LOWER(%s)", (name.strip(),))
    if not row:
        row = execute("INSERT INTO clients (name) VALUES (%s) RETURNING id", (name.strip(),), returning=True)
    return row["id"]


def _resolve_truck(name: str) -> int:
    if not name: raise HTTPException(400, "Не указана машина")
    row = query_one("SELECT id FROM trucks WHERE LOWER(name) = LOWER(%s)", (name.strip(),))
    if not row: raise HTTPException(400, f"Машина не найдена: {name}")
    return row["id"]


def _resolve_supplier(name: str):
    if not name: return None
    row = query_one("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(%s)", (name.strip(),))
    if not row:
        row = execute("INSERT INTO suppliers (name) VALUES (%s) RETURNING id", (name.strip(),), returning=True)
    return row["id"]


def _resolve_carrier(name: str):
    if not name: return None
    row = query_one("SELECT id FROM carriers WHERE LOWER(name) = LOWER(%s)", (name.strip(),))
    if not row:
        row = execute("INSERT INTO carriers (name) VALUES (%s) RETURNING id", (name.strip(),), returning=True)
    return row["id"]


@router.post("/ai/execute")
def ai_execute(body: ExecuteRequest, user: dict = Depends(require_partner)):
    """Execute a write action confirmed by the user."""
    d = body.data
    uid = user["id"]
    today = datetime.now().date().isoformat()

    try:
        if body.action == "create_income":
            client_id = _resolve_client(d.get("client_name", ""))
            execute(
                "INSERT INTO income_records (income_at, client_id, amount, volume, comment, entered_by) VALUES (%s,%s,%s,%s,%s,%s)",
                (d.get("income_at", today), client_id, float(d.get("amount", 0)), d.get("volume"), d.get("comment"), uid)
            )
            return {"ok": True, "message": f"Доход {d.get('amount')} ₽ записан"}

        elif body.action == "create_expense":
            execute(
                "INSERT INTO company_expenses (expense_at, category, amount, comment, entered_by) VALUES (%s,%s,%s,%s,%s)",
                (d.get("expense_at", today), d.get("category", "Прочие"), float(d.get("amount", 0)), d.get("comment"), uid)
            )
            return {"ok": True, "message": f"Расход {d.get('amount')} ₽ записан"}

        elif body.action == "create_debt":
            execute(
                "INSERT INTO debt_records (recorded_at, debtor, amount, type, comment) VALUES (%s,%s,%s,%s,%s)",
                (d.get("recorded_at", today), d.get("debtor", ""), float(d.get("amount", 0)), d.get("type", "ДОЛГ"), d.get("comment"))
            )
            return {"ok": True, "message": f"Долг {d.get('amount')} ₽ записан"}

        elif body.action == "create_hire":
            client_id = _resolve_client(d.get("client_name", ""))
            supplier_id = _resolve_supplier(d.get("supplier_name"))
            carrier_id = _resolve_carrier(d.get("carrier_name"))
            vol = float(d.get("volume_liters", 0))
            ac = float(d.get("amount_client", 0))
            margin = float(d.get("margin", 0))
            margin_pct = round(margin / ac * 100, 2) if ac > 0 else None
            execute(
                """INSERT INTO hire_deliveries
                   (delivery_at, client_id, supplier_id, carrier_id, volume_liters, price_client,
                    amount_client, margin, margin_pct, comment)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (d.get("delivery_at", today), client_id, supplier_id, carrier_id,
                 vol, d.get("price_client"), ac, margin, margin_pct, d.get("comment"))
            )
            return {"ok": True, "message": f"Найм {vol} л для {d.get('client_name')} записан"}

        elif body.action == "create_fleet_expense":
            truck_id = _resolve_truck(d.get("truck_name", ""))
            execute(
                "INSERT INTO fleet_expenses (truck_id, expense_at, category, amount, comment) VALUES (%s,%s,%s,%s,%s)",
                (truck_id, d.get("expense_at", today), d.get("category", "Прочие"), float(d.get("amount", 0)), d.get("comment"))
            )
            return {"ok": True, "message": f"Расход на {d.get('truck_name')} записан"}

        else:
            raise HTTPException(400, f"Неизвестное действие: {body.action}")

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"AI execute error: {e}")
        raise HTTPException(500, f"Ошибка записи: {str(e)[:100]}")


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
            model="claude-opus-4-7",
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


@router.get("/ai/usage")
def get_ai_usage(user: dict = Depends(require_partner)):
    """Daily and monthly token usage + estimated cost."""
    today_row = query_one(
        """SELECT COALESCE(SUM(tokens_used), 0) AS tokens
           FROM ai_interactions WHERE DATE(created_at) = CURRENT_DATE""",
    )
    month_row = query_one(
        """SELECT COALESCE(SUM(tokens_used), 0) AS tokens
           FROM ai_interactions
           WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
             AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())""",
    )
    limit_setting = query_one("SELECT value FROM settings WHERE key = 'ai_daily_limit_rub'")
    daily_limit = float(limit_setting["value"]) if limit_setting else 500.0

    RUB_PER_1K = 4.5  # ~$0.045/1k tokens * 100 RUB/USD
    today_tokens = int(today_row["tokens"] if today_row else 0)
    month_tokens = int(month_row["tokens"] if month_row else 0)
    return {
        "today_tokens": today_tokens,
        "today_cost_rub": round(today_tokens / 1000 * RUB_PER_1K, 2),
        "month_tokens": month_tokens,
        "month_cost_rub": round(month_tokens / 1000 * RUB_PER_1K, 2),
        "daily_limit_rub": daily_limit,
    }


@router.get("/ai/interactions")
def get_ai_interactions(user: dict = Depends(require_partner)):
    """Last 100 AI interactions log."""
    return query(
        """SELECT ai.id, u.name AS user_name, ai.role, LEFT(ai.content, 200) AS content,
                  ai.tokens_used, ai.model, ai.created_at
           FROM ai_interactions ai
           LEFT JOIN users u ON u.id = ai.user_id
           ORDER BY ai.created_at DESC LIMIT 100""",
    )
