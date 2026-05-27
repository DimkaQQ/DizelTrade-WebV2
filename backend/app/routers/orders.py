from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from ..database import query, query_one, execute, get_db
from ..deps import get_current_user, require_partner, require_not_operator
from ..utils.audit import log_action

router = APIRouter()


class OrderCreate(BaseModel):
    client_id: int
    paid_at: str  # YYYY-MM-DD
    amount_paid: Optional[float] = None
    volume_ordered: Optional[float] = None
    price_per_liter: Optional[float] = None
    delivery_type: Optional[str] = None
    notes: Optional[str] = None
    site_ids: Optional[List[int]] = None


class OrderUpdate(BaseModel):
    client_id: Optional[int] = None
    paid_at: Optional[str] = None
    amount_paid: Optional[float] = None
    volume_ordered: Optional[float] = None
    price_per_liter: Optional[float] = None
    delivery_type: Optional[str] = None
    notes: Optional[str] = None
    site_ids: Optional[List[int]] = None


def _order_fields(user: dict) -> str:
    if user["role"] == "artem":
        return "o.id, o.client_id, c.name AS client_name, o.volume_ordered, o.status, o.paid_at"
    return """
        o.id, o.client_id, c.name AS client_name,
        o.paid_at, o.amount_paid, o.volume_ordered, o.price_per_liter,
        o.delivery_type, o.notes, o.status, o.created_at
    """


@router.get("/orders")
def list_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    parts = ["1=1"]
    params = []
    if status:
        parts.append("o.status = %s")
        params.append(status)
    where = " AND ".join(parts)

    fields = _order_fields(user)
    rows = query(f"""
        SELECT {fields},
            COALESCE(SUM(CASE WHEN fd.status='delivered' THEN fd.volume ELSE 0 END),0) AS delivered,
            COALESCE(SUM(CASE WHEN fd.status IN('dispatched','in_transit') THEN fd.volume ELSE 0 END),0) AS in_transit,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL) AS sites
        FROM orders o
        LEFT JOIN clients c ON c.id = o.client_id
        LEFT JOIN fuel_dispatches fd ON fd.order_id = o.id
        LEFT JOIN order_sites os ON os.order_id = o.id
        LEFT JOIN sites s ON s.id = os.site_id
        WHERE {where}
        GROUP BY o.id, c.name
        ORDER BY o.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])
    return rows


@router.get("/orders/{order_id}")
def get_order(order_id: int, user: dict = Depends(get_current_user)):
    fields = _order_fields(user)
    row = query_one(f"""
        SELECT {fields},
            COALESCE(SUM(CASE WHEN fd.status='delivered' THEN fd.volume ELSE 0 END),0) AS delivered,
            COALESCE(SUM(CASE WHEN fd.status IN('dispatched','in_transit') THEN fd.volume ELSE 0 END),0) AS in_transit
        FROM orders o
        LEFT JOIN clients c ON c.id = o.client_id
        LEFT JOIN fuel_dispatches fd ON fd.order_id = o.id
        WHERE o.id = %s
        GROUP BY o.id, c.name
    """, (order_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    # Add dispatches
    dispatches = query("""
        SELECT fd.*, t.name AS truck_name, d.name AS driver_name, s.name AS site_name
        FROM fuel_dispatches fd
        LEFT JOIN trucks t ON t.id = fd.truck_id
        LEFT JOIN drivers d ON d.id = fd.driver_id
        LEFT JOIN sites s ON s.id = fd.site_id
        WHERE fd.order_id = %s
        ORDER BY fd.dispatched_at DESC
    """, (order_id,))
    row["dispatches"] = dispatches

    # Add sites
    sites = query("""
        SELECT s.id, s.name FROM order_sites os
        JOIN sites s ON s.id = os.site_id
        WHERE os.order_id = %s
    """, (order_id,))
    row["sites"] = sites
    return row


@router.get("/orders/{order_id}/report")
def order_report(order_id: int, user: dict = Depends(require_partner)):
    order = query_one("""
        SELECT o.*, c.name AS client_name
        FROM orders o LEFT JOIN clients c ON c.id = o.client_id
        WHERE o.id = %s
    """, (order_id,))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    dispatches = query("""
        SELECT fd.*, t.name AS truck_name, d.name AS driver_name, s.name AS site_name
        FROM fuel_dispatches fd
        LEFT JOIN trucks t ON t.id = fd.truck_id
        LEFT JOIN drivers d ON d.id = fd.driver_id
        LEFT JOIN sites s ON s.id = fd.site_id
        WHERE fd.order_id = %s AND fd.status = 'delivered'
        ORDER BY fd.delivered_at
    """, (order_id,))

    total_vol = sum(d["volume"] for d in dispatches)
    rows_html = "".join(f"""
        <tr>
          <td>{d['delivered_at'] or d['dispatched_at']}</td>
          <td>{d['site_name'] or ''}</td>
          <td>{d['truck_name'] or d['truck_temp'] or ''}</td>
          <td>{d['driver_name'] or d['driver_temp'] or ''}</td>
          <td>{d['ttn_number'] or ''}</td>
          <td>{d['volume']}</td>
        </tr>
    """ for d in dispatches)

    html = f"""<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8"><title>Отчёт #{order_id}</title>
<style>body{{font-family:Arial,sans-serif;padding:20px}}
table{{border-collapse:collapse;width:100%}}
th,td{{border:1px solid #ccc;padding:8px;text-align:left}}
th{{background:#f5f5f5}}</style></head>
<body>
<h2>Отчёт по заказу #{order['id']} — {order['client_name']}</h2>
<p>Дата оплаты: {order['paid_at']} | Объём заказа: {order.get('volume_ordered', '—')} куб</p>
<table>
<tr><th>Дата</th><th>Участок</th><th>Машина</th><th>Водитель</th><th>ТТН</th><th>Объём (куб)</th></tr>
{rows_html}
<tr><td colspan="5"><strong>ИТОГО</strong></td><td><strong>{total_vol}</strong></td></tr>
</table>
</body></html>"""
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.post("/orders", status_code=201)
def create_order(body: OrderCreate, user: dict = Depends(require_partner)):
    with get_db() as conn:
        row = execute("""
            INSERT INTO orders
                (client_id, paid_at, amount_paid, volume_ordered, price_per_liter,
                 delivery_type, notes, entered_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            body.client_id, body.paid_at, body.amount_paid, body.volume_ordered,
            body.price_per_liter, body.delivery_type, body.notes, user["id"]
        ), conn=conn, returning=True)

        if body.site_ids:
            for sid in body.site_ids:
                execute("INSERT INTO order_sites (order_id, site_id) VALUES (%s, %s)",
                        (row["id"], sid), conn=conn)

        log_action(conn, "orders", row["id"], "INSERT", user["id"], new_data=dict(row))
        conn.commit()
    return row


@router.put("/orders/{order_id}")
def update_order(order_id: int, body: OrderUpdate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT * FROM orders WHERE id = %s", (order_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")

    sets, params = [], []
    for field, val in body.model_dump(exclude_none=True, exclude={"site_ids"}).items():
        sets.append(f"{field} = %s")
        params.append(val)

    if sets:
        params.append(order_id)
        with get_db() as conn:
            row = execute(
                f"UPDATE orders SET {', '.join(sets)} WHERE id = %s RETURNING *",
                params, conn=conn, returning=True
            )
            if body.site_ids is not None:
                execute("DELETE FROM order_sites WHERE order_id = %s", (order_id,), conn=conn)
                for sid in body.site_ids:
                    execute("INSERT INTO order_sites (order_id, site_id) VALUES (%s, %s)",
                            (order_id, sid), conn=conn)
            log_action(conn, "orders", order_id, "UPDATE", user["id"],
                       old_data=dict(existing), new_data=dict(row))
            conn.commit()
        return row
    return existing


@router.put("/orders/{order_id}/reconcile")
def reconcile_order(order_id: int, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM orders WHERE id = %s", (order_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return execute(
        "UPDATE orders SET status='reconciled' WHERE id=%s RETURNING *",
        (order_id,), returning=True
    )


@router.put("/orders/{order_id}/close")
def close_order(order_id: int, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM orders WHERE id = %s", (order_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return execute(
        "UPDATE orders SET status='closed' WHERE id=%s RETURNING *",
        (order_id,), returning=True
    )
