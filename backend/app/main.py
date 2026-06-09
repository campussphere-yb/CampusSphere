# main.py — CampusSphere API entry point.
#
# Responsibilities:
#   1. Create the FastAPI app instance with metadata.
#   2. Register CORS middleware so the React frontend can call the API.
#   3. Import all models so SQLAlchemy knows about them before create_all().
#   4. Create all database tables on startup (dev only — use Alembic in production).
#   5. Mount all routers under /api/v1.
#
# Run with:
#   .venv\Scripts\python.exe -m uvicorn app.main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine

# ── Import all models (required before create_all) ────────────────────────────
from app.models import (  # noqa: F401
    user,
    department,
    source,
    connector,
    mention,
    alert,
    suggested_response,
    summary,
    tracking_keyword,
)

# ── Import all routers ────────────────────────────────────────────────────────
from app.routers import (
    users,
    departments,
    sources,
    connectors,
    mentions,
    alerts,
    suggested_responses,
    summaries,
    ai,
    dashboard,
    tracking,
)

# ── Create database tables ────────────────────────────────────────────────────
# Safe to call repeatedly — SQLAlchemy skips tables that already exist.
# Switch to Alembic migrations before going to production.
Base.metadata.create_all(bind=engine)

# ── Auto-seed BU demo data ────────────────────────────────────────────────────
# Runs once on every cold start. seed_if_empty() checks for existing mentions
# before inserting — safe to call on every startup, never duplicates rows.
# This keeps Railway's ephemeral SQLite populated after each redeploy.
from app.seed import seed_if_empty          # noqa: E402
from app.database import SessionLocal       # noqa: E402

_db = SessionLocal()
try:
    seed_if_empty(_db)
except Exception as _seed_err:          # noqa: BLE001
    print(f"[seed] ERROR — seed_if_empty() failed: {_seed_err}")
    _db.rollback()
finally:
    _db.close()

# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "CampusSphere — AI-powered mention monitoring and risk dashboard for universities. "
        "Tracks mentions across social and news platforms, scores sentiment and risk, "
        "generates alerts, and suggests responses."
    ),
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, set the CORS_ORIGINS env var to your Netlify URL:
#   CORS_ORIGINS=https://campussphere.netlify.app
# Multiple origins: comma-separated, no spaces.
# Falls back to localhost origins for local development.
import os as _os
_raw_origins = _os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)
_allow_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ─────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(users.router,               prefix=API_PREFIX)
app.include_router(departments.router,         prefix=API_PREFIX)
app.include_router(sources.router,             prefix=API_PREFIX)
app.include_router(connectors.router,          prefix=API_PREFIX)
app.include_router(mentions.router,            prefix=API_PREFIX)
app.include_router(alerts.router,              prefix=API_PREFIX)
app.include_router(suggested_responses.router, prefix=API_PREFIX)
app.include_router(summaries.router,           prefix=API_PREFIX)
app.include_router(ai.router,                  prefix=API_PREFIX)
app.include_router(dashboard.router,           prefix=API_PREFIX)
app.include_router(tracking.router,            prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
