from fastapi import APIRouter, Depends
from ..database import query_one, query
from ..deps import get_current_user

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(user: dict = Depends(get_current_user)):
    # Base balance from view
    balance_row = query_one("SELECT balance_cubic FROM v_base_balance")
    base_balance = float(balance_row["balance_cubic"]) if balance_row and balance_row["balance_cubic"] is not None else 0.0

    # Trips in transit
    transit_row = query_one(
        "SELECT COUNT(*) AS cnt FROM fuel_dispatches WHERE status IN ('dispatched', 'in_transit')"
    )
    trips_in_transit = int(transit_row["cnt"]) if transit_row else 0

    # Pending receipts (unconfirmed TTN)
    pending_row = query_one(
        "SELECT COUNT(*) AS cnt FROM fuel_receipts WHERE ttn_confirmed = FALSE"
    )
    pending_receipts = int(pending_row["cnt"]) if pending_row else 0

    # Artem cash balance
    artem_cash_row = query_one("SELECT balance FROM v_artem_cash")
    artem_cash_balance = float(artem_cash_row["balance"]) if artem_cash_row and artem_cash_row["balance"] is not None else 0.0

    # Artem debt
    artem_debt_row = query_one("SELECT debt_rub FROM v_artem_debt")
    artem_debt = float(artem_debt_row["debt_rub"]) if artem_debt_row and artem_debt_row["debt_rub"] is not None else 0.0

    alerts = _build_alerts(base_balance, pending_receipts)

    # Client debts: total hire revenue - total income received
    client_debts = query("""
        SELECT c.name,
               COALESCE(h.total_hire, 0) AS total_hire,
               COALESCE(i.total_paid, 0) AS total_paid,
               COALESCE(h.total_hire, 0) - COALESCE(i.total_paid, 0) AS debt
        FROM clients c
        LEFT JOIN (
            SELECT client_id, SUM(amount_client) AS total_hire FROM hire_deliveries GROUP BY client_id
        ) h ON h.client_id = c.id
        LEFT JOIN (
            SELECT client_id, SUM(amount) AS total_paid FROM income_records GROUP BY client_id
        ) i ON i.client_id = c.id
        WHERE COALESCE(h.total_hire, 0) > 0
        ORDER BY debt DESC
    """)

    # Trucks monthly summary
    import datetime
    now = datetime.datetime.now()
    trucks_month = query("""
        SELECT t.name, t.status,
               COALESCE(SUM(fe.amount), 0) AS expenses,
               COALESCE(MAX(CASE WHEN fe.category = 'Зарплата' THEN fe.trips END), 0) AS trips,
               COALESCE(MAX(CASE WHEN fe.category = 'Зарплата' THEN fe.revenue END), 0) AS revenue
        FROM trucks t
        LEFT JOIN fleet_expenses fe ON fe.truck_id = t.id
            AND EXTRACT(YEAR FROM fe.expense_at) = %s
            AND EXTRACT(MONTH FROM fe.expense_at) = %s
        WHERE t.status IN ('active','for_sale')
        GROUP BY t.id, t.name, t.status
        ORDER BY t.name
    """, (now.year, now.month))

    return {
        "base_balance": base_balance,
        "trips_in_transit": trips_in_transit,
        "pending_receipts": pending_receipts,
        "artem_cash_balance": artem_cash_balance,
        "artem_debt": artem_debt,
        "alerts": alerts,
        "client_debts": [{"name": r["name"], "debt": float(r["debt"]), "total_hire": float(r["total_hire"]), "total_paid": float(r["total_paid"])} for r in client_debts],
        "trucks_month": [{"name": r["name"], "status": r["status"], "expenses": float(r["expenses"]), "trips": int(r["trips"] or 0), "revenue": float(r["revenue"] or 0)} for r in trucks_month],
    }


@router.get("/dashboard/alerts")
def get_alerts(user: dict = Depends(get_current_user)):
    balance_row = query_one("SELECT balance_cubic FROM v_base_balance")
    base_balance = float(balance_row["balance_cubic"]) if balance_row and balance_row["balance_cubic"] is not None else 0.0

    pending_row = query_one(
        "SELECT COUNT(*) AS cnt FROM fuel_receipts WHERE ttn_confirmed = FALSE"
    )
    pending_receipts = int(pending_row["cnt"]) if pending_row else 0

    return _build_alerts(base_balance, pending_receipts)


def _build_alerts(base_balance: float, pending_receipts: int) -> list:
    alerts = []

    # Get threshold settings
    low_stock_setting = query_one("SELECT value FROM settings WHERE key = 'alert_low_stock_cubic'")
    low_stock_threshold = float(low_stock_setting["value"]) if low_stock_setting else 100.0

    unconfirmed_hours_setting = query_one("SELECT value FROM settings WHERE key = 'alert_unconfirmed_hours'")
    unconfirmed_hours = int(unconfirmed_hours_setting["value"]) if unconfirmed_hours_setting else 48

    cash_unsettled_days_setting = query_one("SELECT value FROM settings WHERE key = 'alert_cash_unsettled_days'")
    cash_unsettled_days = int(cash_unsettled_days_setting["value"]) if cash_unsettled_days_setting else 7

    # Low stock alert
    if base_balance < low_stock_threshold:
        alerts.append({
            "type": "low_stock",
            "message": f"Запасы заканчиваются — осталось {base_balance:.1f} куб",
            "severity": "warning",
        })

    # Unconfirmed receipts older than threshold
    old_unconfirmed = query_one(
        "SELECT COUNT(*) AS cnt FROM fuel_receipts "
        "WHERE ttn_confirmed = FALSE "
        "AND received_at < NOW() - (%s * INTERVAL '1 hour')",
        (unconfirmed_hours,)
    )
    if old_unconfirmed and int(old_unconfirmed["cnt"]) > 0:
        alerts.append({
            "type": "unconfirmed_receipt",
            "message": f"Есть неподтверждённые ТТН более {unconfirmed_hours} часов",
            "severity": "warning",
        })

    # Unsettled cash to artem
    unsettled_cash = query_one(
        "SELECT COUNT(*) AS cnt FROM cash_to_artem "
        "WHERE is_settled = FALSE "
        "AND given_at < NOW() - (%s * INTERVAL '1 day')",
        (cash_unsettled_days,)
    )
    if unsettled_cash and int(unsettled_cash["cnt"]) > 0:
        alerts.append({
            "type": "unsettled_cash",
            "message": f"Есть несверенные выдачи Артёму более {cash_unsettled_days} дней",
            "severity": "info",
        })

    # Active orders with no recent dispatches
    stalled_orders = query(
        "SELECT o.id, c.name AS client_name "
        "FROM orders o "
        "JOIN clients c ON c.id = o.client_id "
        "WHERE o.status = 'active' "
        "AND NOT EXISTS ("
        "  SELECT 1 FROM fuel_dispatches fd "
        "  WHERE fd.order_id = o.id "
        "  AND fd.dispatched_at > NOW() - INTERVAL '7 days'"
        ")"
    )
    for order in stalled_orders:
        alerts.append({
            "type": "stalled_order",
            "message": f"Заказ #{order['id']} ({order['client_name']}) — нет рейсов более 7 дней",
            "severity": "info",
        })

    return alerts
