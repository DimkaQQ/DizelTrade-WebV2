from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, dashboard, base, orders, fleet, reference, hire, income, expenses, debts, settings_router, notifications

app = FastAPI(title="DTL Management API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(base.router, prefix="/api/base", tags=["base"])
app.include_router(orders.router, prefix="/api", tags=["orders"])
app.include_router(fleet.router, prefix="/api", tags=["fleet"])
app.include_router(reference.router, prefix="/api", tags=["reference"])
app.include_router(hire.router, prefix="/api", tags=["hire"])
app.include_router(income.router, prefix="/api", tags=["income"])
app.include_router(expenses.router, prefix="/api", tags=["expenses"])
app.include_router(debts.router, prefix="/api", tags=["debts"])
app.include_router(settings_router.router, prefix="/api", tags=["settings"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
