from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from ..database import query, query_one, execute, get_db
from ..deps import require_partner
from ..utils.audit import log_action

router = APIRouter()

CATEGORIES = [
    "Бухгалтерия", "Аренда", "Кредиты (тело)", "Проценты по кредитам",
    "Налоги/штрафы", "Благотворительность", "Командировочные",
    "Зарплата партнёрам", "Финансовые расходы (налоги/вывод)", "Прочие",
]


class ExpenseCreate(BaseModel):
    expense_at: str  # YYYY-MM-DD
    category: str
    amount: Optional[float] = None
    comment: Optional[str] = None


@router.get("/expenses")
def list_expenses(
    period: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_partner),
):
    parts = ["1=1"]
    params = []
    if period:
        try:
            y, m = period.split("-")
            parts.append("EXTRACT(YEAR FROM ce.expense_at) = %s AND EXTRACT(MONTH FROM ce.expense_at) = %s")
            params.extend([int(y), int(m)])
        except ValueError:
            pass
    if category:
        parts.append("ce.category = %s")
        params.append(category)
    where = " AND ".join(parts)
    return query(f"""
        SELECT ce.*, u.name AS entered_by_name
        FROM company_expenses ce
        LEFT JOIN users u ON u.id = ce.entered_by
        WHERE {where}
        ORDER BY ce.expense_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])


@router.get("/expenses/{expense_id}")
def get_expense(expense_id: int, user: dict = Depends(require_partner)):
    row = query_one("SELECT * FROM company_expenses WHERE id = %s", (expense_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Expense not found")
    return row


@router.post("/expenses", status_code=201)
def create_expense(body: ExpenseCreate, user: dict = Depends(require_partner)):
    with get_db() as conn:
        row = execute("""
            INSERT INTO company_expenses (expense_at, category, amount, comment, entered_by)
            VALUES (%s, %s, %s, %s, %s) RETURNING *
        """, (body.expense_at, body.category, body.amount, body.comment, user["id"]),
            conn=conn, returning=True)
        log_action(conn, "company_expenses", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/expenses/{expense_id}")
def update_expense(expense_id: int, body: ExpenseCreate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM company_expenses WHERE id = %s", (expense_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    with get_db() as conn:
        row = execute("""
            UPDATE company_expenses
            SET expense_at=%s, category=%s, amount=%s, comment=%s
            WHERE id=%s RETURNING *
        """, (body.expense_at, body.category, body.amount, body.comment, expense_id),
            conn=conn, returning=True)
        log_action(conn, "company_expenses", expense_id, "UPDATE", user["id"],
                   old_data=dict(existing), new_data=dict(row))
        conn.commit()
    return row
