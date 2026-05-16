from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import query, query_one, execute
from ..deps import require_partner

router = APIRouter()


class SettingUpdate(BaseModel):
    value: str


@router.get("/settings")
def get_settings(user: dict = Depends(require_partner)):
    return query("SELECT key, value, updated_at FROM settings ORDER BY key")


@router.put("/settings/{key}")
def update_setting(key: str, body: SettingUpdate, user: dict = Depends(require_partner)):
    existing = query_one("SELECT key FROM settings WHERE key = %s", (key,))
    if not existing:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return execute(
        "UPDATE settings SET value=%s, updated_by=%s, updated_at=NOW() WHERE key=%s RETURNING *",
        (body.value, user["id"], key), returning=True
    )
