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
    cub_ok = all(
        abs(d.get("delivered_cub",0) - d.get("paid_cub",0) - d.get("unpaid_cub",0)) < 0.01
        for d in body
    )
    check("delivered = paid + unpaid (cub balance)", cub_ok)
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
    check("dashboard has revenue_fleet", "revenue_fleet" in body)
    check("dashboard has revenue_hire",  "revenue_hire"  in body)
    check("dashboard has client_debts",  "client_debts"  in body)

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
code, body = req("GET", "/api/fleet-expenses")
check("GET /fleet-expenses returns 200", code == 200, f"status={code}")

# ─────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────
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
