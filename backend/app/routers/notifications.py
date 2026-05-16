from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import query, query_one, execute
from ..deps import get_current_user

router = APIRouter()


class PushSubscribeBody(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.post("/notifications/subscribe", status_code=201)
def subscribe(body: PushSubscribeBody, user: dict = Depends(get_current_user)):
    execute("""
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id, endpoint) DO NOTHING
    """, (user["id"], body.endpoint, body.p256dh, body.auth))
    return {"ok": True}


@router.delete("/notifications/subscribe")
def unsubscribe(endpoint: str, user: dict = Depends(get_current_user)):
    execute(
        "DELETE FROM push_subscriptions WHERE user_id = %s AND endpoint = %s",
        (user["id"], endpoint)
    )
    return {"ok": True}


@router.get("/notifications/test")
def test_notification(user: dict = Depends(get_current_user)):
    subs = query("SELECT * FROM push_subscriptions WHERE user_id = %s", (user["id"],))
    return {"subscriptions": len(subs), "message": "Push test — реализуется через web-push библиотеку"}
