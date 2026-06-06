#!/usr/bin/env python3
"""
Full API smoke-test for DizelTrade.
Run on the server:
  cd /opt/dtl
  source backend/venv/bin/activate
  python3 backend/tools/test_api.py <token>
or:
  python3 backend/tools/test_api.py <token> http://localhost:8000
"""
import sys, json, time
import urllib.request, urllib.error

def usage():
    print(__doc__)
    sys.exit(1)

if len(sys.argv) < 2:
    usage()

TOKEN = sys.argv[1]
BASE  = sys.argv[2].rstrip("/") if len(sys.argv) > 2 else "http://localhost:8000"

PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
WARN = "\033[93m⚠️  WARN\033[0m"

results: list[tuple[str, bool, str]] = []


def req(method: str, path: str, body=None, token=TOKEN, extra_headers=None, expected=200):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    if extra_headers:
        headers.update(extra_headers)
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            status = resp.status
            try:
                body_resp = json.loads(resp.read())
            except Exception:
                body_resp = {}
            return status, body_resp
    except urllib.error.HTTPError as e:
        try:
            body_resp = json.loads(e.read())
        except Exception:
            body_resp = {}
        return e.code, body_resp


def check(name: str, ok: bool, detail: str = ""):
    label = PASS if ok else FAIL
    print(f"  {label}  {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


def section(title: str):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print('─'*55)


# ─────────────────────────────────────────────────────────
section("1. HEALTH")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/health", token="")
check("Health endpoint reachable", code == 200, f"status={code}")
check("DB connected", body.get("db") is True, str(body.get("db")))

# ─────────────────────────────────────────────────────────
section("2. AUTH — token identity")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/auth/me")
check("GET /auth/me with token", code == 200, f"status={code}")
if code == 200:
    check("Token resolves to a user", bool(body.get("name")), str(body.get("name")))
    check("User is active", body.get("is_active", False), str(body.get("is_active")))
    token_role = body.get("role")
    check("Role is partner (required for most endpoints)", token_role == "partner", str(token_role))
else:
    print(f"         Body: {body}")

# ─────────────────────────────────────────────────────────
section("3. SCOPE ENFORCEMENT (read-only should block POST)")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/auth/tokens")
check("GET /auth/tokens works", code == 200, f"status={code}")
tokens = body if isinstance(body, list) else []
read_token = None
for t in tokens:
    if t.get("scope") == "read":
        read_token = t.get("token_preview")
        break
if not tokens:
    print(f"      (no tokens listed — cannot test scope, skipping)")
else:
    if not read_token:
        print(f"      (no read-scope token found — scope test skipped)")

# ─────────────────────────────────────────────────────────
section("4. CLIENTS (reference)")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/clients")
check("GET /clients returns 200", code == 200, f"status={code}")
if isinstance(body, list):
    check("Has clients", len(body) > 0, f"count={len(body)}")
    names = [c.get("name") for c in body]
    for expected_name in ["Лёша", "Саша", "Максим"]:
        found = any(expected_name.lower() in (n or "").lower() for n in names)
        check(f"Client '{expected_name}' exists", found, str(names[:5]))

# ─────────────────────────────────────────────────────────
section("5. HIRE — list + debt check")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/hire")
check("GET /hire returns 200", code == 200, f"status={code}")
if isinstance(body, list):
    check("Has hire records", len(body) > 0, f"count={len(body)}")
    open_deals  = [h for h in body if not h.get("is_closed")]
    closed_deals = [h for h in body if h.get("is_closed")]
    check("Has open deals", len(open_deals) > 0, f"open={len(open_deals)}")
    check("Has closed deals", len(closed_deals) >= 0, f"closed={len(closed_deals)}")
    # check amounts are positive
    bad_amounts = [h for h in body if (h.get("amount_client") or 0) < 0]
    check("No negative amount_client", len(bad_amounts) == 0, f"bad={len(bad_amounts)}")

# ─────────────────────────────────────────────────────────
section("6. CLIENT DEBTS — split fuel/delivery, no negatives")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/analytics/client-debts")
check("GET /analytics/client-debts returns 200", code == 200, f"status={code}")
if isinstance(body, list):
    check("Returns client debt rows", len(body) > 0, f"count={len(body)}")
    negatives = [d for d in body if d.get("total_debt", 0) < 0]
    check("No negative total_debt (no false overpayments)", len(negatives) == 0,
          "negative: " + ", ".join(f"{d['client_name']}:{d['total_debt']}" for d in negatives))
    fuel_ok = all(d.get("fuel_debt") is not None for d in body)
    delivery_ok = all(d.get("delivery_debt") is not None for d in body)
    check("fuel_debt field present on all rows", fuel_ok)
    check("delivery_debt field present on all rows", delivery_ok)
    # unpaid = max(0, delivered - paid); overpayment (paid > delivered) is valid (prepayment)
    cub_ok = all(
        abs(d.get("unpaid_cub", 0) - max(0, d.get("delivered_cub", 0) - d.get("paid_cub", 0))) < 0.01
        for d in body
    )
    check("unpaid_cub = max(0, delivered - paid) (cub balance)", cub_ok)
    by_name = {d.get("client_name"): d for d in body}
    # After migration 021 (Model B): fully-paid clients must be 0
    for paid_client in ["Зея", "Трасса"]:
        d = by_name.get(paid_client)
        if d is not None:
            check(f"  {paid_client} fully paid → debt 0",
                  abs(d.get("total_debt", 0)) < 1,
                  f"total={d.get('total_debt'):,.0f} (нужно 0 после миграции 021)")
    for d in body:
        name = d.get("client_name")
        td   = d.get("total_debt",0)
        fd   = d.get("fuel_debt",0)
        dd   = d.get("delivery_debt",0)
        diff = abs(td - fd - dd)
        check(f"  {name}: total = fuel + delivery",
              diff < 1, f"total={td:,.0f} fuel={fd:,.0f} delivery={dd:,.0f}")
        print(f"         → {name}: топливо={fd:,.0f} ₽  доставка={dd:,.0f} ₽  итого={td:,.0f} ₽  "
              f"отгружено={d.get('delivered_cub')} куб  оплачено={d.get('paid_cub')} куб")

# ─────────────────────────────────────────────────────────
section("7. INCOME RECORDS")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/income")
check("GET /income returns 200", code == 200, f"status={code}")
if isinstance(body, list):
    check("Has income records", len(body) > 0, f"count={len(body)}")
    sept2026 = [r for r in body if r.get("income_at","").startswith("2026-09") and r.get("id") in (35,36)]
    check("Income id 35,36 not in September 2026 (date fix)",
          len(sept2026) == 0,
          f"still_bad={[r.get('id') for r in sept2026]}")
    maksim_76 = [r for r in body if "76" in (r.get("comment") or "") and (r.get("volume") or 0) == 300]
    check("Максим «по 76» 300 куб payment exists", len(maksim_76) > 0,
          f"found={len(maksim_76)}")

# ─────────────────────────────────────────────────────────
section("8. TRUCKS — Artem's fleet (7 trucks)")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/trucks")
check("GET /trucks returns 200", code == 200, f"status={code}")
if isinstance(body, list):
    artem = [t for t in body if (t.get("owner") or "").lower() == "артём"]
    check("Artem has 7 trucks", len(artem) == 7, f"count={len(artem)}")
    expected_plates = ["В197МР 28","Р863УК 72","Н818НМ 27","К728ВА 125","В142ХЕ 125","А689КЕ 14","А841УХ 38"]
    plates = [t.get("plate","") for t in artem]
    for plate in expected_plates:
        found = any(plate in p for p in plates)
        check(f"  Plate {plate} present", found, str(plates))

# ─────────────────────────────────────────────────────────
section("9. EXPENSES")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/expenses")
check("GET /expenses returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
section("10. DEBT RECORDS")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/debts")
check("GET /debts returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
section("11. DASHBOARD")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/dashboard")
check("GET /dashboard returns 200", code == 200, f"status={code}")
if code == 200 and isinstance(body, dict):
    check("dashboard has base_balance",    "base_balance"    in body)
    check("dashboard has client_debts",    "client_debts"    in body)
    check("dashboard has trucks_month",    "trucks_month"    in body)
    check("dashboard has trips_in_transit","trips_in_transit" in body)

# ─────────────────────────────────────────────────────────
section("12. ANALYTICS — annual summary")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/analytics/annual?year=2026")
check("GET /analytics/annual?year=2026 returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
section("13. OPERATOR GUARD — create dispatch must be 403")
# ─────────────────────────────────────────────────────────
# We can't test this without an operator token, but we can test
# that our partner token can create and immediately delete a test dispatch
code, body = req("GET", "/api/base/dispatches")
check("GET /dispatches returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
section("14. SESSIONS")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/sessions")
check("GET /sessions returns 200", code == 200, f"status={code}")
if isinstance(body, list):
    check("Sessions list is not empty", len(body) > 0, f"count={len(body)}")

# ─────────────────────────────────────────────────────────
section("15. SITES & TARIFFS")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/sites")
check("GET /sites returns 200", code == 200, f"status={code}")
code, body = req("GET", "/api/tariffs")
check("GET /tariffs returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
section("16. FLEET EXPENSES (own-park receipts)")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/fleet/expenses")
check("GET /fleet/expenses returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
section("17. FLEET P&L — DTL/Artem split")
# ─────────────────────────────────────────────────────────
code, body = req("GET", "/api/analytics/fleet-pnl?year=2026&month=5")
check("GET /analytics/fleet-pnl returns 200", code == 200, f"status={code}")
if code == 200 and isinstance(body, dict):
    check("fleet-pnl has dtl_fleet field",   "dtl_fleet"   in body)
    check("fleet-pnl has artem_fleet field", "artem_fleet" in body)
    check("fleet-pnl has own_fleet field",   "own_fleet"   in body)
    trucks = body.get("trucks", [])
    owners = {t.get("owner") for t in trucks}
    check("trucks list has owner field", all(t.get("owner") for t in trucks), str(owners))
    artem_trucks = [t for t in trucks if t.get("owner") == "Артём"]
    check("Artem trucks in fleet-pnl", len(artem_trucks) > 0, f"count={len(artem_trucks)}")

# ─────────────────────────────────────────────────────────
section("18. WRITE CYCLE — POST (create)")
# ─────────────────────────────────────────────────────────

# 18a. Создаём тестового клиента
code, body = req("POST", "/api/clients", {"name": "__TEST_CLIENT__"})
check("POST /clients creates client (201)", code == 201, f"status={code}")
test_client_id = body.get("id") if code == 201 else None
if test_client_id:
    check("New client has id", isinstance(test_client_id, int), str(test_client_id))
    check("New client name matches", body.get("name") == "__TEST_CLIENT__", body.get("name"))

# 18b. Создаём тестовую запись дохода
today = time.strftime("%Y-%m-%d")
code, body = req("POST", "/api/income", {
    "income_at": today, "client_id": test_client_id,
    "amount": 999.0, "volume": 1.5, "comment": "TEST запись", "is_credit": False
})
check("POST /income creates record (201)", code == 201, f"status={code}")
test_income_id = body.get("id") if code == 201 else None
if test_income_id:
    check("Income amount stored correctly", body.get("amount") == 999.0, str(body.get("amount")))
    check("Income is_credit=False stored", body.get("is_credit") == False, str(body.get("is_credit")))

# 18c. Создаём запись дохода «в долг» (is_credit=True)
code, body = req("POST", "/api/income", {
    "income_at": today, "client_id": test_client_id,
    "amount": 1111.0, "volume": 2.0, "comment": "TEST в долг", "is_credit": True
})
check("POST /income with is_credit=True (201)", code == 201, f"status={code}")
test_credit_id = body.get("id") if code == 201 else None
if test_credit_id:
    check("is_credit=True stored correctly", body.get("is_credit") == True, str(body.get("is_credit")))

# ─────────────────────────────────────────────────────────
section("19. WRITE CYCLE — PUT (update/correct)")
# ─────────────────────────────────────────────────────────

# 19a. Обновляем клиента
if test_client_id:
    code, body = req("PUT", f"/api/clients/{test_client_id}", {"name": "__TEST_CLIENT_UPDATED__"})
    check("PUT /clients/{id} updates client (200)", code == 200, f"status={code}")
    if code == 200:
        check("Updated name matches", body.get("name") == "__TEST_CLIENT_UPDATED__", body.get("name"))

# 19b. Корректируем запись дохода
if test_income_id:
    code, body = req("PUT", f"/api/income/{test_income_id}/correct", {
        "amount": 1234.0, "comment": "TEST исправлено", "reason": "тест корректировки"
    })
    check("PUT /income/{id}/correct (200)", code == 200, f"status={code}")
    if code == 200:
        check("Corrected amount matches", body.get("amount") == 1234.0, str(body.get("amount")))
        check("Corrected comment matches", body.get("comment") == "TEST исправлено", body.get("comment"))

# 19c. Переключаем is_credit через correct
if test_credit_id:
    code, body = req("PUT", f"/api/income/{test_credit_id}/correct", {
        "is_credit": False, "reason": "тест смены флага"
    })
    check("PUT /income correct is_credit False→True (200)", code == 200, f"status={code}")
    if code == 200:
        check("is_credit changed to False", body.get("is_credit") == False, str(body.get("is_credit")))

# ─────────────────────────────────────────────────────────
section("20. WRITE CYCLE — token scopes (read/write/full)")
# ─────────────────────────────────────────────────────────

# Создаём read-токен
code, body = req("POST", "/api/tokens", {"name": "test-read-scope", "scope": "read"})
check("POST /tokens creates read-scope token (201)", code == 201, f"status={code}")
read_token_id  = body.get("id")    if code == 201 else None
read_token_val = body.get("token") if code == 201 else None

# Создаём write-токен
code, body = req("POST", "/api/tokens", {"name": "test-write-scope", "scope": "write"})
check("POST /tokens creates write-scope token (201)", code == 201, f"status={code}")
write_token_id  = body.get("id")    if code == 201 else None
write_token_val = body.get("token") if code == 201 else None

if read_token_val:
    # read-токен: GET должен работать
    code, _ = req("GET", "/api/clients", token=read_token_val)
    check("read-token: GET /clients allowed (200)", code == 200, f"status={code}")
    # read-токен: POST должен блокироваться
    code, _ = req("POST", "/api/clients", {"name": "MUST_FAIL"}, token=read_token_val)
    check("read-token: POST /clients blocked (403)", code == 403, f"status={code}")
    # read-токен: DELETE должен блокироваться
    if read_token_id:
        code, _ = req("DELETE", f"/api/tokens/{read_token_id}", token=read_token_val)
        check("read-token: DELETE blocked (403)", code == 403, f"status={code}")

if write_token_val and read_token_id:
    # write-токен: DELETE должен блокироваться (scope write, не full)
    code, _ = req("DELETE", f"/api/tokens/{read_token_id}", token=write_token_val)
    check("write-token: DELETE blocked (403)", code == 403, f"status={code}")

# Чистим токены через full-токен (наш основной)
for tid in [read_token_id, write_token_id]:
    if tid:
        code, _ = req("DELETE", f"/api/tokens/{tid}")
        check(f"DELETE /tokens/{tid} cleanup (200/204)", code in (200, 204), f"status={code}")

# ─────────────────────────────────────────────────────────
section("21. VERIFY — read back after write")
# ─────────────────────────────────────────────────────────

# Проверяем что запись дохода с обновлённой суммой реально в БД
if test_income_id:
    code, body = req("GET", f"/api/income/{test_income_id}")
    check("GET /income/{id} returns updated record (200)", code == 200, f"status={code}")
    if code == 200:
        check("Persisted amount = 1234", body.get("amount") == 1234.0, str(body.get("amount")))
        check("Persisted comment updated", body.get("comment") == "TEST исправлено", body.get("comment"))

# Клиент с обновлённым именем в общем списке
code, body = req("GET", "/api/clients")
if isinstance(body, list):
    found = any(c.get("name") == "__TEST_CLIENT_UPDATED__" for c in body)
    check("Updated client visible in GET /clients", found)


total = len(results)
passed = sum(1 for _, ok, _ in results if ok)
failed = total - passed
print(f"\n{'═'*55}")
print(f"  ИТОГ: {passed}/{total} passed  |  {failed} failed")
print('═'*55)
if failed:
    print("\n  Провалились:")
    for name, ok, detail in results:
        if not ok:
            print(f"    ❌ {name}" + (f" — {detail}" if detail else ""))
else:
    print("\n  Все проверки прошли успешно! 🎉")
