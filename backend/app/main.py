"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.config import get_settings
from app.middleware import (
    ApiKeyAuthMiddleware,
    AuditLoggingMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
)
from app.routes import router
from app.routes_environments import router as environments_router
from app.routes_pipelines import router as pipelines_router

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.env == "development" else logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s v%s on port %d (env=%s, security=%s, mock_mode=%s)",
        settings.app_name, settings.app_version, settings.port,
        settings.env, settings.security_enabled, settings.is_mock_mode,
    )
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title="Infra Portal API",
    description="Self-service infrastructure provisioning — PR-based workflow",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- Middleware (added bottom-up: last added = outermost) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-Id"],
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)
app.add_middleware(ApiKeyAuthMiddleware)
app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# --- Routes ---
app.include_router(router, prefix="/api/v1")
app.include_router(environments_router, prefix="/api/v1")
app.include_router(pipelines_router, prefix="/api/v1")


# ─────────────────────────────────────────────────────────────────────
#  Health / Info (Spring Actuator-compatible — for k8s probes & ALB)
# ─────────────────────────────────────────────────────────────────────

@app.get("/actuator/health", tags=["system"])
@app.get("/actuator/health/liveness", tags=["system"])
@app.get("/actuator/health/readiness", tags=["system"])
async def actuator_health():
    return {"status": "UP"}


@app.get("/actuator/info", tags=["system"])
async def actuator_info():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "framework": "FastAPI",
        "env": settings.env,
        "mock_mode": settings.is_mock_mode,
    }


# ─────────────────────────────────────────────────────────────────────
#  RFC 7807 Problem Detail exception handlers
# ─────────────────────────────────────────────────────────────────────

_TITLES = {
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    409: "Conflict", 422: "Unprocessable Entity", 429: "Too Many Requests",
    500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable",
}


def _problem(status: int, title: str, detail: str,
             type_: str = "about:blank", **extra) -> JSONResponse:
    body = {
        "type": type_,
        "title": title,
        "status": status,
        "detail": detail,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **extra,
    }
    return JSONResponse(status_code=status, content=body, media_type="application/problem+json")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return _problem(
        status=exc.status_code,
        title=_TITLES.get(exc.status_code, "Error"),
        detail=detail,
        type_=f"urn:problem-type:{exc.status_code}",
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    field_errors = {
        ".".join(str(loc) for loc in e["loc"] if loc != "body"): e["msg"]
        for e in exc.errors()
    }
    return _problem(
        status=422,
        title="Validation Error",
        detail="Request payload validation failed",
        type_="urn:problem-type:validation-error",
        fieldErrors=field_errors,
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
    field_errors = {
        ".".join(str(loc) for loc in e["loc"]): e["msg"]
        for e in exc.errors()
    }
    return _problem(
        status=400,
        title="Validation Error",
        detail="Validation failed",
        type_="urn:problem-type:validation-error",
        fieldErrors=field_errors,
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return _problem(
        status=400,
        title="Bad Request",
        detail=str(exc),
        type_="urn:problem-type:bad-request",
    )


@app.exception_handler(IOError)
async def io_error_handler(request: Request, exc: IOError) -> JSONResponse:
    logger.error("I/O error: %s", exc)
    return _problem(
        status=502,
        title="External Service Error",
        detail="An external service is unreachable. Please retry.",
        type_="urn:problem-type:external-service-error",
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return _problem(
        status=500,
        title="Internal Server Error",
        detail="An unexpected error occurred. Please contact support if it persists.",
        type_="urn:problem-type:internal-error",
    )
