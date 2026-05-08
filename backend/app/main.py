from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db import session
from app.models import models
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.crud.crud import UserCRUD
from app.schemas.schemas import UserCreate
from app.models.models import UserRole, BlacklistedToken, BulkBatch
from app.api.routes import auth, users, degrees, telegram, degrees_bulk
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.security_headers import SecurityHeadersMiddleware

configure_logging()

logger = logging.getLogger(__name__)


INSECURE_SECRETS = {"change-me-in-production", "your-secret-key-change-in-production", ""}
INSECURE_PASSWORDS = {"123", "admin", "password", "changeme", "REPLACE_ME_IN_ENV", ""}


def _enforce_production_security() -> None:
    """Refuse to boot with dev-only secrets / wildcard trust in production."""
    if settings.ENVIRONMENT.lower() != "production":
        return
    problems = []
    if settings.SECRET_KEY in INSECURE_SECRETS or len(settings.SECRET_KEY) < 32:
        problems.append("SECRET_KEY is unset, too short, or a known default")
    if settings.SUPERADMIN_PASSWORD in INSECURE_PASSWORDS or len(settings.SUPERADMIN_PASSWORD) < 12:
        problems.append("SUPERADMIN_PASSWORD is weak or a known default")
    if "*" in settings.BACKEND_CORS_ORIGINS:
        problems.append("BACKEND_CORS_ORIGINS must not be '*' in production")
    if "*" in settings.ALLOWED_HOSTS:
        problems.append("ALLOWED_HOSTS must not be '*' in production")
    if settings.ALLOW_SELF_SERVE_PASSWORD_RESET:
        problems.append(
            "ALLOW_SELF_SERVE_PASSWORD_RESET must be false in production "
            "(wire up email-token-based reset instead)"
        )
    if problems:
        raise RuntimeError(
            "Refusing to start in production with insecure config: "
            + "; ".join(problems)
        )


async def _reconcile_blacklist_indexes(db) -> None:
    """Drop any pre-existing `expires_at` index on blacklisted_tokens that was
    created before we switched to a TTL index. Mongo refuses to redefine an
    index with different options, so we must drop-then-recreate. Safe to run
    on every boot — Beanie will (re)create the correct TTL index immediately
    after init_beanie() runs.
    """
    try:
        existing = await db["blacklisted_tokens"].index_information()
    except Exception as exc:  # collection may not exist yet on a fresh DB
        logger.debug("blacklisted_tokens index_information skipped: %s", exc)
        return

    for name, spec in existing.items():
        if name == "_id_":
            continue
        keys = spec.get("key", [])
        # Drop any `expires_at` index that is NOT already a TTL index.
        if any(k[0] == "expires_at" for k in keys) and "expireAfterSeconds" not in spec:
            try:
                await db["blacklisted_tokens"].drop_index(name)
                logger.info("Dropped stale non-TTL index '%s' on blacklisted_tokens", name)
            except Exception as exc:
                logger.warning("Could not drop index '%s': %s", name, exc)


import asyncio as _asyncio



# Weekly reminder task removed



@asynccontextmanager
async def lifespan(app: FastAPI):
    global _reminder_task
    # Startup
    # _enforce_production_security()
    logger.info("Starting Altrium - Degree Verification System...")
    # initialize Mongo client
    session.init_db()
    client: AsyncIOMotorClient = session.client  # type: ignore
    db = client[settings.MONGODB_DB]
    # Drop legacy non-TTL indexes BEFORE Beanie tries to (re)create them.
    await _reconcile_blacklist_indexes(db)
    # initialize beanie with our document models
    await init_beanie(database=db, document_models=[models.User, models.Credential, models.BlacklistedToken, BulkBatch])


    # Seed a generic Superadmin
    try:
        superadmin_email = settings.SUPERADMIN_EMAIL
        super_existing = await UserCRUD.get_by_email(superadmin_email)
        if not super_existing:
            seeded_super = await UserCRUD.create(
                UserCreate(
                    email=superadmin_email,
                    password=settings.SUPERADMIN_PASSWORD,
                    full_name="Platform Superadmin",
                    role=UserRole.SUPERADMIN,
                )
            )
            seeded_super.is_legal_admin_verified = True
            await seeded_super.save()
            logger.info("Seeded superadmin user: %s", superadmin_email)
    except Exception as e:

        # Don't crash startup if seeding fails (e.g., transient DB issues)
        logger.error("Admin seeding failed: %s", str(e))

    # Start the weekly reminder background task
    # _reminder_task = _asyncio.create_task(_weekly_pending_reminder_loop())
    logger.info("📱 Notification service initialized (Telegram %s)",
                "active" if settings.TELEGRAM_BOT_TOKEN else "not configured")
                
    if settings.TELEGRAM_BOT_TOKEN and settings.WEBHOOK_HOST:
        from app.services.telegram_bot import service as tg_service
        webhook_url = f"{settings.WEBHOOK_HOST}{settings.API_V1_STR}/telegram/webhook/{settings.TELEGRAM_BOT_TOKEN}"
        await tg_service.set_webhook(webhook_url)
    
    yield
    
    # Shutdown
    if _reminder_task:
        _reminder_task.cancel()
        try:
            await _reminder_task
        except _asyncio.CancelledError:
            pass
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Add SlowAPI exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Industry-Grade Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# Add CORS middleware (must come before routes so preflight OPTIONS works)

app.add_middleware(
    CORSMiddleware,

    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(degrees_bulk.router)
app.include_router(degrees.router)
app.include_router(telegram.router)

# Serve static files (logos, docs)
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

register_exception_handlers(app)

@app.get("/")
def root():
    return {
        "message": "Altrium - Degree Verification System API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs"
    }

@app.get("/ping")
def ping():
    return {"message": "pong", "status": "ok"}

@app.get("/health")
async def health_check():
    """Health check endpoint that verifies MongoDB connection"""
    try:
        # Test MongoDB connection
        from app.models.models import User
        test_count = await User.find().count()
        return {
            "status": "healthy",
            "database": "mongodb",
            "connection": "active",
            "users_count": test_count
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/api/v1/test/crud")
async def test_crud_operations(test_email: str = "test@example.com"):
    """Test CRUD operations with MongoDB"""
    from app.models.models import User
    from app.crud.crud import UserCRUD
    from app.schemas.schemas import UserCreate
    from uuid import uuid4
    
    test_result = {
        "create": None,
        "read": None,
        "update": None,
        "delete": None,
        "status": "success"
    }
    
    try:
        # CREATE
        unique_email = f"test_{uuid4().hex[:8]}@example.com"
        user_create = UserCreate(
            email=unique_email,
            password="Test123!",
            full_name="Test User",
            role="STUDENT"
        )
        test_user = await UserCRUD.create(user_create)
        test_result["create"] = {
            "success": True,
            "user_id": str(test_user.id),
            "email": test_user.email
        }
        
        # READ
        fetched = await UserCRUD.get_by_id(test_user.id)
        test_result["read"] = {
            "success": fetched is not None,
            "email": fetched.email if fetched else None
        }
        
        # UPDATE
        from app.schemas.schemas import UserUpdate
        user_update = UserUpdate(role="STUDENT")
        updated = await UserCRUD.update(test_user.id, user_update)
        test_result["update"] = {
            "success": updated is not None,
            "new_role": updated.role if updated else None
        }
        
        # DELETE
        await UserCRUD.delete(test_user.id)
        verify_deleted = await UserCRUD.get_by_id(test_user.id)
        test_result["delete"] = {"success": verify_deleted is None}
        
    except Exception as e:
        logger.error(f"CRUD test failed: {str(e)}")
        test_result["status"] = "failed"
        test_result["error"] = str(e)
    
    return test_result
