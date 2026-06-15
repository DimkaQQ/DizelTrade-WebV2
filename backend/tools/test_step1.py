#!/usr/bin/env python3
"""
Step 1 API smoke-test — проверяет все изменения Шага 1.

Запуск на сервере:
  cd /opt/dtl
  source backend/venv/bin/activate
  python3 backend/tools/test_step1.py <email> <password>
  python3 backend/tools/test_step1.py <email> <password> http://localhost:8000
"""
import sys, json
import urllib.request, urllib.error

if len(sys.argv) < 3:
    print(__doc__)
    sys.exit(1)

EMAIL    = sys.argv[1]
PASSWORD = sys.argv[2]
BASE     = sys.argv[3].rstrip("/") if len(sys.argv) > 3 else "http://localhost:8000"

GREEN = "\033[92m"; RED = "\033[91m"; YELLOW = "\033[93m"; RESET = "\033[0m"
PASS_  = f"{GREEN}✅ PASS{RESET}"
FAIL_  = f"{RED}❌ FAIL{RESET}"
INFO_  = f"{YELLOW}ℹ️  INFO{RESET}"

TOKEN = ""
_results: list[tuple[str, bool]] = []


def req(method, path, body=None, token=None, expected=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    tok = token if token is not None else TOKEN
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    if tok:
        headers["Authorization"] = f"Bearer {tok}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            try:
                rb = json.loads(resp.read())
            except Exception:
                rb = {}
            return resp.status, rb
    except urllib.error.HTTPError as e:
        try:
            rb = json.loads(e.read())
        except Exception:
            rb = {}
        return e.code, rb


def check(name, ok, detail=""):
    label = PASS_ if ok else FAIL_
    print(f"  {label}  {name}" + (f"  [{detail}]" if detail else ""))
    _results.append((name, ok))


def info(msg):
    print(f"  {INFO_}  {msg}")


def section(title):
    print(f"\n{'═'*60}")
    print(f"  {title}")
    print('═'*60)


# ═══════════════════════════════════════════════════════════
section("0. LOGIN")
# ═══════════════════════════════════════════════════════════
code, body = req("POST", "/api/auth/login", {"login": EMAIL, "password": PASSWORD}, token="")
check("POST /auth/login → 200", code == 200, f"status={code}")
if code != 200:
    print(f"  Ошибка: {body}")
    sys.exit(1)
TOKEN = body.get("access_token", "")
check("Got access_token", bool(TOKEN), "token present")
info(f"Logged in as: {body.get('name')} ({body.get('role')})")
ROLE = body.get("role", "")
IS_PARTNER = ROLE == "partner"

# ═══════════════════════════════════════════════════════════
section("1. HEALTH")
# ═══════════════════════════════════════════════════════════
code, body = req("GET", "/api/health", token="")
check("GET /health → 200", code == 200, f"status={code}")
check("DB connected", body.get("db") is True, str(body.get("db")))

# ═══════════════════════════════════════════════════════════
section("2. REFERENCE DATA")
# ═══════════════════════════════════════════════════════════
code, clients = req("GET", "/api/clients")
check("GET /clients → 200", code == 200, f"count={len(clients) if isinstance(clients, list) else '?'}")
client_id = clients[0]["id"] if isinstance(clients, list) and clients else None

code, suppliers = req("GET", "/api/suppliers")
check("GET /suppliers → 200", code == 200, f"count={len(suppliers) if isinstance(suppliers, list) else '?'}")
supplier_id = suppliers[0]["id"] if isinstance(suppliers, list) and suppliers else None

code, trucks = req("GET", "/api/trucks")
check("GET /trucks → 200", code == 200, f"count={len(trucks) if isinstance(trucks, list) else '?'}")
truck_id = trucks[0]["id"] if isinstance(trucks, list) and trucks else None

code, sites = req("GET", "/api/sites")
check("GET /sites → 200", code == 200, f"count={len(sites) if isinstance(sites, list) else '?'}")
site_id = sites[0]["id"] if isinstance(sites, list) and sites else None

code, carriers = req("GET", "/api/carriers")
check("GET /carriers → 200", code == 200, f"count={len(carriers) if isinstance(carriers, list) else '?'}")
carrier_id = carriers[0]["id"] if isinstance(carriers, list) and carriers else None

code, drivers = req("GET", "/api/drivers")
check("GET /drivers → 200", code == 200, f"count={len(drivers) if isinstance(drivers, list) else '?'}")
driver_id = drivers[0]["id"] if isinstance(drivers, list) and drivers else None

if not all([client_id, site_id, truck_id]):
    print(f"\n  {RED}Нет справочных данных — невозможно протестировать дальше.{RESET}")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════
section("3. ORDERS — базовый CRUD")
# ═══════════════════════════════════════════════════════════
code, orders_before = req("GET", "/api/orders")
check("GET /orders → 200", code == 200)

# Создаём тестовый заказ
order_payload = {
    "client_id": client_id,
    "paid_at": "2026-06-15",
    "volume_ordered": 50.0,
    "price_per_liter": 72.0,
    "amount_paid": 3600000.0,
    "delivery_type": "до участка",
    "site_ids": [site_id] if site_id else [],
}
code, new_order = req("POST", "/api/orders", order_payload)
check("POST /orders → 201", code == 201, f"status={code}, detail={new_order.get('detail','')}")
ORDER_ID = new_order.get("id") if code == 201 else None
if ORDER_ID:
    info(f"Создан заказ #{ORDER_ID} для client_id={client_id}")

# GET /orders?client_id=X — фильтрация по клиенту (новая фича Шага 1)
code, filtered = req("GET", f"/api/orders?status=active&client_id={client_id}")
check("GET /orders?client_id=X → 200", code == 200, f"count={len(filtered) if isinstance(filtered, list) else '?'}")
if isinstance(filtered, list) and ORDER_ID:
    found = any(o.get("id") == ORDER_ID for o in filtered)
    check("Новый заказ виден в фильтре по клиенту", found, f"order_id={ORDER_ID}")
    wrong_client = [o for o in filtered if o.get("client_id") != client_id]
    check("Фильтр не возвращает чужих клиентов", len(wrong_client) == 0,
          f"лишних={len(wrong_client)}")

# ═══════════════════════════════════════════════════════════
section("4. DISPATCHES — обязательный order_id")
# ═══════════════════════════════════════════════════════════
# 4a. БЕЗ order_id → должен быть 400
code, body = req("POST", "/api/base/dispatches", {
    "truck_id": truck_id, "site_id": site_id, "truck_owner": "DTL",
    "volume": 20.0, "ttn_number": "TEST-NO-ORDER",
})
check("POST /dispatches без order_id → 400", code == 400,
      f"status={code}, detail={body.get('detail','')}")

# 4b. С order_id → должен быть 201
DISPATCH_ID = None
if ORDER_ID:
    code, body = req("POST", "/api/base/dispatches", {
        "order_id": ORDER_ID,
        "truck_id": truck_id,
        "driver_id": driver_id,
        "site_id": site_id,
        "truck_owner": "DTL",
        "volume": 20.0,
        "ttn_number": "TEST-001",
    })
    check("POST /dispatches с order_id → 201", code == 201,
          f"status={code}, detail={body.get('detail','')}")
    DISPATCH_ID = body.get("id") if code == 201 else None
    if DISPATCH_ID:
        info(f"Создан рейс #{DISPATCH_ID} под заказ #{ORDER_ID}")
        # Отмечаем рейс как доставленный — иначе delivery_summary не считает DTL-объём
        code2, _ = req("PUT", f"/api/base/dispatches/{DISPATCH_ID}/status", {"status": "delivered"})
        check("PUT /dispatches/{id}/status → delivered (200)", code2 == 200, f"status={code2}")

# ═══════════════════════════════════════════════════════════
section("5. CASH ARTEM — обязательный order_id")
# ═══════════════════════════════════════════════════════════
# 5a. БЕЗ order_id → 400
code, body = req("POST", "/api/base/cash-artem", {
    "given_at": "2026-06-15", "amount_given": 100000, "purpose": "TEST без заказа",
})
check("POST /cash-artem без order_id → 400", code == 400,
      f"status={code}, detail={body.get('detail','')}")

# 5b. С order_id → 201
CASH_ID = None
if ORDER_ID:
    code, body = req("POST", "/api/base/cash-artem", {
        "given_at": "2026-06-15",
        "amount_given": 500000,
        "purpose": "Закупка топлива TEST",
        "order_id": ORDER_ID,
    })
    check("POST /cash-artem с order_id → 201", code == 201,
          f"status={code}, detail={body.get('detail','')}")
    CASH_ID = body.get("id") if code == 201 else None
    if CASH_ID:
        info(f"Создана запись наличных #{CASH_ID} под заказ #{ORDER_ID}")

# ═══════════════════════════════════════════════════════════
section("6. HIRE — обязательный order_id")
# ═══════════════════════════════════════════════════════════
# 6a. БЕЗ order_id → 400
code, body = req("POST", "/api/hire", {
    "client_id": client_id,
    "supplier_id": supplier_id or client_id,
    "delivery_at": "2026-06-15",
    "volume_liters": 20000,
    "price_client": 74.0,
})
check("POST /hire без order_id → 400", code == 400,
      f"status={code}, detail={body.get('detail','')}")

# 6b. С order_id → 201
HIRE_ID = None
if ORDER_ID:
    code, body = req("POST", "/api/hire", {
        "order_id": ORDER_ID,
        "client_id": client_id,
        "supplier_id": supplier_id or client_id,
        "carrier_id": carrier_id,
        "delivery_at": "2026-06-15",
        "volume_liters": 15000,
        "price_client": 74.0,
        "price_supplier": 60.0,
        "price_carrier": 7.0,
    })
    check("POST /hire с order_id → 201", code == 201,
          f"status={code}, detail={body.get('detail','')}")
    HIRE_ID = body.get("id") if code == 201 else None
    if HIRE_ID:
        info(f"Создана найм-сделка #{HIRE_ID} под заказ #{ORDER_ID}")

# ═══════════════════════════════════════════════════════════
section("7. RECEIPTS — новые поля (purchase_amount, price_per_liter, order_id)")
# ═══════════════════════════════════════════════════════════
RECEIPT_ID = None
receipt_payload = {
    "received_at": "2026-06-15",
    "supplier_id": supplier_id or client_id,
    "volume_nominal": 30000,
    "volume_adjusted": 29800,
    "ttn_number": "ТТН-TEST-001",
    "purchase_amount": 1788000.0,
    "price_per_liter": 60.0,
    "order_id": ORDER_ID,
    "cash_record_id": CASH_ID,
}
code, body = req("POST", "/api/base/receipts", receipt_payload)
check("POST /receipts с purchase_amount+order_id → 201", code == 201,
      f"status={code}, detail={body.get('detail','')}")
RECEIPT_ID = body.get("id") if code == 201 else None
if RECEIPT_ID:
    info(f"Создана приёмка #{RECEIPT_ID}")
    check("purchase_amount сохранился", body.get("purchase_amount") == 1788000.0,
          str(body.get("purchase_amount")))
    check("price_per_liter сохранился", body.get("price_per_liter") == 60.0,
          str(body.get("price_per_liter")))
    check("order_id сохранился", body.get("order_id") == ORDER_ID,
          str(body.get("order_id")))

# ═══════════════════════════════════════════════════════════
section("8. INCOME — опциональный order_id")
# ═══════════════════════════════════════════════════════════
INCOME_ID = None
income_payload = {
    "income_at": "2026-06-15",
    "client_id": client_id,
    "amount": 2000000,
    "comment": "TEST оплата",
    "order_id": ORDER_ID,
}
code, body = req("POST", "/api/income", income_payload)
check("POST /income с order_id → 201", code == 201,
      f"status={code}, detail={body.get('detail','')}")
INCOME_ID = body.get("id") if code == 201 else None
if INCOME_ID:
    check("order_id сохранился в income", body.get("order_id") == ORDER_ID,
          str(body.get("order_id")))

# ═══════════════════════════════════════════════════════════
section("9. EXPENSES — опциональный order_id")
# ═══════════════════════════════════════════════════════════
EXPENSE_ID = None
code, body = req("POST", "/api/expenses", {
    "expense_at": "2026-06-15",
    "category": "Прочие",
    "amount": 15000,
    "comment": "TEST расход",
    "order_id": ORDER_ID,
    "cash_record_id": CASH_ID,
})
check("POST /expenses с order_id + cash_record_id → 201", code == 201,
      f"status={code}, detail={body.get('detail','')}")
EXPENSE_ID = body.get("id") if code == 201 else None
if EXPENSE_ID:
    check("order_id сохранился в expense", body.get("order_id") == ORDER_ID,
          str(body.get("order_id")))
    check("cash_record_id сохранился", body.get("cash_record_id") == CASH_ID,
          str(body.get("cash_record_id")))

# ═══════════════════════════════════════════════════════════
section("10. GET /orders/{id} — суммарные блоки")
# ═══════════════════════════════════════════════════════════
if ORDER_ID:
    code, order_detail = req("GET", f"/api/orders/{ORDER_ID}")
    check(f"GET /orders/{ORDER_ID} → 200", code == 200, f"status={code}")

    if code == 200:
        # dispatches
        dispatches = order_detail.get("dispatches", [])
        check("dispatches[] присутствует", isinstance(dispatches, list),
              f"type={type(dispatches).__name__}")
        if DISPATCH_ID:
            found_d = any(d.get("id") == DISPATCH_ID for d in dispatches)
            check("Созданный рейс виден в dispatches", found_d,
                  f"dispatch_id={DISPATCH_ID}, count={len(dispatches)}")

        # hire_deliveries
        hire_list = order_detail.get("hire_deliveries", [])
        check("hire_deliveries[] присутствует", isinstance(hire_list, list),
              f"type={type(hire_list).__name__}")
        if HIRE_ID:
            found_h = any(h.get("id") == HIRE_ID for h in hire_list)
            check("Созданная найм-сделка виден в hire_deliveries", found_h,
                  f"hire_id={HIRE_ID}, count={len(hire_list)}")

        # cash_summary
        cs = order_detail.get("cash_summary")
        check("cash_summary присутствует", cs is not None, str(cs))
        if cs:
            check("cash_summary.total_received ≥ 0", (cs.get("total_received") or 0) >= 0,
                  str(cs.get("total_received")))
            if CASH_ID:
                check("cash_summary.total_received = 500000",
                      abs((cs.get("total_received") or 0) - 500000) < 1,
                      f"got={cs.get('total_received')}")
            if RECEIPT_ID:
                check("cash_summary.total_spent включает purchase_amount",
                      (cs.get("total_spent") or 0) >= 1788000,
                      f"got={cs.get('total_spent')}")
            info(f"cash_summary: получено={cs.get('total_received'):,.0f} ₽  "
                 f"потрачено={cs.get('total_spent'):,.0f} ₽  "
                 f"остаток={cs.get('remaining'):,.0f} ₽")

        # delivery_summary
        ds = order_detail.get("delivery_summary")
        check("delivery_summary присутствует", ds is not None, str(ds))
        if ds:
            check("delivery_summary.delivered_volume_cub ≥ 0",
                  (ds.get("delivered_volume_cub") or 0) >= 0,
                  str(ds.get("delivered_volume_cub")))
            by_owner = ds.get("by_owner", {})
            check("delivery_summary.by_owner содержит DTL",
                  "DTL" in by_owner, str(list(by_owner.keys())))
            check("delivery_summary.by_owner содержит найм",
                  "найм" in by_owner, str(list(by_owner.keys())))
            if DISPATCH_ID:
                check("DTL объём = 20 куб",
                      abs((by_owner.get("DTL") or 0) - 20.0) < 0.1,
                      f"DTL={by_owner.get('DTL')}")
            if HIRE_ID:
                hire_cub = (by_owner.get("найм") or 0)
                check("найм объём = 15 куб (15000 л / 1000)",
                      abs(hire_cub - 15.0) < 0.1,
                      f"найм={hire_cub}")
            info(f"delivery_summary: DTL={by_owner.get('DTL')} куб  "
                 f"Артём={by_owner.get('Артём')} куб  "
                 f"найм={by_owner.get('найм')} куб  "
                 f"итого={ds.get('delivered_volume_cub')} куб  "
                 f"осталось={ds.get('remaining_volume_cub')} куб")

        # payment_summary
        ps = order_detail.get("payment_summary")
        check("payment_summary присутствует", ps is not None, str(ps))
        if ps:
            check("payment_summary.client_total_paid ≥ 0",
                  (ps.get("client_total_paid") or 0) >= 0,
                  str(ps.get("client_total_paid")))
            if INCOME_ID:
                check("client_total_paid = 2_000_000",
                      abs((ps.get("client_total_paid") or 0) - 2000000) < 1,
                      f"got={ps.get('client_total_paid')}")
            info(f"payment_summary: оплачено={ps.get('client_total_paid'):,.0f} ₽  "
                 f"долг={ps.get('client_debt'):,.0f} ₽")

# ═══════════════════════════════════════════════════════════
section("11. FLEET EXPENSES — опциональный order_id")
# ═══════════════════════════════════════════════════════════
FLEET_EXP_ID = None
code, body = req("POST", "/api/fleet/expenses", {
    "truck_id": truck_id,
    "expense_at": "2026-06-15",
    "category": "ТО",
    "amount": 25000,
    "comment": "TEST ТО",
    "order_id": ORDER_ID,
    "cash_record_id": CASH_ID,
})
check("POST /fleet/expenses с order_id → 201", code == 201,
      f"status={code}, detail={body.get('detail','')}")
FLEET_EXP_ID = body.get("id") if code == 201 else None
if FLEET_EXP_ID:
    check("fleet expense.order_id сохранился", body.get("order_id") == ORDER_ID,
          str(body.get("order_id")))
    check("fleet expense.cash_record_id сохранился", body.get("cash_record_id") == CASH_ID,
          str(body.get("cash_record_id")))

# ═══════════════════════════════════════════════════════════
section("12. ПЕРЕГРУЗ — система принимает без ошибки (C1.4)")
# ═══════════════════════════════════════════════════════════
if ORDER_ID and truck_id:
    code, body = req("POST", "/api/base/dispatches", {
        "order_id": ORDER_ID,
        "truck_id": truck_id,
        "driver_id": driver_id,
        "site_id": site_id,
        "truck_owner": "DTL",
        "volume": 200.0,
        "ttn_number": "TEST-OVERBOOK",
    })
    check("POST /dispatches 200 куб > объёма заказа → 201 (без ошибки)", code == 201,
          f"status={code}, detail={body.get('detail','')}")

# ═══════════════════════════════════════════════════════════
section("13. CLEANUP (удаляем тестовые данные)")
# ═══════════════════════════════════════════════════════════
def delete_if(label, path, record_id):
    if not record_id:
        return
    code, body = req("DELETE", f"{path}/{record_id}")
    ok = code in (200, 204)
    # Some endpoints may not support DELETE — that's fine, warn
    if code == 405:
        info(f"DELETE {path}/{record_id} — метод не поддерживается (OK)")
    else:
        check(f"DELETE {label} #{record_id}", ok, f"status={code}")

# Try to clean up via correction/close endpoints where delete isn't available
if HIRE_ID:
    code, _ = req("POST", f"/api/hire/{HIRE_ID}/close", {"comment": "TEST cleanup"})
    info(f"Закрыли найм #{HIRE_ID} (статус={code})")

if ORDER_ID:
    code, _ = req("PUT", f"/api/orders/{ORDER_ID}/close", {})
    info(f"Закрыли заказ #{ORDER_ID} (статус={code})")

info("Тест-данные помечены как закрытые. Для полного удаления запустите миграцию 025 повторно.")

# ═══════════════════════════════════════════════════════════
section("ИТОГИ")
# ═══════════════════════════════════════════════════════════
total = len(_results)
passed = sum(1 for _, ok in _results if ok)
failed = total - passed
pct = int(passed / total * 100) if total else 0

print(f"\n  Тестов: {total}  |  {GREEN}✅ Прошло: {passed}{RESET}  |  {RED}❌ Упало: {failed}{RESET}  |  {pct}%\n")

if failed:
    print(f"  {RED}Провальные тесты:{RESET}")
    for name, ok in _results:
        if not ok:
            print(f"    ✗ {name}")

sys.exit(0 if failed == 0 else 1)
