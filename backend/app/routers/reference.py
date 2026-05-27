from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import query, query_one, execute
from ..deps import get_current_user, require_partner

router = APIRouter()


# ── Sites ─────────────────────────────────────────────────────────────────────

class SiteCreate(BaseModel):
    name: str
    is_active: bool = True


@router.get("/sites")
def list_sites(user: dict = Depends(get_current_user)):
    return query("SELECT * FROM sites ORDER BY name")


@router.post("/sites", status_code=201)
def create_site(body: SiteCreate, user: dict = Depends(require_partner)):
    return execute(
        "INSERT INTO sites (name, is_active) VALUES (%s, %s) RETURNING *",
        (body.name, body.is_active), returning=True
    )


@router.put("/sites/{site_id}")
def update_site(site_id: int, body: SiteCreate, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM sites WHERE id = %s", (site_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Site not found")
    return execute(
        "UPDATE sites SET name=%s, is_active=%s WHERE id=%s RETURNING *",
        (body.name, body.is_active, site_id), returning=True
    )


# ── Tariffs ───────────────────────────────────────────────────────────────────

class TariffCreate(BaseModel):
    site_id: int
    truck_owner: str  # DTL | Артём | наёмная
    amount: float
    valid_from: Optional[str] = None  # DATE string YYYY-MM-DD
    comment: Optional[str] = None


@router.get("/tariffs")
def list_tariffs(
    site_id: Optional[int] = None,
    truck_owner: Optional[str] = None,
    latest: bool = False,
    user: dict = Depends(get_current_user),
):
    """Return tariffs. With latest=true returns only the current active tariff per site."""
    if latest and site_id:
        # Return the most recent tariff valid on or before today
        parts = ["t.site_id = %s", "t.valid_from <= CURRENT_DATE"]
        params = [site_id]
        if truck_owner:
            parts.append("t.truck_owner = %s")
            params.append(truck_owner)
        where = " AND ".join(parts)
        row = query_one(f"""
            SELECT t.*, s.name AS site_name
            FROM tariffs t LEFT JOIN sites s ON s.id = t.site_id
            WHERE {where} ORDER BY t.valid_from DESC LIMIT 1
        """, params)
        return row or {}

    parts = ["1=1"]
    params = []
    if site_id:
        parts.append("t.site_id = %s")
        params.append(site_id)
    if truck_owner:
        parts.append("t.truck_owner = %s")
        params.append(truck_owner)
    where = " AND ".join(parts)
    return query(f"""
        SELECT t.*, s.name AS site_name
        FROM tariffs t LEFT JOIN sites s ON s.id = t.site_id
        WHERE {where} ORDER BY s.name, t.valid_from DESC
    """, params)


@router.post("/tariffs", status_code=201)
def create_tariff(body: TariffCreate, user: dict = Depends(require_partner)):
    return execute(
        "INSERT INTO tariffs (site_id, truck_owner, amount, valid_from, comment) VALUES (%s, %s, %s, %s, %s) RETURNING *",
        (body.site_id, body.truck_owner, body.amount,
         body.valid_from or "today", body.comment), returning=True
    )


@router.put("/tariffs/{tariff_id}")
def update_tariff(tariff_id: int, body: TariffCreate, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM tariffs WHERE id = %s", (tariff_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Tariff not found")
    return execute(
        "UPDATE tariffs SET site_id=%s, truck_owner=%s, amount=%s, valid_from=%s, comment=%s, updated_at=NOW() WHERE id=%s RETURNING *",
        (body.site_id, body.truck_owner, body.amount,
         body.valid_from or "today", body.comment, tariff_id), returning=True
    )


# ── Carriers ──────────────────────────────────────────────────────────────────

class CarrierCreate(BaseModel):
    name: str
    is_active: bool = True


@router.get("/carriers")
def list_carriers(user: dict = Depends(get_current_user)):
    return query("SELECT * FROM carriers WHERE is_active = TRUE ORDER BY name")


@router.post("/carriers", status_code=201)
def create_carrier(body: CarrierCreate, user: dict = Depends(require_partner)):
    return execute(
        "INSERT INTO carriers (name, is_active) VALUES (%s, %s) RETURNING *",
        (body.name, body.is_active), returning=True
    )


@router.put("/carriers/{carrier_id}")
def update_carrier(carrier_id: int, body: CarrierCreate, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM carriers WHERE id = %s", (carrier_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return execute(
        "UPDATE carriers SET name=%s, is_active=%s WHERE id=%s RETURNING *",
        (body.name, body.is_active, carrier_id), returning=True
    )


# ── Suppliers ─────────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    is_active: bool = True


@router.get("/suppliers")
def list_suppliers(user: dict = Depends(get_current_user)):
    return query("SELECT * FROM suppliers ORDER BY name")


@router.post("/suppliers", status_code=201)
def create_supplier(body: SupplierCreate, user: dict = Depends(require_partner)):
    return execute(
        "INSERT INTO suppliers (name, is_active) VALUES (%s, %s) RETURNING *",
        (body.name, body.is_active), returning=True
    )


@router.put("/suppliers/{supplier_id}")
def update_supplier(supplier_id: int, body: SupplierCreate, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM suppliers WHERE id = %s", (supplier_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return execute(
        "UPDATE suppliers SET name=%s, is_active=%s WHERE id=%s RETURNING *",
        (body.name, body.is_active, supplier_id), returning=True
    )


# ── Clients ───────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    notes: Optional[str] = None


@router.get("/clients")
def list_clients(user: dict = Depends(get_current_user)):
    return query("SELECT * FROM clients ORDER BY name")


@router.post("/clients", status_code=201)
def create_client(body: ClientCreate, user: dict = Depends(require_partner)):
    return execute(
        "INSERT INTO clients (name, notes) VALUES (%s, %s) RETURNING *",
        (body.name, body.notes), returning=True
    )


@router.put("/clients/{client_id}")
def update_client(client_id: int, body: ClientCreate, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM clients WHERE id = %s", (client_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return execute(
        "UPDATE clients SET name=%s, notes=%s WHERE id=%s RETURNING *",
        (body.name, body.notes, client_id), returning=True
    )
