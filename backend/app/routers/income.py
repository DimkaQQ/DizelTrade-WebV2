from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from ..database import query, query_one, execute, get_db
from ..deps import require_partner
from ..utils.audit import log_action

router = APIRouter()


class IncomeCreate(BaseModel):
    income_at: str  # YYYY-MM-DD
    client_id: Optional[int] = None
    amount: Optional[float] = None
    volume: Optional[float] = None
    comment: Optional[str] = None


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
            INSERT INTO income_records (income_at, client_id, amount, volume, comment, entered_by)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
        """, (body.income_at, body.client_id, body.amount, body.volume, body.comment, user["id"]),
            conn=conn, returning=True)
        log_action(conn, "income_records", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/income/{income_id}")
def update_income(income_id: int, body: IncomeCreate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM income_records WHERE id = %s", (income_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Income record not found")
    with get_db() as conn:
        row = execute("""
            UPDATE income_records
            SET income_at=%s, client_id=%s, amount=%s, volume=%s, comment=%s
            WHERE id=%s RETURNING *
        """, (body.income_at, body.client_id, body.amount, body.volume, body.comment, income_id),
            conn=conn, returning=True)
        log_action(conn, "income_records", income_id, "UPDATE", user["id"],
                   old_data=dict(existing), new_data=dict(row))
        conn.commit()
    return row
