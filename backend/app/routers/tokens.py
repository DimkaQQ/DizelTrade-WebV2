import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import query, query_one, execute
from ..deps import require_partner

router = APIRouter()


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


_VALID_SCOPES = {'read', 'write', 'full'}


class TokenCreate(BaseModel):
    name: str
    scope: str = 'full'


@router.post("/tokens", status_code=201)
def create_token(body: TokenCreate, user: dict = Depends(require_partner)):
    if not body.name or len(body.name) > 80:
        raise HTTPException(400, "Название токена обязательно (макс 80 символов)")
    if body.scope not in _VALID_SCOPES:
        raise HTTPException(400, "scope must be one of: read, write, full")
    raw = "dtl_" + secrets.token_hex(32)
    hashed = _hash_token(raw)
    row = execute(
        """INSERT INTO api_tokens (name, token_hash, created_by, scope)
           VALUES (%s, %s, %s, %s) RETURNING id, name, scope, created_at""",
        (body.name.strip(), hashed, user["id"], body.scope),
        returning=True,
    )
    return {"id": row["id"], "name": row["name"], "scope": row["scope"], "created_at": str(row["created_at"]), "token": raw}


@router.get("/tokens")
def list_tokens(user: dict = Depends(require_partner)):
    return query(
        """SELECT id, name, scope, created_at, last_used_at, is_active
           FROM api_tokens WHERE created_by = %s ORDER BY created_at DESC""",
        (user["id"],),
    )


@router.delete("/tokens/{token_id}", status_code=200)
def revoke_token(token_id: int, user: dict = Depends(require_partner)):
    row = query_one("SELECT id FROM api_tokens WHERE id = %s AND created_by = %s", (token_id, user["id"]))
    if not row:
        raise HTTPException(404, "Токен не найден")
    execute("UPDATE api_tokens SET is_active = FALSE WHERE id = %s", (token_id,))
    return {"ok": True}
