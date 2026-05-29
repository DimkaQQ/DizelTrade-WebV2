import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Cookie, Response, Depends
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext

from ..database import query_one, query, execute, get_db
from ..config import settings
from ..deps import get_current_user
from ..security import (
    is_locked_out, record_login_fail, clear_login_fails, validate_password
)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    login: str   # email
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/login", status_code=200)
def login(body: LoginRequest, response: Response):
    email = body.login.strip().lower()

    if is_locked_out(email):
        raise HTTPException(status_code=429, detail="Слишком много попыток. Подождите 15 минут.")

    user = query_one(
        "SELECT id, name, email, phone, password_hash, role, is_active FROM users WHERE lower(email) = %s",
        (email,)
    )
    if not user or not user["is_active"]:
        record_login_fail(email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(body.password, user["password_hash"]):
        record_login_fail(email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    clear_login_fails(email)

    # Update last_login_at
    execute(
        "UPDATE users SET last_login_at = NOW() WHERE id = %s",
        (user["id"],)
    )

    # Log successful attempt
    execute(
        "INSERT INTO login_attempts (ip, username_tried, success) VALUES (%s, %s, TRUE)",
        ("unknown", email)
    )

    # Create access token
    access_token = create_access_token(user["id"], user["role"])

    # Create refresh token
    raw_refresh = secrets.token_hex(32)
    refresh_hash = pwd_context.hash(raw_refresh)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    # Clean up expired tokens
    execute("DELETE FROM refresh_tokens WHERE expires_at < NOW()")

    execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
        (user["id"], refresh_hash, expires_at)
    )

    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth",
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        }
    }


@router.post("/logout", status_code=200)
def logout(response: Response, refresh_token: Optional[str] = Cookie(None)):
    if refresh_token:
        _delete_refresh_token(refresh_token)
    response.delete_cookie(key="refresh_token", path="/api/auth")
    return {"message": "Logged out"}


def _delete_refresh_token(raw_token: str):
    """Find and delete a refresh token by comparing raw value against stored hashes."""
    # Fetch recent tokens (we keep window small with expires check)
    from ..database import query, execute as db_execute
    tokens = query("SELECT id, token_hash FROM refresh_tokens WHERE expires_at > NOW()")
    for tok in tokens:
        try:
            if pwd_context.verify(raw_token, tok["token_hash"]):
                db_execute("DELETE FROM refresh_tokens WHERE id = %s", (tok["id"],))
                return
        except Exception:
            continue


@router.post("/refresh", status_code=200)
def refresh(refresh_token: Optional[str] = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    from ..database import query, execute as db_execute
    tokens = query(
        "SELECT rt.id, rt.user_id, rt.token_hash, u.role, u.is_active "
        "FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id "
        "WHERE rt.expires_at > NOW()"
    )

    matched = None
    for tok in tokens:
        try:
            if pwd_context.verify(refresh_token, tok["token_hash"]):
                matched = tok
                break
        except Exception:
            continue

    if not matched:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if not matched["is_active"]:
        raise HTTPException(status_code=401, detail="User inactive")

    access_token = create_access_token(matched["user_id"], matched["role"])
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", status_code=200)
def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/change-password", status_code=200)
def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db_user = query_one(
        "SELECT password_hash FROM users WHERE id = %s",
        (user["id"],)
    )
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(body.old_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    err = validate_password(body.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    new_hash = pwd_context.hash(body.new_password)
    execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (new_hash, user["id"])
    )
    return {"message": "Password changed"}


@router.get("/sessions")
def list_sessions(user: dict = Depends(get_current_user)):
    """List active sessions for current user."""
    return query(
        """SELECT id::text, ip, user_agent, created_at, last_used_at
           FROM user_sessions
           WHERE user_id = %s AND is_active = TRUE
           ORDER BY last_used_at DESC""",
        (user["id"],),
    )


@router.delete("/sessions/{session_id}", status_code=200)
def revoke_session(session_id: str, user: dict = Depends(get_current_user)):
    from ..database import execute as db_execute
    row = query_one(
        "SELECT id FROM user_sessions WHERE id::text = %s AND user_id = %s",
        (session_id, user["id"]),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    db_execute(
        "UPDATE user_sessions SET is_active = FALSE WHERE id::text = %s",
        (session_id,),
    )
    return {"ok": True}
