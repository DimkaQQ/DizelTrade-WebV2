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
    from fastapi.responses import HTMLResponse
    from datetime import datetime as _dt

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
        ORDER BY fd.delivered_at, fd.dispatched_at
    """, (order_id,))

    def fmt_date(val):
        if not val:
            return "—"
        try:
            if hasattr(val, "strftime"):
                return val.strftime("%d.%m.%Y")
            return str(val)[:10].replace("-", ".")
        except Exception:
            return str(val)

    total_vol = float(sum(d["volume"] for d in dispatches))
    vol_ordered = float(order.get("volume_ordered") or 0)
    pct = round(total_vol / vol_ordered * 100) if vol_ordered else 0

    rows_html = "".join(f"""<tr>
      <td>{i+1}</td>
      <td>{fmt_date(d['delivered_at'] or d['dispatched_at'])}</td>
      <td>{d['site_name'] or '—'}</td>
      <td>{d['truck_name'] or d['truck_temp'] or '—'}</td>
      <td>{d['driver_name'] or d['driver_temp'] or '—'}</td>
      <td>{d['ttn_number'] or '—'}</td>
      <td style="text-align:right;font-weight:600">{d['volume']}</td>
    </tr>""" for i, d in enumerate(dispatches))

    now_str = _dt.now().strftime("%d.%m.%Y %H:%M")

    html = f"""<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8"><title>Акт сверки — {order['client_name']}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,Arial,sans-serif;color:#111;padding:18mm 18mm 12mm;font-size:12px}}
.header{{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}}
.logo{{font-size:22px;font-weight:900;letter-spacing:-1px}}
.logo-sub{{font-size:10px;color:#666;margin-top:2px}}
.meta{{font-size:11px;color:#666;text-align:right}}
h1{{font-size:17px;font-weight:700;margin:4px 0 0}}
.info-grid{{display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap}}
.info-box{{flex:1;min-width:100px;background:#f5f5f5;border-radius:8px;padding:10px 12px}}
.info-box .lbl{{font-size:10px;color:#888;margin-bottom:2px;text-transform:uppercase}}
.info-box .val{{font-size:14px;font-weight:700}}
table{{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}}
th{{background:#f2f2f2;border:1px solid #bbb;padding:7px 8px;text-align:left;font-weight:600}}
td{{border:1px solid #ddd;padding:6px 8px;vertical-align:top}}
tr:nth-child(even) td{{background:#fafafa}}
.total-row td{{background:#e8e8e8;font-weight:700;border:1px solid #bbb;font-size:12px}}
.pbar-track{{height:8px;background:#eee;border-radius:4px;overflow:hidden;margin-bottom:18px;margin-top:4px}}
.pbar-fill{{height:100%;background:#c8ff00;border-radius:4px}}
.sign-area{{display:flex;gap:40px;margin-top:32px}}
.sign-box .sign-line{{border-top:1px solid #555;margin-top:32px;font-size:10px;color:#666;padding-top:4px}}
.footer{{margin-top:16px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px;display:flex;justify-content:space-between}}
.print-bar{{margin-bottom:14px;display:flex;gap:8px}}
.pbtn{{background:#c8ff00;border:none;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;border-radius:6px}}
.cbtn{{background:#f0f0f0;border:none;padding:9px 14px;font-size:12px;cursor:pointer;border-radius:6px;color:#666}}
@media print{{.print-bar{{display:none}}@page{{margin:10mm 12mm;size:A4}}}}
</style></head>
<body>
<div class="header">
  <div><div class="logo">DIZELTRADE</div><div class="logo-sub">Diesel Trade Logistic</div>
  <h1>Акт сверки · Заказ #{order['id']}</h1></div>
  <div class="meta">Сформировано: {now_str}<br>ДТЛ Менеджмент v2.0</div>
</div>
<div class="print-bar">
  <button class="pbtn" onclick="window.print()">🖨 Печать / Сохранить PDF</button>
  <button class="cbtn" onclick="window.close()">✕ Закрыть</button>
</div>
<div class="info-grid">
  <div class="info-box"><div class="lbl">Клиент</div><div class="val">{order['client_name']}</div></div>
  <div class="info-box"><div class="lbl">Дата оплаты</div><div class="val">{fmt_date(order['paid_at'])}</div></div>
  <div class="info-box"><div class="lbl">Заказано</div><div class="val">{vol_ordered:.0f} куб</div></div>
  <div class="info-box"><div class="lbl">Доставлено</div><div class="val" style="color:#1a7a1a">{total_vol:.1f} куб</div></div>
  <div class="info-box"><div class="lbl">Выполнение</div><div class="val">{pct}%</div></div>
</div>
<div class="pbar-track"><div class="pbar-fill" style="width:{min(pct,100)}%"></div></div>
<table>
<thead><tr><th>#</th><th>Дата доставки</th><th>Участок</th><th>Машина</th><th>Водитель</th><th>ТТН №</th><th>Объём (куб)</th></tr></thead>
<tbody>{rows_html}</tbody>
<tfoot><tr class="total-row"><td colspan="6" style="text-align:right">ИТОГО ДОСТАВЛЕНО:</td><td style="text-align:right">{total_vol:.1f} куб</td></tr></tfoot>
</table>
<div class="sign-area">
  <div class="sign-box" style="flex:1"><div class="sign-line">Представитель ООО «ДТЛ» / Подпись / Дата</div></div>
  <div class="sign-box" style="flex:1"><div class="sign-line">Клиент / Подпись / Дата</div></div>
</div>
<div class="footer">
  <span>ООО «ДТЛ» · Сперанский В.А. · Diesel Trade Logistic</span>
  <span>г. Тында · {now_str}</span>
</div>
</body></html>"""
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
