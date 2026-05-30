import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..database import query, query_one, execute, get_db
from ..deps import get_current_user, require_partner
from ..utils.audit import log_action

router = APIRouter()


class DebtCreate(BaseModel):
    recorded_at: str  # YYYY-MM-DD
    debtor: str
    amount: Optional[float] = None
    type: str = "ДОЛГ"  # ДОЛГ | ОПЛАТА
    comment: Optional[str] = None
    parent_id: Optional[int] = None  # for ОПЛАТА: link to the ДОЛГ being paid


@router.get("/debts")
def list_debts(
    period: Optional[str] = Query(None),
    debtor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_partner),
):
    parts = ["1=1"]
    params = []
    if period:
        try:
            y, m = period.split("-")
            parts.append("EXTRACT(YEAR FROM dr.recorded_at) = %s AND EXTRACT(MONTH FROM dr.recorded_at) = %s")
            params.extend([int(y), int(m)])
        except ValueError:
            pass
    if debtor:
        parts.append("dr.debtor ILIKE %s")
        params.append(f"%{debtor}%")
    where = " AND ".join(parts)

    records = query(f"""
        SELECT dr.*, u.name AS entered_by_name,
               CASE WHEN dr.type = 'ДОЛГ' THEN
                   dr.amount - COALESCE((
                       SELECT SUM(p.amount) FROM debt_records p
                       WHERE p.parent_id = dr.id AND p.type = 'ОПЛАТА'
                   ), 0)
               ELSE NULL END AS remaining
        FROM debt_records dr
        LEFT JOIN users u ON u.id = dr.entered_by
        WHERE {where}
        ORDER BY dr.recorded_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    # Compute balances per debtor
    balances_raw = query("""
        SELECT debtor,
            SUM(CASE WHEN type='ДОЛГ' THEN amount ELSE 0 END) -
            SUM(CASE WHEN type='ОПЛАТА' THEN amount ELSE 0 END) AS balance
        FROM debt_records GROUP BY debtor
    """)
    balances = {r["debtor"]: float(r["balance"] or 0) for r in balances_raw}

    return {"records": records, "balances": balances}


@router.get("/debts/{debt_id}")
def get_debt(debt_id: int, user: dict = Depends(require_partner)):
    row = query_one("SELECT * FROM debt_records WHERE id = %s", (debt_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Debt record not found")
    return row


@router.post("/debts", status_code=201)
def create_debt(body: DebtCreate, user: dict = Depends(require_partner)):
    if body.type not in ("ДОЛГ", "ОПЛАТА"):
        raise HTTPException(status_code=400, detail="type must be ДОЛГ or ОПЛАТА")
    # Validate parent_id if provided: must be a ДОЛГ, same debtor
    if body.parent_id:
        parent = query_one("SELECT id, debtor, type FROM debt_records WHERE id = %s", (body.parent_id,))
        if not parent:
            raise HTTPException(status_code=400, detail="Родительский долг не найден")
        if parent["type"] != "ДОЛГ":
            raise HTTPException(status_code=400, detail="parent_id должен указывать на запись типа ДОЛГ")
    with get_db() as conn:
        row = execute("""
            INSERT INTO debt_records (recorded_at, debtor, amount, type, comment, entered_by, parent_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (body.recorded_at, body.debtor, body.amount, body.type, body.comment, user["id"], body.parent_id),
            conn=conn, returning=True)
        log_action(conn, "debt_records", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/debts/{debt_id}")
def update_debt(debt_id: int, body: DebtCreate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM debt_records WHERE id = %s", (debt_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Debt record not found")
    with get_db() as conn:
        row = execute("""
            UPDATE debt_records
            SET recorded_at=%s, debtor=%s, amount=%s, type=%s, comment=%s
            WHERE id=%s RETURNING *
        """, (body.recorded_at, body.debtor, body.amount, body.type, body.comment, debt_id),
            conn=conn, returning=True)
        log_action(conn, "debt_records", debt_id, "UPDATE", user["id"],
                   old_data=dict(existing), new_data=dict(row))
        conn.commit()
    return row


class DebtCorrection(BaseModel):
    recorded_at: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    comment: Optional[str] = None
    reason: str  # mandatory


@router.put("/debts/{debt_id}/correct")
def correct_debt(debt_id: int, body: DebtCorrection, user: dict = Depends(require_partner)):
    row = query_one("SELECT * FROM debt_records WHERE id = %s", (debt_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    updates = {}
    if body.recorded_at: updates["recorded_at"] = body.recorded_at
    if body.amount is not None: updates["amount"] = body.amount
    if body.type is not None: updates["type"] = body.type
    if body.comment is not None: updates["comment"] = body.comment
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [debt_id]
    with get_db() as conn:
        updated = execute(f"UPDATE debt_records SET {set_clause} WHERE id = %s RETURNING *", vals, conn=conn, returning=True)
        log_action(conn, "debt_records", debt_id, "CORRECTION", user["id"], old_data=dict(row), new_data=dict(updated), reason=body.reason)
        conn.commit()
    return updated


@router.get("/reports/export")
def export_csv(
    section: str = Query(...),
    period: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    section_map = {
        "hire": ("hire_deliveries", "delivery_at"),
        "income": ("income_records", "income_at"),
        "expenses": ("company_expenses", "expense_at"),
        "debts": ("debt_records", "recorded_at"),
        "fleet_expenses": ("fleet_expenses", "expense_at"),
        "receipts": ("fuel_receipts", "received_at"),
        "dispatches": ("fuel_dispatches", "dispatched_at"),
        "orders": ("orders", "paid_at"),
    }
    if section not in section_map:
        raise HTTPException(status_code=400, detail=f"section must be one of {list(section_map)}")

    partner_only_sections = {"hire", "income", "expenses", "debts", "fleet_expenses"}
    if section in partner_only_sections and user["role"] not in ("partner",):
        raise HTTPException(status_code=403, detail="Partners only")

    table, date_col = section_map[section]
    params = []
    where = "1=1"
    if period:
        try:
            y, m = period.split("-")
            where = f"EXTRACT(YEAR FROM {date_col}) = %s AND EXTRACT(MONTH FROM {date_col}) = %s"
            params.extend([int(y), int(m)])
        except ValueError:
            pass

    rows = query(f"SELECT * FROM {table} WHERE {where} ORDER BY {date_col} DESC", params)

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        for r in rows:
            writer.writerow({k: str(v) if v is not None else "" for k, v in r.items()})

    output.seek(0)
    filename = f"{section}_{period or 'all'}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
