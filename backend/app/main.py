from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import os
import logging
import time
from .config import settings
from .security import SecurityMiddleware
from .routers import auth, dashboard, base, orders, fleet, reference, hire, income, expenses, debts, settings_router, notifications, logs as logs_router, uploads as uploads_router
from .routers import analytics as analytics_router
from .routers import ai as ai_router
from .routers import tokens as tokens_router
from .routers import onboarding as onboarding_router

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "logs", "app.log")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("dtl.main")

app = FastAPI(title="DTL Management API", version="2.0.0", docs_url=None, redoc_url=None)

app.add_middleware(SecurityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
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
app.include_router(analytics_router.router, prefix="/api", tags=["analytics"])
app.include_router(logs_router.router, tags=["logs"])
app.include_router(uploads_router.router, prefix="/api", tags=["uploads"])
app.include_router(ai_router.router, prefix="/api", tags=["ai"])
app.include_router(tokens_router.router, prefix="/api", tags=["tokens"])
app.include_router(onboarding_router.router, prefix="/api", tags=["onboarding"])


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"CRASH {request.method} {request.url.path} → {type(exc).__name__}: {exc}")
        raise
    ms = int((time.time() - start) * 1000)
    if request.url.path.startswith("/api/") and response.status_code >= 400:
        logger.warning(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    elif request.url.path.startswith("/api/"):
        logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    return response


@app.get("/api/docs", include_in_schema=False)
def api_docs():
    return HTMLResponse("""<!DOCTYPE html>
<html><head>
<title>DTL API Docs</title>
<meta charset="utf-8">
<style>body{margin:0;padding:0}</style>
</head><body>
<script>
async function load() {
  const res = await fetch('/openapi.json');
  const spec = await res.json();
  document.body.innerHTML = '<div id="root"></div>';
  // Render simple docs without CDN
  const out = [];
  out.push('<div style="font-family:monospace;padding:24px;background:#111;color:#eee;min-height:100vh">');
  out.push('<h1 style="color:#c4b454">DTL Management API v2.0</h1>');
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      const color = {get:'#4ec9b0',post:'#c4b454',put:'#569cd6',patch:'#9cdcfe',delete:'#f44747'}[method]||'#eee';
      out.push('<div style="margin:12px 0;padding:12px;background:#1e1e1e;border-radius:6px;border-left:3px solid '+color+'">');
      out.push('<span style="color:'+color+';font-weight:700;text-transform:uppercase">'+method+'</span> ');
      out.push('<span style="color:#dcdcaa">'+path+'</span>');
      if (op.summary) out.push('<div style="color:#888;margin-top:4px;font-size:13px">'+op.summary+'</div>');
      if (op.tags) out.push('<div style="margin-top:4px">'+op.tags.map(t=>'<span style="background:#333;color:#9cdcfe;padding:2px 6px;border-radius:3px;font-size:11px;margin-right:4px">'+t+'</span>').join('')+'</div>');
      out.push('</div>');
    }
  }
  out.push('</div>');
  document.body.innerHTML = out.join('');
}
load();
</script>
</body></html>""", headers={"Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"})


@app.get("/openapi.json", include_in_schema=False)
def openapi_json():
    from fastapi.openapi.utils import get_openapi
    from fastapi.responses import JSONResponse
    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    return JSONResponse(schema)


@app.get("/api/health")
def health():
    from .database import query_one as db_q
    try:
        db_q("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "version": "2.0.0", "db": db_ok}


# Serve uploaded files (TTN photos etc.)
_uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

# Serve frontend static files
_frontend = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
_js_ver = str(int(time.time()))  # changes on every service restart

if os.path.isdir(_frontend):
    app.mount("/js", StaticFiles(directory=os.path.join(_frontend, "js")), name="js")

    @app.get("/manifest.json")
    def manifest():
        return FileResponse(os.path.join(_frontend, "manifest.json"))

    @app.get("/sw.js")
    def sw():
        return FileResponse(os.path.join(_frontend, "sw.js"))

    @app.get("/icon.png")
    def icon():
        icon_path = os.path.join(_frontend, "icon.png")
        if os.path.exists(icon_path):
            return FileResponse(icon_path)
        return FileResponse(os.path.join(_frontend, "manifest.json"))  # fallback

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        with open(os.path.join(_frontend, "index.html"), encoding="utf-8") as f:
            html = f.read()
        html = html.replace("/js/api.js", f"/js/api.js?v={_js_ver}")
        html = html.replace("/js/app.js", f"/js/app.js?v={_js_ver}")
        return HTMLResponse(html, headers={"Cache-Control": "no-store"})
