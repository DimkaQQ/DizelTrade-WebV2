#!/usr/bin/env python3
"""
Debt reconciliation diagnostic — dumps per-client hire vs income data
so we can see what's a real payment vs a «в долг» (credit) record.

Run on the server:
  cd /opt/dtl && source backend/venv/bin/activate
  python3 backend/tools/debt_diagnostic.py <token>
"""
import sys, json
import urllib.request, urllib.error

if len(sys.argv) < 2:
    print(__doc__); sys.exit(1)
TOKEN = sys.argv[1]
BASE  = sys.argv[2].rstrip("/") if len(sys.argv) > 2 else "http://localhost:8000"


def get(path):
    r = urllib.request.Request(BASE + path, headers={"Authorization": f"Bearer {TOKEN}"})
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {path}: {e.code} {e.read()[:200]}"); return []


clients = {c["id"]: c["name"] for c in get("/api/clients")}
hire    = get("/api/hire")
income  = get("/api/income")
debts   = get("/api/analytics/client-debts")

# Aggregate hire per client
hire_agg = {}
for h in hire:
    cid = h.get("client_id")
    a = hire_agg.setdefault(cid, {"amount_client": 0.0, "volume_liters": 0.0, "amount_supplier": 0.0, "count": 0, "closed": 0})
    a["amount_client"]   += float(h.get("amount_client") or 0)
    a["amount_supplier"] += float(h.get("amount_supplier") or 0)
    a["volume_liters"]   += float(h.get("volume_liters") or 0)
    a["count"] += 1
    if h.get("is_closed"): a["closed"] += 1

# Income per client
income_agg = {}
for r in income:
    cid = r.get("client_id")
    income_agg.setdefault(cid, []).append(r)

CREDIT_WORDS = ["в долг", "долг", "дт", "доставить до", "край", "до 10", "до 15"]

def is_credit(record):
    # Prefer the explicit is_credit flag (after migration 021); fall back to keywords.
    if record.get("is_credit") is not None:
        return bool(record.get("is_credit"))
    c = (record.get("comment") or "").lower()
    return any(w in c for w in CREDIT_WORDS)

print("\n" + "="*90)
print("ПО КАЖДОМУ КЛИЕНТУ: найм (отгружено) vs доходы (оплаты)")
print("="*90)

all_cids = set(hire_agg) | set(income_agg)
for cid in sorted(all_cids, key=lambda x: clients.get(x, "")):
    name = clients.get(cid, f"id={cid}")
    h = hire_agg.get(cid)
    if not h:
        continue
    print(f"\n■ {name}")
    print(f"   НАЙМ: отгружено {h['volume_liters']/1000:.1f} куб | "
          f"на клиента {h['amount_client']:,.0f} ₽ | топливо {h['amount_supplier']:,.0f} ₽ | "
          f"сделок {h['count']} (закрыто {h['closed']})")
    incs = income_agg.get(cid, [])
    pay_amount = pay_vol = credit_amount = credit_vol = 0.0
    if incs:
        print(f"   ДОХОДЫ ({len(incs)} записей):")
        for r in incs:
            cr = is_credit(r)
            tag = "🔴 в долг " if cr else "🟢 оплата "
            amt = float(r.get("amount") or 0); vol = float(r.get("volume") or 0)
            print(f"      {tag} {r.get('income_at','?')}  {amt:>14,.0f} ₽  {vol:>7.1f} куб   «{r.get('comment','')}»")
            if cr: credit_amount += amt; credit_vol += vol
            else:  pay_amount += amt; pay_vol += vol
    else:
        print(f"   ДОХОДЫ: нет записей")
    # Reconciliation under different models
    hire_amt = h["amount_client"]
    print(f"   ─ Реальные оплаты (🟢): {pay_amount:,.0f} ₽ / {pay_vol:.1f} куб")
    print(f"   ─ Записи в долг (🔴):    {credit_amount:,.0f} ₽ / {credit_vol:.1f} куб")
    print(f"   ── ДОЛГ по моделям:")
    print(f"       A) hire − ВСЕ доходы       = {hire_amt - pay_amount - credit_amount:>14,.0f} ₽   (старая, даёт минусы)")
    print(f"       B) hire − только оплаты(🟢) = {max(0, hire_amt - pay_amount):>14,.0f} ₽   (исключая в долг)")
    print(f"       C) is_closed (открытые)     = {hire_amt if h['closed']==0 else '?':>14} ₽   (текущая)")

print("\n" + "="*90)
print("Текущий ответ /analytics/client-debts (модель is_closed):")
print("="*90)
for d in debts:
    print(f"   {d['client_name']:10} итого={d['total_debt']:>14,.0f} ₽  "
          f"топливо={d['fuel_debt']:>13,.0f}  доставка={d['delivery_debt']:>12,.0f}  "
          f"(отгр {d['delivered_cub']} / опл {d['paid_cub']} куб)")
print()
