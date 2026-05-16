from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .database import query_one
from .config import settings

security = HTTPBearer()


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
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
