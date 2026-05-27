from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from ..database import query, query_one, execute, get_db
from ..deps import get_current_user, require_partner, require_not_operator
from ..utils.audit import log_action

router = APIRouter()


# ── Trucks ────────────────────────────────────────────────────────────────────

class TruckCreate(BaseModel):
    name: str
    owner: str  # DTL | Артём
    tank_volume: Optional[float] = None
    status: str = "active"
    plate: Optional[str] = None
    notes: Optional[str] = None


@router.get("/trucks")
def list_trucks(
    owner: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    parts = ["t.status != 'archived'"]
    params = []

    if owner:
        parts.append("t.owner = %s")
        params.append(owner)
    if status:
        parts.append("t.status = %s")
        params.append(status)

    where = " AND ".join(parts)
    return query(f"""
        SELECT t.*,
            COALESCE(d.trips_month, 0) AS trips_month
        FROM trucks t
        LEFT JOIN (
            SELECT truck_id, COUNT(*) AS trips_month
            FROM fuel_dispatches
            WHERE status = 'delivered'
              AND dispatched_at >= DATE_TRUNC('month', NOW())
            GROUP BY truck_id
        ) d ON d.truck_id = t.id
        WHERE {where} ORDER BY t.owner, t.name
    """, params)


@router.get("/trucks/{truck_id}")
def get_truck(truck_id: int, user: dict = Depends(get_current_user)):
    row = query_one("SELECT * FROM trucks WHERE id = %s", (truck_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Truck not found")
    return row


@router.post("/trucks", status_code=201)
def create_truck(body: TruckCreate, user: dict = Depends(require_not_operator)):
    if user["role"] == "artem" and body.owner != "Артём":
        raise HTTPException(status_code=403, detail="Artem can only add his own trucks")
    with get_db() as conn:
        row = execute("""
            INSERT INTO trucks (name, owner, tank_volume, status, plate, notes, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (body.name, body.owner, body.tank_volume, body.status, body.plate, body.notes, user["id"]),
            conn=conn, returning=True)
        log_action(conn, "trucks", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/trucks/{truck_id}")
def update_truck(truck_id: int, body: TruckCreate, user: dict = Depends(require_not_operator)):
    existing = query_one("SELECT * FROM trucks WHERE id = %s", (truck_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Truck not found")
    if user["role"] == "artem" and existing["owner"] != "Артём":
        raise HTTPException(status_code=403, detail="Artem can only edit his own trucks")
    with get_db() as conn:
        row = execute("""
            UPDATE trucks SET name=%s, owner=%s, tank_volume=%s, status=%s, plate=%s, notes=%s
            WHERE id=%s RETURNING *
        """, (body.name, body.owner, body.tank_volume, body.status, body.plate, body.notes, truck_id),
            conn=conn, returning=True)
        log_action(conn, "trucks", truck_id, "UPDATE", user["id"],
                   old_data=dict(existing), new_data=dict(row))
        conn.commit()
    return row


@router.put("/trucks/{truck_id}/archive")
def archive_truck(truck_id: int, user: dict = Depends(require_not_operator)):
    existing = query_one("SELECT * FROM trucks WHERE id = %s", (truck_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Truck not found")
    if user["role"] == "artem" and existing["owner"] != "Артём":
        raise HTTPException(status_code=403, detail="Artem can only archive his own trucks")
    return execute(
        "UPDATE trucks SET status='archived', archived_at=NOW() WHERE id=%s RETURNING *",
        (truck_id,), returning=True
    )


@router.get("/trucks/{truck_id}/stats")
def truck_stats(
    truck_id: int,
    period: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    parts = ["fd.truck_id = %s", "fd.status != 'cancelled'"]
    params = [truck_id]
    if period:
        try:
            y, m = period.split("-")
            parts.append("EXTRACT(YEAR FROM fd.dispatched_at) = %s AND EXTRACT(MONTH FROM fd.dispatched_at) = %s")
            params.extend([int(y), int(m)])
        except ValueError:
            pass

    where = " AND ".join(parts)
    revenue = query_one(f"""
        SELECT COUNT(*) AS trips,
               COALESCE(SUM(fd.volume),0) AS total_volume,
               COALESCE(SUM(fd.tariff),0) AS total_tariff
        FROM fuel_dispatches fd WHERE {where}
    """, params)

    expense_parts = ["fe.truck_id = %s"]
    expense_params = [truck_id]
    if period:
        try:
            y, m = period.split("-")
            expense_parts.append("EXTRACT(YEAR FROM fe.expense_at) = %s AND EXTRACT(MONTH FROM fe.expense_at) = %s")
            expense_params.extend([int(y), int(m)])
        except ValueError:
            pass

    expenses = query_one(f"""
        SELECT COALESCE(SUM(fe.amount),0) AS total_expenses
        FROM fleet_expenses fe WHERE {' AND '.join(expense_parts)}
    """, expense_params)

    tariff = float(revenue["total_tariff"]) if revenue else 0.0
    exp = float(expenses["total_expenses"]) if expenses else 0.0
    return {
        "truck_id": truck_id,
        "trips": int(revenue["trips"]) if revenue else 0,
        "total_volume": float(revenue["total_volume"]) if revenue else 0.0,
        "revenue": tariff,
        "expenses": exp,
        "profit": tariff - exp,
    }


# ── Drivers ───────────────────────────────────────────────────────────────────

class DriverCreate(BaseModel):
    name: str
    truck_id: Optional[int] = None
    owner: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None


@router.get("/drivers")
def list_drivers(user: dict = Depends(get_current_user)):
    return query("SELECT * FROM drivers WHERE is_active = TRUE ORDER BY name")


@router.post("/drivers", status_code=201)
def create_driver(body: DriverCreate, user: dict = Depends(require_not_operator)):
    return execute("""
        INSERT INTO drivers (name, truck_id, owner, is_active, notes)
        VALUES (%s, %s, %s, %s, %s) RETURNING *
    """, (body.name, body.truck_id, body.owner, body.is_active, body.notes), returning=True)


@router.put("/drivers/{driver_id}")
def update_driver(driver_id: int, body: DriverCreate, user: dict = Depends(require_not_operator)):
    row = query_one("SELECT id FROM drivers WHERE id = %s", (driver_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Driver not found")
    return execute("""
        UPDATE drivers SET name=%s, truck_id=%s, owner=%s, is_active=%s, notes=%s
        WHERE id=%s RETURNING *
    """, (body.name, body.truck_id, body.owner, body.is_active, body.notes, driver_id), returning=True)


# ── Fleet Expenses ────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    truck_id: int
    expense_at: str  # YYYY-MM-DD
    category: str
    amount: Optional[float] = None
    trips: Optional[int] = None
    revenue: Optional[float] = None
    comment: Optional[str] = None


class ExpenseCorrect(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    comment: Optional[str] = None
    reason: str


@router.get("/fleet/expenses")
def list_fleet_expenses(
    truck_id: Optional[int] = Query(None),
    period: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    parts = ["1=1"]
    params = []

    if truck_id:
        parts.append("fe.truck_id = %s")
        params.append(truck_id)
    if category:
        parts.append("fe.category = %s")
        params.append(category)
    if period:
        try:
            y, m = period.split("-")
            parts.append("EXTRACT(YEAR FROM fe.expense_at) = %s AND EXTRACT(MONTH FROM fe.expense_at) = %s")
            params.extend([int(y), int(m)])
        except ValueError:
            pass

    # Artem sees only his trucks' expenses
    if user["role"] == "artem":
        parts.append("t.owner = 'Артём'")

    where = " AND ".join(parts)
    return query(f"""
        SELECT fe.*, t.name AS truck_name, u.name AS entered_by_name
        FROM fleet_expenses fe
        LEFT JOIN trucks t ON t.id = fe.truck_id
        LEFT JOIN users u ON u.id = fe.entered_by
        WHERE {where}
        ORDER BY fe.expense_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])


@router.get("/fleet/expenses/{expense_id}")
def get_fleet_expense(expense_id: int, user: dict = Depends(get_current_user)):
    row = query_one("""
        SELECT fe.*, t.name AS truck_name
        FROM fleet_expenses fe LEFT JOIN trucks t ON t.id = fe.truck_id
        WHERE fe.id = %s
    """, (expense_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Expense not found")
    return row


@router.post("/fleet/expenses", status_code=201)
def create_fleet_expense(body: ExpenseCreate, user: dict = Depends(require_not_operator)):
    truck = query_one("SELECT owner FROM trucks WHERE id = %s", (body.truck_id,))
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    if user["role"] == "artem" and truck["owner"] != "Артём":
        raise HTTPException(status_code=403, detail="Artem can only add expenses for his trucks")

    with get_db() as conn:
        row = execute("""
            INSERT INTO fleet_expenses
                (truck_id, expense_at, category, amount, trips, revenue, comment, entered_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (body.truck_id, body.expense_at, body.category, body.amount,
              body.trips, body.revenue, body.comment, user["id"]),
            conn=conn, returning=True)
        log_action(conn, "fleet_expenses", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/fleet/expenses/{expense_id}/correct")
def correct_fleet_expense(expense_id: int, body: ExpenseCorrect, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM fleet_expenses WHERE id = %s", (expense_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")

    sets, params = [], []
    for field in ("amount", "category", "comment"):
        val = getattr(body, field)
        if val is not None:
            sets.append(f"{field} = %s")
            params.append(val)

    if not sets:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(expense_id)
    with get_db() as conn:
        row = execute(
            f"UPDATE fleet_expenses SET {', '.join(sets)} WHERE id=%s RETURNING *",
            params, conn=conn, returning=True
        )
        log_action(conn, "fleet_expenses", expense_id, "CORRECTION", user["id"],
                   old_data=dict(existing), new_data=dict(row), reason=body.reason)
        conn.commit()
    return row
