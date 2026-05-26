from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel

from ..database import query, query_one, execute, get_db
from ..deps import get_current_user, require_partner, require_not_operator
from ..utils.audit import log_action

router = APIRouter()

# ---------------------------------------------------------------------------
# Helper: period filter clause
# ---------------------------------------------------------------------------

def period_clause(column: str, period: Optional[str]) -> tuple:
    """Return (sql_fragment, params_list) for a YYYY-MM period filter."""
    if not period:
        return ("", [])
    try:
        year, month = period.split("-")
        int(year), int(month)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="period must be YYYY-MM")
    return (
        f" AND EXTRACT(YEAR FROM {column}) = %s AND EXTRACT(MONTH FROM {column}) = %s",
        [int(year), int(month)],
    )


# ===========================================================================
# BALANCE
# ===========================================================================

@router.get("/balance")
def get_balance(user: dict = Depends(get_current_user)):
    row = query_one("SELECT balance_cubic FROM v_base_balance")
    balance = float(row["balance_cubic"]) if row and row["balance_cubic"] is not None else 0.0
    return {"balance_cubic": balance}


# ===========================================================================
# RECEIPTS
# ===========================================================================

class ReceiptCreate(BaseModel):
    received_at: Optional[str] = None
    supplier_id: Optional[int] = None
    source_custom: Optional[str] = None
    volume_nominal: float
    temperature: Optional[float] = None
    density: Optional[float] = None
    ttn_number: Optional[str] = None
    notes: Optional[str] = None


AUTO_CONFIRM_SUPPLIER_NAMES = {"Ангарск", "Коля", "Восточка", "Артём закупил"}


@router.get("/receipts")
def list_receipts(
    period: Optional[str] = Query(None),
    source: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    where_parts = ["1=1"]
    params: list = []

    if source is not None:
        where_parts.append("fr.supplier_id = %s")
        params.append(source)

    period_sql, period_params = period_clause("fr.received_at", period)
    if period_sql:
        where_parts.append(period_sql.lstrip(" AND "))
        params.extend(period_params)

    where = " AND ".join(where_parts)
    sql = f"""
        SELECT
            fr.*,
            s.name  AS supplier_name,
            u1.name AS entered_by_name,
            u2.name AS confirmed_by_name
        FROM fuel_receipts fr
        LEFT JOIN suppliers s  ON s.id  = fr.supplier_id
        LEFT JOIN users u1     ON u1.id = fr.entered_by
        LEFT JOIN users u2     ON u2.id = fr.confirmed_by
        WHERE {where}
        ORDER BY fr.received_at DESC
        LIMIT %s OFFSET %s
    """
    params += [limit, offset]
    return query(sql, params)


@router.get("/receipts/pending")
def list_pending_receipts(
    user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return query(
        """
        SELECT fr.*, s.name AS supplier_name, u.name AS entered_by_name
        FROM fuel_receipts fr
        LEFT JOIN suppliers s ON s.id = fr.supplier_id
        LEFT JOIN users u ON u.id = fr.entered_by
        WHERE fr.ttn_confirmed = FALSE
        ORDER BY fr.received_at DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )


@router.get("/receipts/{receipt_id}")
def get_receipt(receipt_id: int, user: dict = Depends(get_current_user)):
    row = query_one(
        """
        SELECT fr.*, s.name AS supplier_name,
               u1.name AS entered_by_name, u2.name AS confirmed_by_name
        FROM fuel_receipts fr
        LEFT JOIN suppliers s  ON s.id  = fr.supplier_id
        LEFT JOIN users u1     ON u1.id = fr.entered_by
        LEFT JOIN users u2     ON u2.id = fr.confirmed_by
        WHERE fr.id = %s
        """,
        (receipt_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return row


@router.post("/receipts", status_code=201)
def create_receipt(body: ReceiptCreate, bg: BackgroundTasks, user: dict = Depends(get_current_user)):
    # Determine auto-confirm
    auto_confirm = False
    if body.supplier_id:
        supplier = query_one("SELECT name FROM suppliers WHERE id = %s", (body.supplier_id,))
        if supplier and supplier["name"] in AUTO_CONFIRM_SUPPLIER_NAMES:
            auto_confirm = True

    # Calculate volume_adjusted
    if body.density is not None:
        volume_adjusted = body.volume_nominal * body.density / 0.840
    else:
        volume_adjusted = body.volume_nominal

    received_at = body.received_at or datetime.utcnow().isoformat()

    confirm_sql = "NOW()" if auto_confirm else "NULL"
    with get_db() as conn:
        row = execute(
            f"""
            INSERT INTO fuel_receipts
                (received_at, supplier_id, source_custom, volume_nominal, temperature,
                 density, volume_adjusted, ttn_number, ttn_confirmed, confirmed_by,
                 confirmed_at, entered_by, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, {confirm_sql}, %s, %s)
            RETURNING *
            """,
            (
                received_at,
                body.supplier_id,
                body.source_custom,
                body.volume_nominal,
                body.temperature,
                body.density,
                volume_adjusted,
                body.ttn_number,
                auto_confirm,
                user["id"] if auto_confirm else None,
                user["id"],
                body.notes,
            ),
            conn=conn,
            returning=True,
        )
        log_action(conn, "fuel_receipts", row["id"], "INSERT", user["id"], new_data=dict(row))

    # Push notification to partners
    from .notifications import push_to_role
    source_label = body.source_custom or "Неизвестно"
    push_to_role(
        "partner",
        "DTL · Новая приёмка",
        f"{source_label} → База Тында: {volume_adjusted:.1f} куб",
        "/base",
        bg=bg,
    )

    return {"id": row["id"], "ok": True, **dict(row)}


@router.put("/receipts/{receipt_id}/confirm")
def confirm_receipt(receipt_id: int, user: dict = Depends(require_not_operator)):
    row = query_one("SELECT * FROM fuel_receipts WHERE id = %s", (receipt_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if row["ttn_confirmed"]:
        raise HTTPException(status_code=400, detail="Already confirmed")

    with get_db() as conn:
        updated = execute(
            """
            UPDATE fuel_receipts
            SET ttn_confirmed = TRUE, confirmed_by = %s, confirmed_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (user["id"], receipt_id),
            conn=conn,
            returning=True,
        )
        log_action(conn, "fuel_receipts", receipt_id, "UPDATE", user["id"],
                   old_data=dict(row), new_data=dict(updated))
    return updated


@router.post("/receipts/{receipt_id}/photo")
def set_receipt_photo(receipt_id: int, photo_url: str, user: dict = Depends(get_current_user)):
    row = query_one("SELECT id FROM fuel_receipts WHERE id = %s", (receipt_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")
    execute(
        "UPDATE fuel_receipts SET ttn_photo_url = %s WHERE id = %s",
        (photo_url, receipt_id),
    )
    return {"message": "Photo updated"}


# ===========================================================================
# DISPATCHES
# ===========================================================================

class DispatchCreate(BaseModel):
    dispatched_at: Optional[str] = None
    truck_id: Optional[int] = None
    truck_temp: Optional[str] = None
    driver_id: Optional[int] = None
    driver_temp: Optional[str] = None
    truck_owner: str  # 'DTL' | 'Артём' | 'наёмная'
    site_id: int
    order_id: Optional[int] = None
    volume: float
    tariff: Optional[float] = None
    ttn_number: Optional[str] = None
    notes: Optional[str] = None


class DispatchStatusUpdate(BaseModel):
    status: str


@router.get("/dispatches")
def list_dispatches(
    period: Optional[str] = Query(None),
    site_id: Optional[int] = Query(None),
    truck_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    where_parts = ["1=1"]
    params: list = []

    if site_id is not None:
        where_parts.append("fd.site_id = %s")
        params.append(site_id)
    if truck_id is not None:
        where_parts.append("fd.truck_id = %s")
        params.append(truck_id)
    if status:
        where_parts.append("fd.status = %s")
        params.append(status)

    period_sql, period_params = period_clause("fd.dispatched_at", period)
    if period_sql:
        where_parts.append(period_sql.lstrip(" AND "))
        params.extend(period_params)

    where = " AND ".join(where_parts)
    sql = f"""
        SELECT
            fd.*,
            t.name   AS truck_name,
            d.name   AS driver_name,
            s.name   AS site_name,
            o.id     AS order_ref,
            u.name   AS entered_by_name
        FROM fuel_dispatches fd
        LEFT JOIN trucks  t ON t.id = fd.truck_id
        LEFT JOIN drivers d ON d.id = fd.driver_id
        LEFT JOIN sites   s ON s.id = fd.site_id
        LEFT JOIN orders  o ON o.id = fd.order_id
        LEFT JOIN users   u ON u.id = fd.entered_by
        WHERE {where}
        ORDER BY fd.dispatched_at DESC
        LIMIT %s OFFSET %s
    """
    params += [limit, offset]
    return query(sql, params)


@router.get("/dispatches/{dispatch_id}")
def get_dispatch(dispatch_id: int, user: dict = Depends(get_current_user)):
    row = query_one(
        """
        SELECT fd.*, t.name AS truck_name, d.name AS driver_name,
               s.name AS site_name, u.name AS entered_by_name
        FROM fuel_dispatches fd
        LEFT JOIN trucks  t ON t.id = fd.truck_id
        LEFT JOIN drivers d ON d.id = fd.driver_id
        LEFT JOIN sites   s ON s.id = fd.site_id
        LEFT JOIN users   u ON u.id = fd.entered_by
        WHERE fd.id = %s
        """,
        (dispatch_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return row


@router.post("/dispatches", status_code=201)
def create_dispatch(body: DispatchCreate, user: dict = Depends(get_current_user)):
    dispatched_at = body.dispatched_at or datetime.utcnow().isoformat()

    with get_db() as conn:
        row = execute(
            """
            INSERT INTO fuel_dispatches
                (dispatched_at, truck_id, truck_temp, driver_id, driver_temp,
                 truck_owner, site_id, order_id, volume, tariff, ttn_number,
                 entered_by, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                dispatched_at,
                body.truck_id,
                body.truck_temp,
                body.driver_id,
                body.driver_temp,
                body.truck_owner,
                body.site_id,
                body.order_id,
                body.volume,
                body.tariff,
                body.ttn_number,
                user["id"],
                body.notes,
            ),
            conn=conn,
            returning=True,
        )
        log_action(conn, "fuel_dispatches", row["id"], "INSERT", user["id"], new_data=dict(row))
    return {"id": row["id"], "ok": True, **dict(row)}


@router.put("/dispatches/{dispatch_id}/status")
def update_dispatch_status(
    dispatch_id: int,
    body: DispatchStatusUpdate,
    user: dict = Depends(get_current_user),
):
    valid_statuses = {"dispatched", "in_transit", "delivered", "cancelled"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    row = query_one("SELECT * FROM fuel_dispatches WHERE id = %s", (dispatch_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    # Role-based restrictions
    if body.status == "delivered" and user["role"] not in ("artem", "operator", "partner"):
        raise HTTPException(status_code=403, detail="Only artem or operator can mark as delivered")
    if body.status == "cancelled" and user["role"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can cancel dispatches")

    extra_sql = ""
    extra_params: list = []
    if body.status == "delivered":
        extra_sql = ", delivered_at = NOW()"

    with get_db() as conn:
        updated = execute(
            f"UPDATE fuel_dispatches SET status = %s{extra_sql} WHERE id = %s RETURNING *",
            [body.status] + extra_params + [dispatch_id],
            conn=conn,
            returning=True,
        )
        log_action(conn, "fuel_dispatches", dispatch_id, "UPDATE", user["id"],
                   old_data=dict(row), new_data=dict(updated))
    return updated


@router.post("/dispatches/{dispatch_id}/photo")
def set_dispatch_photo(dispatch_id: int, photo_url: str, user: dict = Depends(get_current_user)):
    row = query_one("SELECT id FROM fuel_dispatches WHERE id = %s", (dispatch_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    execute(
        "UPDATE fuel_dispatches SET ttn_photo_url = %s WHERE id = %s",
        (photo_url, dispatch_id),
    )
    return {"message": "Photo updated"}


# ===========================================================================
# ADVANCES
# ===========================================================================

class AdvanceCreate(BaseModel):
    given_at: Optional[str] = None
    recipient: str
    volume: Optional[float] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


@router.get("/advances")
def list_advances(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    where_parts = ["1=1"]
    params: list = []
    if status:
        where_parts.append("status = %s")
        params.append(status)
    where = " AND ".join(where_parts)
    return query(
        f"SELECT * FROM fuel_advances WHERE {where} ORDER BY given_at DESC LIMIT %s OFFSET %s",
        params + [limit, offset],
    )


@router.get("/advances/{advance_id}")
def get_advance(advance_id: int, user: dict = Depends(get_current_user)):
    row = query_one("SELECT * FROM fuel_advances WHERE id = %s", (advance_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Advance not found")
    return row


@router.post("/advances", status_code=201)
def create_advance(body: AdvanceCreate, user: dict = Depends(get_current_user)):
    given_at = body.given_at or datetime.utcnow().isoformat()
    row = execute(
        """
        INSERT INTO fuel_advances (given_at, recipient, volume, amount, notes, entered_by)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (given_at, body.recipient, body.volume, body.amount, body.notes, user["id"]),
        returning=True,
    )
    return row


@router.put("/advances/{advance_id}/return")
def return_advance(advance_id: int, user: dict = Depends(get_current_user)):
    row = query_one("SELECT * FROM fuel_advances WHERE id = %s", (advance_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Advance not found")
    updated = execute(
        "UPDATE fuel_advances SET status='returned', returned_at=NOW() WHERE id = %s RETURNING *",
        (advance_id,),
        returning=True,
    )
    return updated


# ===========================================================================
# OWN USAGE
# ===========================================================================

class OwnUsageCreate(BaseModel):
    used_at: Optional[str] = None
    truck_id: int
    volume: float
    notes: Optional[str] = None


@router.get("/own-usage")
def list_own_usage(
    period: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    where_parts = ["1=1"]
    params: list = []
    period_sql, period_params = period_clause("fou.used_at", period)
    if period_sql:
        where_parts.append(period_sql.lstrip(" AND "))
        params.extend(period_params)
    where = " AND ".join(where_parts)
    return query(
        f"""
        SELECT fou.*, t.name AS truck_name, u.name AS entered_by_name
        FROM fuel_own_usage fou
        LEFT JOIN trucks t ON t.id = fou.truck_id
        LEFT JOIN users u ON u.id = fou.entered_by
        WHERE {where}
        ORDER BY fou.used_at DESC
        LIMIT %s OFFSET %s
        """,
        params + [limit, offset],
    )


@router.post("/own-usage", status_code=201)
def create_own_usage(body: OwnUsageCreate, user: dict = Depends(get_current_user)):
    used_at = body.used_at or datetime.utcnow().isoformat()
    row = execute(
        """
        INSERT INTO fuel_own_usage (used_at, truck_id, volume, entered_by, notes)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
        """,
        (used_at, body.truck_id, body.volume, user["id"], body.notes),
        returning=True,
    )
    return row


# ===========================================================================
# CASH TO ARTEM
# ===========================================================================

class CashArtemCreate(BaseModel):
    given_at: Optional[str] = None
    amount_given: float
    purpose: Optional[str] = None
    notes: Optional[str] = None


class CashArtemReport(BaseModel):
    amount_spent: Optional[float] = None
    fuel_received: Optional[float] = None
    notes: Optional[str] = None


@router.get("/cash-artem")
def list_cash_artem(
    period: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    where_parts = ["1=1"]
    params: list = []
    period_sql, period_params = period_clause("ca.given_at", period)
    if period_sql:
        where_parts.append(period_sql.lstrip(" AND "))
        params.extend(period_params)
    where = " AND ".join(where_parts)
    return query(
        f"""
        SELECT ca.*, u.name AS entered_by_name
        FROM cash_to_artem ca
        LEFT JOIN users u ON u.id = ca.entered_by
        WHERE {where}
        ORDER BY ca.given_at DESC
        LIMIT %s OFFSET %s
        """,
        params + [limit, offset],
    )


@router.post("/cash-artem", status_code=201)
def create_cash_artem(body: CashArtemCreate, user: dict = Depends(require_partner)):
    given_at = body.given_at or datetime.utcnow().isoformat()
    row = execute(
        """
        INSERT INTO cash_to_artem (given_at, amount_given, purpose, entered_by, notes)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
        """,
        (given_at, body.amount_given, body.purpose, user["id"], body.notes),
        returning=True,
    )
    return row


@router.put("/cash-artem/{record_id}/report")
def report_cash_artem(record_id: int, body: CashArtemReport, user: dict = Depends(require_not_operator)):
    row = query_one("SELECT * FROM cash_to_artem WHERE id = %s", (record_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    updated = execute(
        """
        UPDATE cash_to_artem
        SET amount_spent = COALESCE(%s, amount_spent),
            fuel_received = COALESCE(%s, fuel_received),
            notes = COALESCE(%s, notes)
        WHERE id = %s
        RETURNING *
        """,
        (body.amount_spent, body.fuel_received, body.notes, record_id),
        returning=True,
    )
    return updated


@router.put("/cash-artem/{record_id}/settle")
def settle_cash_artem(record_id: int, user: dict = Depends(require_partner)):
    row = query_one("SELECT * FROM cash_to_artem WHERE id = %s", (record_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    updated = execute(
        "UPDATE cash_to_artem SET is_settled=TRUE, settled_at=NOW() WHERE id = %s RETURNING *",
        (record_id,),
        returning=True,
    )
    return updated


@router.get("/artem-balance")
def artem_balance(user: dict = Depends(get_current_user)):
    row = query_one("SELECT * FROM v_artem_cash")
    if not row:
        return {"total_given": 0, "total_spent": 0, "balance": 0}
    return {k: float(v) if v is not None else 0.0 for k, v in row.items()}


@router.get("/artem-debt")
def artem_debt(user: dict = Depends(get_current_user)):
    row = query_one("SELECT debt_rub FROM v_artem_debt")
    debt = float(row["debt_rub"]) if row and row["debt_rub"] is not None else 0.0
    return {"debt_rub": debt}


# ===========================================================================
# RECONCILIATION
# ===========================================================================

class ReconciliationCreate(BaseModel):
    period: str   # YYYY-MM
    physical_stock: float
    notes: Optional[str] = None


@router.get("/reconciliation/{period}")
def get_reconciliation(period: str, user: dict = Depends(get_current_user)):
    try:
        year, month = period.split("-")
        int(year), int(month)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="period must be YYYY-MM")

    period_date = f"{year}-{month}-01"
    row = query_one(
        "SELECT * FROM monthly_reconciliations WHERE period = %s",
        (period_date,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Reconciliation not found for this period")
    return row


@router.post("/reconciliation", status_code=201)
def upsert_reconciliation(body: ReconciliationCreate, user: dict = Depends(get_current_user)):
    try:
        year, month = body.period.split("-")
        int(year), int(month)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="period must be YYYY-MM")

    period_date = f"{year}-{month}-01"

    # Get calculated stock from view
    calc_row = query_one("SELECT balance_cubic FROM v_base_balance")
    calculated_stock = float(calc_row["balance_cubic"]) if calc_row and calc_row["balance_cubic"] else 0.0

    row = execute(
        """
        INSERT INTO monthly_reconciliations (period, calculated_stock, physical_stock, notes, entered_by)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (period) DO UPDATE
            SET physical_stock = EXCLUDED.physical_stock,
                calculated_stock = EXCLUDED.calculated_stock,
                notes = EXCLUDED.notes,
                entered_by = EXCLUDED.entered_by
        RETURNING *
        """,
        (period_date, calculated_stock, body.physical_stock, body.notes, user["id"]),
        returning=True,
    )
    return row
