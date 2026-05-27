from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from ..database import query, query_one, execute
from ..deps import get_current_user
import os, json, logging

router = APIRouter()
logger = logging.getLogger("dtl.push")

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS      = {"sub": "mailto:admin@dizeltrade.ru"}


def _send_push(endpoint: str, p256dh: str, auth: str, title: str, body: str, url: str = "/"):
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return
    try:
        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
        )
    except Exception as e:
        logger.warning(f"Push failed for {endpoint[:40]}: {e}")


def push_to_role(role: str, title: str, body: str, url: str = "/", bg: BackgroundTasks = None):
    """Send push to all subscriptions for users with given role."""
    subs = query(
        "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id WHERE u.role = %s AND u.is_active = TRUE",
        (role,),
    )
    for s in subs:
        if bg:
            bg.add_task(_send_push, s["endpoint"], s["p256dh"], s["auth"], title, body, url)
        else:
            _send_push(s["endpoint"], s["p256dh"], s["auth"], title, body, url)


class PushSubscribeBody(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.post("/notifications/subscribe", status_code=201)
def subscribe(body: PushSubscribeBody, user: dict = Depends(get_current_user)):
    execute("""
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
    """, (user["id"], body.endpoint, body.p256dh, body.auth))
    return {"ok": True}


@router.delete("/notifications/subscribe")
def unsubscribe(endpoint: str, user: dict = Depends(get_current_user)):
    execute(
        "DELETE FROM push_subscriptions WHERE user_id = %s AND endpoint = %s",
        (user["id"], endpoint)
    )
    return {"ok": True}


@router.get("/notifications/vapid-public-key")
def vapid_public_key():
    return {"key": VAPID_PUBLIC_KEY}


@router.post("/notifications/test")
def test_notification(bg: BackgroundTasks, user: dict = Depends(get_current_user)):
    subs = query("SELECT * FROM push_subscriptions WHERE user_id = %s", (user["id"],))
    for s in subs:
        bg.add_task(_send_push, s["endpoint"], s["p256dh"], s["auth"], "DTL · Тест", "Уведомления работают ✅", "/")
    return {"sent": len(subs)}
