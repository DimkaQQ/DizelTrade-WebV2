import hashlib
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .database import query_one, execute
from .config import settings

security = HTTPBearer()


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _resolve_api_token(raw_token: str):
    """Resolve a dtl_ prefixed API token to a user dict."""
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    row = query_one(
        """SELECT u.id, u.name, u.email, u.role, u.is_active
           FROM api_tokens at2
           JOIN users u ON u.id = at2.created_by
           WHERE at2.token_hash = %s AND at2.is_active = TRUE""",
        (token_hash,),
    )
    if row and row["is_active"]:
        # Update last_used_at async-style (fire and forget)
        try:
            execute("UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = %s", (token_hash,))
        except Exception:
            pass
        return dict(row)
    return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    # API token path
    if token.startswith("dtl_"):
        user = _resolve_api_token(token)
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid API token")
    # JWT path (existing)
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = query_one(
        "SELECT id, name, email, role, is_active FROM users WHERE id = %s",
        (int(user_id),)
    )
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_partner(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "partner":
        raise HTTPException(status_code=403, detail="Partners only")
    return user


def require_not_operator(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] == "operator":
        raise HTTPException(status_code=403, detail="Access denied")
    return user


def require_artem_or_partner(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] == "operator":
        raise HTTPException(status_code=403, detail="Access denied")
    return user
