"""Security middleware and utilities."""
import time
import re
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# ── Rate limiter (in-memory, per IP) ─────────────────────────────────────────

_rate_lock = Lock()
_rate_store: dict[str, list[float]] = defaultdict(list)

RATE_LIMITS = {
    "/api/auth/login": (10, 60),     # 10 req / 60 sec
    "/api/auth/refresh": (30, 60),   # 30 req / 60 sec
    "default": (120, 60),            # 120 req / 60 sec
}


def _check_rate(ip: str, path: str) -> bool:
    limit, window = RATE_LIMITS.get(path, RATE_LIMITS["default"])
    now = time.time()
    with _rate_lock:
        hits = _rate_store[f"{ip}:{path}"]
        hits[:] = [t for t in hits if now - t < window]
        if len(hits) >= limit:
            return False
        hits.append(now)
    return True


# ── Login brute-force protection ──────────────────────────────────────────────

_bf_lock = Lock()
_bf_store: dict[str, list[float]] = defaultdict(list)  # email -> fail timestamps

MAX_FAILS = 5
LOCKOUT_SECONDS = 15 * 60  # 15 min


def record_login_fail(email: str) -> None:
    now = time.time()
    with _bf_lock:
        fails = _bf_store[email.lower()]
        fails[:] = [t for t in fails if now - t < LOCKOUT_SECONDS]
        fails.append(now)


def clear_login_fails(email: str) -> None:
    with _bf_lock:
        _bf_store.pop(email.lower(), None)


def is_locked_out(email: str) -> bool:
    now = time.time()
    with _bf_lock:
        fails = _bf_store.get(email.lower(), [])
        recent = [t for t in fails if now - t < LOCKOUT_SECONDS]
        _bf_store[email.lower()] = recent
        return len(recent) >= MAX_FAILS


# ── Password strength ─────────────────────────────────────────────────────────

def validate_password(password: str) -> str | None:
    """Return error message or None if OK."""
    if len(password) < 8:
        return "Пароль минимум 8 символов"
    if len(password) > 128:
        return "Пароль слишком длинный"
    return None


# ── Security headers middleware ───────────────────────────────────────────────

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "font-src 'self'; "
        "frame-ancestors 'none';"
    ),
}


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Block oversized requests (> 2MB)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 2 * 1024 * 1024:
            return JSONResponse({"detail": "Request too large"}, status_code=413)

        # Rate limiting (skip static files)
        if path.startswith("/api/"):
            if not _check_rate(ip, path):
                return JSONResponse(
                    {"detail": "Too many requests. Try again later."},
                    status_code=429,
                    headers={"Retry-After": "60"},
                )

        response = await call_next(request)

        # Add security headers to all responses
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value

        # HSTS only for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response
