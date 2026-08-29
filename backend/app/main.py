"""
QueueSense — FastAPI Application Entry Point

Architecture: Modular monolith
- All services share one database transaction boundary
- REST for mutations/reads
- SSE for real-time push (server → client)
- RBAC enforced server-side on every mutating endpoint
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_db_connection, engine, Base

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    On startup: create database tables (if not using Alembic yet) and verify DB connection.
    On shutdown: cleanup.
    """
    logger.info("QueueSense starting up...")

    # Auto-create tables for development (use Alembic in production)
    if settings.ENVIRONMENT == "development":
        # Import all models to ensure they're registered with Base
        import app.models.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")

    if check_db_connection():
        logger.info("Database connection verified")
    else:
        logger.error("Database connection FAILED — check DATABASE_URL in .env")

    yield

    logger.info("QueueSense shutting down...")


# Create FastAPI application
app = FastAPI(
    title="QueueSense API",
    description="""
    Outpatient Wait-Time & Dynamic Queue Velocity Tracker

    Real-time, continuously self-correcting outpatient queue system.
    Tells every waiting patient how long they truly have left.

    **PS7 Hackathon Project** — designed with data-minimization and RBAC principles in mind.
    Not a clinical system. Does not diagnose. Does not store medical data.
    """,
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS middleware — allow configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global Exception Handlers ────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Catch-all: return a consistent error envelope.
    Never leak stack traces to clients.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An internal error occurred"}},
    )


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    """
    Health check endpoint.
    Returns OK if the application is running and connected to the database.
    Used by deployment platforms and for pre-demo verification.
    """
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "demo_mode": settings.DEMO_MODE,
    }


# ─── API Routes ───────────────────────────────────────────────────────────────
# Routes are registered after all imports to avoid circular imports.

from app.api.v1 import router as api_v1_router  # noqa: E402
app.include_router(api_v1_router, prefix="/api/v1")


# ─── Root Redirect ─────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    return {"message": "QueueSense API — see /api/docs for documentation"}
