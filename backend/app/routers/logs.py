import logging
import os
from fastapi import APIRouter, Request, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional
from ..deps import get_current_user

router = APIRouter()

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "logs", "app.log")
logger = logging.getLogger("dtl.client")


class FrontendLog(BaseModel):
    level: str  # "error" | "warn" | "info"
    message: str
    stack: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None


@router.post("/api/logs/client")
async def receive_client_log(entry: FrontendLog, request: Request):
    ua = request.headers.get("user-agent", "")
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?")
    lvl = entry.level.upper()
    msg = f"[FRONTEND/{lvl}] {entry.message}"
    if entry.url:
        msg += f" | url={entry.url}"
    if entry.stack:
        msg += f"\n  stack: {entry.stack[:600]}"
    if lvl == "ERROR":
        logger.error(msg + f" | ip={ip}")
    elif lvl == "WARN":
        logger.warning(msg + f" | ip={ip}")
    else:
        logger.info(msg + f" | ip={ip}")
    return {"ok": True}


@router.get("/api/logs/tail", response_class=PlainTextResponse)
async def tail_logs(n: int = 100, user=Depends(get_current_user)):
    if user.get("role") != "partner":
        return "403 Forbidden"
    try:
        with open(LOG_PATH, encoding="utf-8") as f:
            lines = f.readlines()
        return "".join(lines[-n:])
    except FileNotFoundError:
        return "(log file empty)"
