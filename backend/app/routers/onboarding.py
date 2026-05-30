from fastapi import APIRouter, Depends
from ..database import query, execute
from ..deps import get_current_user

router = APIRouter()

STEPS_BY_ROLE = {
    "partner": [
        {"key": "setup_clients",    "label": "Настройте клиентов"},
        {"key": "add_trucks",       "label": "Добавьте машины"},
        {"key": "create_order",     "label": "Создайте заказ"},
        {"key": "view_analytics",   "label": "Посмотрите аналитику"},
        {"key": "invite_team",      "label": "Пригласите команду"},
    ],
    "artem": [
        {"key": "add_own_trucks",   "label": "Добавьте свои машины"},
        {"key": "first_trip",       "label": "Создайте первый рейс"},
        {"key": "check_balance",    "label": "Посмотрите баланс"},
        {"key": "cash_report",      "label": "Отчитайтесь по наличным"},
    ],
    "operator": [
        {"key": "first_receipt",    "label": "Создайте приёмку топлива"},
        {"key": "first_dispatch",   "label": "Создайте рейс на участок"},
        {"key": "check_stock",      "label": "Посмотрите остатки"},
    ],
}


@router.get("/onboarding")
def get_onboarding(user: dict = Depends(get_current_user)):
    role = user.get("role", "operator")
    steps = STEPS_BY_ROLE.get(role, STEPS_BY_ROLE["operator"])
    done_rows = query(
        "SELECT step_key FROM onboarding_progress WHERE user_id = %s",
        (user["id"],),
    )
    done_keys = {r["step_key"] for r in done_rows}
    return [
        {"key": s["key"], "label": s["label"], "done": s["key"] in done_keys}
        for s in steps
    ]


@router.post("/onboarding/{step_key}", status_code=200)
def complete_step(step_key: str, user: dict = Depends(get_current_user)):
    execute(
        """INSERT INTO onboarding_progress (user_id, step_key)
           VALUES (%s, %s) ON CONFLICT DO NOTHING""",
        (user["id"], step_key),
    )
    return {"ok": True}
