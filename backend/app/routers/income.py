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


class IncomeCreate(BaseModel):
    income_at: str  # YYYY-MM-DD
    client_id: Optional[int] = None
    amount: Optional[float] = None
    volume: Optional[float] = None
    comment: Optional[str] = None
    is_credit: bool = False  # True = «в долг» (не считается оплатой для долга)
    order_id: Optional[int] = None


@router.get("/income")
def list_income(
    period: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_partner),
):
    parts = ["1=1"]
    params = []
    if period:
        try:
            y, m = period.split("-")
            parts.append("EXTRACT(YEAR FROM ir.income_at) = %s AND EXTRACT(MONTH FROM ir.income_at) = %s")
            params.extend([int(y), int(m)])
        except ValueError:
            pass
    where = " AND ".join(parts)
    return query(f"""
        SELECT ir.*, c.name AS client_name, u.name AS entered_by_name
        FROM income_records ir
        LEFT JOIN clients c ON c.id = ir.client_id
        LEFT JOIN users u ON u.id = ir.entered_by
        WHERE {where}
        ORDER BY ir.income_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])


@router.get("/income/{income_id}")
def get_income(income_id: int, user: dict = Depends(require_partner)):
    row = query_one("""
        SELECT ir.*, c.name AS client_name
        FROM income_records ir LEFT JOIN clients c ON c.id = ir.client_id
        WHERE ir.id = %s
    """, (income_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Income record not found")
    return row


@router.post("/income", status_code=201)
def create_income(body: IncomeCreate, user: dict = Depends(require_partner)):
    with get_db() as conn:
        row = execute("""
            INSERT INTO income_records (income_at, client_id, amount, volume, comment, is_credit, entered_by, order_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (body.income_at, body.client_id, body.amount, body.volume, body.comment, body.is_credit, user["id"], body.order_id),
            conn=conn, returning=True)
        log_action(conn, "income_records", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


class IncomeCorrection(BaseModel):
    income_at: Optional[str] = None
    amount: Optional[float] = None
    volume: Optional[float] = None
    comment: Optional[str] = None
    is_credit: Optional[bool] = None
    reason: str  # mandatory


@router.put("/income/{income_id}/correct")
def correct_income(income_id: int, body: IncomeCorrection, user: dict = Depends(require_partner)):
    row = query_one("SELECT * FROM income_records WHERE id = %s", (income_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    updates = {}
    if body.income_at: updates["income_at"] = body.income_at
    if body.amount is not None: updates["amount"] = body.amount
    if body.volume is not None: updates["volume"] = body.volume
    if body.comment is not None: updates["comment"] = body.comment
    if body.is_credit is not None: updates["is_credit"] = body.is_credit
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values()) + [income_id]
    with get_db() as conn:
        updated = execute(f"UPDATE income_records SET {set_clause} WHERE id = %s RETURNING *", vals, conn=conn, returning=True)
        log_action(conn, "income_records", income_id, "CORRECTION", user["id"], old_data=dict(row), new_data=dict(updated), reason=body.reason)
        conn.commit()
    return updated


@router.put("/income/{income_id}")
def update_income(income_id: int, body: IncomeCreate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM income_records WHERE id = %s", (income_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Income record not found")
    with get_db() as conn:
        row = execute("""
            UPDATE income_records
            SET income_at=%s, client_id=%s, amount=%s, volume=%s, comment=%s, is_credit=%s, order_id=%s
            WHERE id=%s RETURNING *
        """, (body.income_at, body.client_id, body.amount, body.volume, body.comment, body.is_credit, body.order_id, income_id),
            conn=conn, returning=True)
        log_action(conn, "income_records", income_id, "UPDATE", user["id"],
                   old_data=dict(existing), new_data=dict(row))
        conn.commit()
    return row


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
        "fleet_expenses": ("fleet_expenses", "expense_at"),
        "receipts": ("fuel_receipts", "received_at"),
        "dispatches": ("fuel_dispatches", "dispatched_at"),
        "orders": ("orders", "paid_at"),
    }
    if section not in section_map:
        raise HTTPException(status_code=400, detail=f"section must be one of {list(section_map)}")

    partner_only_sections = {"hire", "income", "expenses", "fleet_expenses"}
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
