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

    return {
        "base_balance": base_balance,
        "trips_in_transit": trips_in_transit,
        "pending_receipts": pending_receipts,
        "artem_cash_balance": artem_cash_balance,
        "artem_debt": artem_debt,
        "alerts": alerts,
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
