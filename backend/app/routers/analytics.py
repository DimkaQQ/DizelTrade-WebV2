"""
Analytics router – Phase 3
Endpoints: /api/analytics/*, /api/balance/*, /api/annual*
All require partner role.
"""
from fastapi import APIRouter, Depends, Query
from ..database import query, query_one
from ..deps import require_partner

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _safe_float(v) -> float:
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _safe_int(v) -> int:
    try:
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# /api/analytics/summary
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/summary")
def analytics_summary(
    year: int = Query(default=2026),
    month: int = Query(default=5),
    user: dict = Depends(require_partner),
):
    """Monthly P&L summary."""
    # Revenue: tariff income from delivered dispatches in the period
    rev_row = query_one(
        """
        SELECT COALESCE(SUM(fd.tariff), 0) AS revenue
        FROM fuel_dispatches fd
        WHERE fd.status = 'delivered'
          AND EXTRACT(YEAR  FROM fd.dispatched_at) = %s
          AND EXTRACT(MONTH FROM fd.dispatched_at) = %s
        """,
        (year, month),
    )
    revenue = _safe_float(rev_row["revenue"] if rev_row else 0)

    # Fleet expenses
    fleet_exp_row = query_one(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM fleet_expenses
        WHERE EXTRACT(YEAR  FROM expense_at) = %s
          AND EXTRACT(MONTH FROM expense_at) = %s
        """,
        (year, month),
    )
    fleet_exp = _safe_float(fleet_exp_row["total"] if fleet_exp_row else 0)

    # Company (general) expenses
    comp_exp_row = query_one(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM company_expenses
        WHERE EXTRACT(YEAR  FROM expense_at) = %s
          AND EXTRACT(MONTH FROM expense_at) = %s
        """,
        (year, month),
    )
    company_exp = _safe_float(comp_exp_row["total"] if comp_exp_row else 0)

    # Hire revenue and expenses
    hire_row = query_one(
        """
        SELECT
          COALESCE(SUM(amount_client), 0)   AS hire_rev,
          COALESCE(SUM(amount_supplier), 0) AS hire_sup,
          COALESCE(SUM(COALESCE(amount_carrier,0)), 0) AS hire_car
        FROM hire_deliveries
        WHERE EXTRACT(YEAR  FROM delivery_at) = %s
          AND EXTRACT(MONTH FROM delivery_at) = %s
        """,
        (year, month),
    )
    hire_rev = _safe_float(hire_row["hire_rev"] if hire_row else 0)
    hire_exp = _safe_float((hire_row["hire_sup"] if hire_row else 0)) + \
               _safe_float((hire_row["hire_car"] if hire_row else 0))

    total_revenue = revenue + hire_rev
    total_expenses = fleet_exp + company_exp + hire_exp
    profit = total_revenue - total_expenses
    margin_pct = round((profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

    # Trips and volume
    trips_row = query_one(
        """
        SELECT COUNT(*) AS trips, COALESCE(SUM(volume), 0) AS volume
        FROM fuel_dispatches
        WHERE status = 'delivered'
          AND EXTRACT(YEAR  FROM dispatched_at) = %s
          AND EXTRACT(MONTH FROM dispatched_at) = %s
        """,
        (year, month),
    )

    return {
        "year": year,
        "month": month,
        "revenue_total": round(total_revenue, 2),
        "expenses_total": round(total_expenses, 2),
        "profit": round(profit, 2),
        "margin_pct": margin_pct,
        "trips_total": _safe_int(trips_row["trips"] if trips_row else 0),
        "volume_total": round(_safe_float(trips_row["volume"] if trips_row else 0), 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# /api/analytics/clients
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/clients")
def analytics_clients(
    year: int = Query(default=2026),
    user: dict = Depends(require_partner),
):
    """Client revenue breakdown for the year."""
    rows = query(
        """
        SELECT
          c.name AS client_name,
          COALESCE(SUM(fd.tariff), 0) AS revenue,
          COALESCE(SUM(fd.volume), 0)  AS volume
        FROM fuel_dispatches fd
        JOIN orders o ON o.id = fd.order_id
        JOIN clients c ON c.id = o.client_id
        WHERE fd.status = 'delivered'
          AND EXTRACT(YEAR FROM fd.dispatched_at) = %s
        GROUP BY c.name
        ORDER BY revenue DESC
        """,
        (year,),
    )

    total_rev = sum(_safe_float(r["revenue"]) for r in rows)
    result = []
    for r in rows:
        rev = _safe_float(r["revenue"])
        result.append({
            "client_name": r["client_name"],
            "revenue": round(rev, 2),
            "volume": round(_safe_float(r["volume"]), 2),
            "pct_of_total": round((rev / total_rev * 100), 1) if total_rev > 0 else 0.0,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /api/analytics/trucks
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/trucks")
def analytics_trucks(
    year: int = Query(default=2026),
    month: int = Query(default=5),
    user: dict = Depends(require_partner),
):
    """Per-truck performance for the period."""
    disp_rows = query(
        """
        SELECT
          t.name AS truck_name,
          COUNT(*) AS trips,
          COALESCE(SUM(fd.volume), 0)   AS volume,
          COALESCE(SUM(fd.tariff), 0)  AS revenue
        FROM fuel_dispatches fd
        JOIN trucks t ON t.id = fd.truck_id
        WHERE fd.status = 'delivered'
          AND EXTRACT(YEAR  FROM fd.dispatched_at) = %s
          AND EXTRACT(MONTH FROM fd.dispatched_at) = %s
        GROUP BY t.name
        ORDER BY revenue DESC
        """,
        (year, month),
    )

    # Expenses per truck
    exp_rows = query(
        """
        SELECT
          t.name AS truck_name,
          COALESCE(SUM(fe.amount), 0) AS expenses
        FROM fleet_expenses fe
        JOIN trucks t ON t.id = fe.truck_id
        WHERE EXTRACT(YEAR  FROM fe.expense_at) = %s
          AND EXTRACT(MONTH FROM fe.expense_at) = %s
        GROUP BY t.name
        """,
        (year, month),
    )
    exp_map = {r["truck_name"]: _safe_float(r["expenses"]) for r in exp_rows}

    result = []
    for r in disp_rows:
        rev = _safe_float(r["revenue"])
        exp = exp_map.get(r["truck_name"], 0.0)
        profit = rev - exp
        margin_pct = round((profit / rev * 100), 1) if rev > 0 else 0.0
        result.append({
            "truck_name": r["truck_name"],
            "trips": _safe_int(r["trips"]),
            "volume": round(_safe_float(r["volume"]), 2),
            "revenue": round(rev, 2),
            "expenses": round(exp, 2),
            "margin_pct": margin_pct,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /api/analytics/suppliers
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/suppliers")
def analytics_suppliers(
    year: int = Query(default=2026),
    user: dict = Depends(require_partner),
):
    """Supplier purchase share for the year."""
    rows = query(
        """
        SELECT
          COALESCE(s.name, fr.source_custom) AS supplier_name,
          COALESCE(SUM(fr.volume_adjusted), 0)        AS volume,
          COALESCE(SUM(0), 0)        AS cost
        FROM fuel_receipts fr
        LEFT JOIN suppliers s ON s.id = fr.supplier_id
        WHERE EXTRACT(YEAR FROM fr.received_at) = %s
          AND fr.ttn_confirmed = TRUE
        GROUP BY COALESCE(s.name, fr.source_custom)
        ORDER BY cost DESC
        """,
        (year,),
    )

    total_cost = sum(_safe_float(r["cost"]) for r in rows)
    result = []
    for r in rows:
        cost = _safe_float(r["cost"])
        result.append({
            "supplier_name": r["supplier_name"] or "Неизвестно",
            "volume": round(_safe_float(r["volume"]), 2),
            "cost": round(cost, 2),
            "pct_of_total": round((cost / total_cost * 100), 1) if total_cost > 0 else 0.0,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /api/analytics/carriers
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/carriers")
def analytics_carriers(
    year: int = Query(default=2026),
    month: int = Query(default=5),
    user: dict = Depends(require_partner),
):
    """Carrier share of volume and cost for the period."""
    rows = query(
        """
        SELECT
          COALESCE(cr.name, hd.carrier_custom, 'Неизвестно') AS carrier_name,
          COUNT(*) AS trips,
          COALESCE(SUM(hd.volume_liters), 0) AS volume,
          COALESCE(SUM(hd.amount_carrier), 0) AS cost
        FROM hire_deliveries hd
        LEFT JOIN carriers cr ON cr.id = hd.carrier_id
        WHERE hd.amount_carrier IS NOT NULL AND hd.amount_carrier > 0
          AND EXTRACT(YEAR FROM hd.delivery_at) = %s
          AND EXTRACT(MONTH FROM hd.delivery_at) = %s
        GROUP BY COALESCE(cr.name, hd.carrier_custom, 'Неизвестно')
        ORDER BY cost DESC
        """,
        (year, month),
    )

    total_volume = sum(_safe_float(r["volume"]) for r in rows)
    total_cost = sum(_safe_float(r["cost"]) for r in rows)
    result = []
    for r in rows:
        vol = _safe_float(r["volume"])
        cost = _safe_float(r["cost"])
        result.append({
            "carrier_name": r["carrier_name"],
            "trips": _safe_int(r["trips"]),
            "volume": round(vol, 2),
            "cost": round(cost, 2),
            "pct_volume": round((vol / total_volume * 100), 1) if total_volume > 0 else 0.0,
            "pct_cost": round((cost / total_cost * 100), 1) if total_cost > 0 else 0.0,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /api/analytics/monthly
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/monthly")
def analytics_monthly(
    year: int = Query(default=2026),
    user: dict = Depends(require_partner),
):
    """Monthly revenue/expenses/profit for the year (12 rows)."""
    rev_rows = query(
        """
        SELECT
          EXTRACT(MONTH FROM dispatched_at)::int AS month,
          COALESCE(SUM(tariff), 0) AS revenue
        FROM fuel_dispatches
        WHERE status = 'delivered'
          AND EXTRACT(YEAR FROM dispatched_at) = %s
        GROUP BY month
        """,
        (year,),
    )
    rev_map = {r["month"]: _safe_float(r["revenue"]) for r in rev_rows}

    fleet_exp_rows = query(
        """
        SELECT
          EXTRACT(MONTH FROM expense_at)::int AS month,
          COALESCE(SUM(amount), 0) AS total
        FROM fleet_expenses
        WHERE EXTRACT(YEAR FROM expense_at) = %s
        GROUP BY month
        """,
        (year,),
    )
    fleet_map = {r["month"]: _safe_float(r["total"]) for r in fleet_exp_rows}

    comp_exp_rows = query(
        """
        SELECT
          EXTRACT(MONTH FROM expense_at)::int AS month,
          COALESCE(SUM(amount), 0) AS total
        FROM company_expenses
        WHERE EXTRACT(YEAR FROM expense_at) = %s
        GROUP BY month
        """,
        (year,),
    )
    comp_map = {r["month"]: _safe_float(r["total"]) for r in comp_exp_rows}

    hire_rows = query(
        """
        SELECT
          EXTRACT(MONTH FROM delivery_at)::int AS month,
          COALESCE(SUM(amount_client), 0) AS hire_rev,
          COALESCE(SUM(amount_supplier), 0) AS hire_sup,
          COALESCE(SUM(COALESCE(amount_carrier,0)), 0) AS hire_car
        FROM hire_deliveries
        WHERE EXTRACT(YEAR FROM delivery_at) = %s
        GROUP BY month
        """,
        (year,),
    )
    hire_rev_map = {r["month"]: _safe_float(r["hire_rev"]) for r in hire_rows}
    hire_exp_map = {r["month"]: _safe_float(r["hire_sup"]) + _safe_float(r["hire_car"]) for r in hire_rows}

    result = []
    for m in range(1, 13):
        rev = rev_map.get(m, 0.0) + hire_rev_map.get(m, 0.0)
        exp = fleet_map.get(m, 0.0) + comp_map.get(m, 0.0) + hire_exp_map.get(m, 0.0)
        result.append({
            "month": m,
            "revenue": round(rev, 2),
            "expenses": round(exp, 2),
            "profit": round(rev - exp, 2),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /api/balance/monthly
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/balance/monthly")
def balance_monthly(
    year: int = Query(default=2026),
    user: dict = Depends(require_partner),
):
    """Monthly balance snapshots for the year."""
    rows = query(
        """
        SELECT
          EXTRACT(MONTH FROM balance_date)::int AS month,
          COALESCE(SUM(assets), 0)       AS assets,
          COALESCE(SUM(liabilities), 0)  AS liabilities
        FROM balance_entries
        WHERE EXTRACT(YEAR FROM balance_date) = %s
        GROUP BY month
        ORDER BY month
        """,
        (year,),
    )

    month_map = {}
    for r in rows:
        assets = _safe_float(r["assets"])
        liabilities = _safe_float(r["liabilities"])
        month_map[r["month"]] = {
            "assets": round(assets, 2),
            "liabilities": round(liabilities, 2),
            "net_assets": round(assets - liabilities, 2),
        }

    result = []
    for m in range(1, 13):
        data = month_map.get(m, {"assets": 0.0, "liabilities": 0.0, "net_assets": 0.0})
        result.append({"month": m, **data})
    return result


# ─────────────────────────────────────────────────────────────────────────────
# /api/balance/current
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/balance/current")
def balance_current(user: dict = Depends(require_partner)):
    """Latest balance snapshot."""
    row = query_one(
        """
        SELECT
          assets,
          liabilities,
          assets - liabilities AS net_assets,
          balance_date,
          notes
        FROM balance_entries
        ORDER BY balance_date DESC
        LIMIT 1
        """
    )
    if not row:
        return {
            "assets": 0.0,
            "liabilities": 0.0,
            "net_assets": 0.0,
            "balance_date": None,
            "notes": None,
        }
    return {
        "assets": round(_safe_float(row["assets"]), 2),
        "liabilities": round(_safe_float(row["liabilities"]), 2),
        "net_assets": round(_safe_float(row["net_assets"]), 2),
        "balance_date": str(row["balance_date"]) if row.get("balance_date") else None,
        "notes": row.get("notes"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# /api/balance/entries  (GET – itemized balance entries)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/balance/entries")
def get_balance_entries(
    year: int = Query(...),
    month: int = Query(...),
    user: dict = Depends(require_partner),
):
    """Get itemized balance entries for a given month/year."""
    return query("""
        SELECT * FROM balance_detail_entries
        WHERE EXTRACT(YEAR FROM period) = %s AND EXTRACT(MONTH FROM period) = %s
        ORDER BY category, object_name
    """, (year, month))


# ─────────────────────────────────────────────────────────────────────────────
# /api/balance  (POST – create/upsert itemized balance entry)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/balance")
def balance_detail_create(
    payload: dict,
    user: dict = Depends(require_partner),
):
    """Create or update an itemized balance detail entry."""
    from ..database import execute
    period = payload.get("period")  # YYYY-MM-DD
    category = payload.get("category", "Прочее")
    object_name = payload.get("object_name", "")
    amount = float(payload.get("amount", 0))
    entry_type = payload.get("entry_type", "asset")
    notes = payload.get("notes")

    if not period or not object_name:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="period and object_name are required")

    execute("""
        INSERT INTO balance_detail_entries (period, category, object_name, amount, entry_type, notes, entered_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (period, category, object_name) DO UPDATE
          SET amount = EXCLUDED.amount,
              entry_type = EXCLUDED.entry_type,
              notes = EXCLUDED.notes
    """, (period, category, object_name, amount, entry_type, notes, user["id"]))
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# /api/balance/entry  (POST – create new entry)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/balance/entry")
def balance_entry_create(
    payload: dict,
    user: dict = Depends(require_partner),
):
    """Create or update a balance entry for a given month/year."""
    from ..database import execute
    year = int(payload.get("year", 2026))
    month = int(payload.get("month", 5))
    assets = float(payload.get("assets", 0))
    liabilities = float(payload.get("liabilities", 0))
    notes = payload.get("notes", "")

    execute(
        """
        INSERT INTO balance_entries (balance_date, assets, liabilities, notes, created_by)
        VALUES (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)), %s, %s, %s, %s)
        ON CONFLICT (balance_date) DO UPDATE
          SET assets = EXCLUDED.assets,
              liabilities = EXCLUDED.liabilities,
              notes = EXCLUDED.notes
        """,
        (year, month, assets, liabilities, notes, user["id"]),
    )
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# /api/annual
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/annual")
def annual_summary(
    year: int = Query(default=2026),
    user: dict = Depends(require_partner),
):
    """Full-year P&L breakdown."""
    # Fleet revenue
    fleet_rev_row = query_one(
        """
        SELECT COALESCE(SUM(tariff), 0) AS rev
        FROM fuel_dispatches
        WHERE status = 'delivered'
          AND EXTRACT(YEAR FROM dispatched_at) = %s
        """,
        (year,),
    )
    revenue_fleet = _safe_float(fleet_rev_row["rev"] if fleet_rev_row else 0)

    # Hire revenue
    hire_rev_row = query_one(
        """
        SELECT COALESCE(SUM(amount_client), 0) AS rev
        FROM hire_deliveries
        WHERE EXTRACT(YEAR FROM delivery_at) = %s
        """,
        (year,),
    )
    revenue_hire = _safe_float(hire_rev_row["rev"] if hire_rev_row else 0)

    # Fleet expenses
    fleet_exp_row = query_one(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM fleet_expenses
        WHERE EXTRACT(YEAR FROM expense_at) = %s
        """,
        (year,),
    )
    expenses_fleet = _safe_float(fleet_exp_row["total"] if fleet_exp_row else 0)

    # Fuel cost
    fuel_exp_row = query_one(
        """
        SELECT COALESCE(SUM(0), 0) AS total
        FROM fuel_receipts
        WHERE ttn_confirmed = TRUE
          AND EXTRACT(YEAR FROM received_at) = %s
        """,
        (year,),
    )
    expenses_fuel = _safe_float(fuel_exp_row["total"] if fuel_exp_row else 0)

    # Carrier costs (from hire deals)
    carrier_exp_row = query_one(
        """
        SELECT COALESCE(SUM(COALESCE(amount_carrier, 0)), 0) AS total
        FROM hire_deliveries
        WHERE EXTRACT(YEAR FROM delivery_at) = %s
        """,
        (year,),
    )
    expenses_carriers = _safe_float(carrier_exp_row["total"] if carrier_exp_row else 0)

    # General company expenses
    gen_exp_row = query_one(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM company_expenses
        WHERE EXTRACT(YEAR FROM expense_at) = %s
        """,
        (year,),
    )
    expenses_general = _safe_float(gen_exp_row["total"] if gen_exp_row else 0)

    # Hire supplier costs
    hire_sup_row = query_one(
        """
        SELECT COALESCE(SUM(amount_supplier), 0) AS total
        FROM hire_deliveries
        WHERE EXTRACT(YEAR FROM delivery_at) = %s
        """,
        (year,),
    )
    hire_supplier_cost = _safe_float(hire_sup_row["total"] if hire_sup_row else 0)

    total_revenue = revenue_fleet + revenue_hire
    total_expenses = expenses_fleet + expenses_fuel + expenses_carriers + expenses_general + hire_supplier_cost
    profit = total_revenue - total_expenses

    # Clients breakdown
    client_rows = query(
        """
        SELECT
          c.name AS client_name,
          COALESCE(SUM(fd.tariff), 0) AS revenue,
          COALESCE(SUM(fd.volume), 0)  AS volume
        FROM fuel_dispatches fd
        JOIN orders o ON o.id = fd.order_id
        JOIN clients c ON c.id = o.client_id
        WHERE fd.status = 'delivered'
          AND EXTRACT(YEAR FROM fd.dispatched_at) = %s
        GROUP BY c.name
        ORDER BY revenue DESC
        """,
        (year,),
    )
    total_client_rev = sum(_safe_float(r["revenue"]) for r in client_rows)
    clients = []
    for r in client_rows:
        rev = _safe_float(r["revenue"])
        clients.append({
            "client_name": r["client_name"],
            "revenue": round(rev, 2),
            "volume": round(_safe_float(r["volume"]), 2),
            "pct_of_total": round((rev / total_client_rev * 100), 1) if total_client_rev > 0 else 0.0,
        })

    # Suppliers breakdown for the year
    supplier_rows = query(
        """
        SELECT
          COALESCE(s.name, fr.source_custom) AS supplier_name,
          COALESCE(SUM(fr.volume_adjusted), 0) AS volume
        FROM fuel_receipts fr
        LEFT JOIN suppliers s ON s.id = fr.supplier_id
        WHERE EXTRACT(YEAR FROM fr.received_at) = %s
          AND fr.ttn_confirmed = TRUE
        GROUP BY COALESCE(s.name, fr.source_custom)
        ORDER BY volume DESC
        """,
        (year,),
    )
    total_sup_volume = sum(_safe_float(r["volume"]) for r in supplier_rows)
    suppliers = []
    for r in supplier_rows:
        vol = _safe_float(r["volume"])
        suppliers.append({
            "supplier_name": r["supplier_name"] or "Неизвестно",
            "volume": round(vol, 2),
            "pct_of_total": round((vol / total_sup_volume * 100), 1) if total_sup_volume > 0 else 0.0,
        })

    return {
        "year": year,
        "revenue_fleet": round(revenue_fleet, 2),
        "revenue_hire": round(revenue_hire, 2),
        "expenses_fleet": round(expenses_fleet, 2),
        "expenses_fuel": round(expenses_fuel, 2),
        "expenses_carriers": round(expenses_carriers, 2),
        "expenses_general": round(expenses_general, 2),
        "profit": round(profit, 2),
        "clients": clients,
        "suppliers": suppliers,
    }


# ─────────────────────────────────────────────────────────────────────────────
# /api/annual/export  (CSV export)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/annual/export")
def annual_export(
    year: int = Query(default=2026),
    user: dict = Depends(require_partner),
):
    """Return annual data as a CSV file."""
    from fastapi.responses import Response
    import io, csv

    data = annual_summary(year=year, user=user)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Показатель", "Сумма ₽"])
    w.writerow(["Выручка свой парк", data["revenue_fleet"]])
    w.writerow(["Выручка найм", data["revenue_hire"]])
    w.writerow(["Расходы парк", data["expenses_fleet"]])
    w.writerow(["Расходы топливо", data["expenses_fuel"]])
    w.writerow(["Расходы перевозчики", data["expenses_carriers"]])
    w.writerow(["Общие расходы", data["expenses_general"]])
    w.writerow(["Чистая прибыль", data["profit"]])
    w.writerow([])
    w.writerow(["Клиент", "Выручка ₽", "Объём куб", "Доля %"])
    for c in data["clients"]:
        w.writerow([c["client_name"], c["revenue"], c["volume"], c["pct_of_total"]])

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=annual_{year}.csv"},
    )
