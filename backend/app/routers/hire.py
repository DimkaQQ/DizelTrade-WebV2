from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from ..database import query, query_one, execute, get_db
from ..deps import require_partner
from ..utils.audit import log_action

router = APIRouter()


class HireCreate(BaseModel):
    delivery_at: str  # YYYY-MM-DD
    client_id: Optional[int] = None
    supplier_id: Optional[int] = None
    carrier_id: Optional[int] = None
    carrier_custom: Optional[str] = None
    volume_liters: Optional[float] = None
    price_client: Optional[float] = None
    price_supplier: Optional[float] = None
    price_carrier: Optional[float] = None
    comment: Optional[str] = None


def _calc_amounts(body: HireCreate) -> dict:
    vol = body.volume_liters or 0.0
    amount_client = round((body.price_client or 0) * vol, 2)
    amount_supplier = round((body.price_supplier or 0) * vol, 2)
    amount_carrier = round((body.price_carrier or 0) * vol, 2)
    margin = round(amount_client - amount_supplier - amount_carrier, 2)
    margin_pct = round(margin / amount_client * 100, 2) if amount_client else 0.0
    return {
        "amount_client": amount_client,
        "amount_supplier": amount_supplier,
        "amount_carrier": amount_carrier,
        "margin": margin,
        "margin_pct": margin_pct,
    }


@router.get("/hire")
def list_hire(
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
            parts.append("EXTRACT(YEAR FROM hd.delivery_at) = %s AND EXTRACT(MONTH FROM hd.delivery_at) = %s")
            params.extend([int(y), int(m)])
        except ValueError:
            pass
    where = " AND ".join(parts)
    return query(f"""
        SELECT hd.*,
               c.name AS client_name, s.name AS supplier_name, cr.name AS carrier_name
        FROM hire_deliveries hd
        LEFT JOIN clients c ON c.id = hd.client_id
        LEFT JOIN suppliers s ON s.id = hd.supplier_id
        LEFT JOIN carriers cr ON cr.id = hd.carrier_id
        WHERE {where}
        ORDER BY hd.delivery_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])


@router.get("/hire/{hire_id}")
def get_hire(hire_id: int, user: dict = Depends(require_partner)):
    row = query_one("""
        SELECT hd.*, c.name AS client_name, s.name AS supplier_name, cr.name AS carrier_name
        FROM hire_deliveries hd
        LEFT JOIN clients c ON c.id = hd.client_id
        LEFT JOIN suppliers s ON s.id = hd.supplier_id
        LEFT JOIN carriers cr ON cr.id = hd.carrier_id
        WHERE hd.id = %s
    """, (hire_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Hire record not found")
    return row


@router.post("/hire", status_code=201)
def create_hire(body: HireCreate, user: dict = Depends(require_partner)):
    amt = _calc_amounts(body)
    with get_db() as conn:
        row = execute("""
            INSERT INTO hire_deliveries
                (delivery_at, client_id, supplier_id, carrier_id, carrier_custom,
                 volume_liters, price_client, price_supplier, price_carrier,
                 amount_client, amount_supplier, amount_carrier, margin, margin_pct,
                 comment, entered_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, (
            body.delivery_at, body.client_id, body.supplier_id, body.carrier_id,
            body.carrier_custom, body.volume_liters, body.price_client, body.price_supplier,
            body.price_carrier, amt["amount_client"], amt["amount_supplier"],
            amt["amount_carrier"], amt["margin"], amt["margin_pct"],
            body.comment, user["id"]
        ), conn=conn, returning=True)
        log_action(conn, "hire_deliveries", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/hire/{hire_id}")
def update_hire(hire_id: int, body: HireCreate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM hire_deliveries WHERE id = %s", (hire_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Hire record not found")
    amt = _calc_amounts(body)
    with get_db() as conn:
        row = execute("""
            UPDATE hire_deliveries SET
                delivery_at=%s, client_id=%s, supplier_id=%s, carrier_id=%s, carrier_custom=%s,
                volume_liters=%s, price_client=%s, price_supplier=%s, price_carrier=%s,
                amount_client=%s, amount_supplier=%s, amount_carrier=%s,
                margin=%s, margin_pct=%s, comment=%s
            WHERE id=%s RETURNING *
        """, (
            body.delivery_at, body.client_id, body.supplier_id, body.carrier_id,
            body.carrier_custom, body.volume_liters, body.price_client, body.price_supplier,
            body.price_carrier, amt["amount_client"], amt["amount_supplier"],
            amt["amount_carrier"], amt["margin"], amt["margin_pct"],
            body.comment, hire_id
        ), conn=conn, returning=True)
        log_action(conn, "hire_deliveries", hire_id, "UPDATE", user["id"],
                   old_data=dict(existing), new_data=dict(row))
        conn.commit()
    return row
