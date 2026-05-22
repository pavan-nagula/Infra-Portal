"""Production-grade middleware: request logging, audit logging, API key auth, rate limiting.

Order (outermost to innermost when added in main.py via app.add_middleware):
1. RequestLoggingMiddleware  — adds X-Request-Id, logs method/path/status/duration
2. AuditLoggingMiddleware    — logs POST/PUT/DELETE on /api/* with principal + IP
3. ApiKeyAuthMiddleware      — enforces X-API-Key when SECURITY_ENABLED=true
4. RateLimitMiddleware       — per-IP token bucket on /api/*
"""

from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

request_logger = logging.getLogger("http.request")
audit_logger = logging.getLogger("audit")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs method, URI, status code, and duration. Adds X-Request-Id header."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:8]
        path = request.url.path
        qs = request.url.query
        full_path = f"{path}?{qs}" if qs else path

        request.state.request_id = request_id
        request_logger.info(">>> %s %s [rid=%s]", request.method, full_path, request_id)

        start = time.monotonic()
        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = int((time.monotonic() - start) * 1000)
            request_logger.exception(
                "!!! %s %s 500 (%dms) [rid=%s]",
                request.method, full_path, duration_ms, request_id,
            )
            raise

        duration_ms = int((time.monotonic() - start) * 1000)
        response.headers["X-Request-Id"] = request_id
        request_logger.info(
            "<<< %s %s %s (%dms) [rid=%s]",
            request.method, full_path, response.status_code, duration_ms, request_id,
        )
        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """Audit-logs mutating API operations (POST/PUT/DELETE on /api/*)."""

    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path

        if method == "GET" or not path.startswith("/api/"):
            return await call_next(request)

        start = time.monotonic()
        response: Response = await call_next(request)
        duration_ms = int((time.monotonic() - start) * 1000)

        audit_logger.info(
            "AUDIT | user=%s | action=%s %s | status=%s | ip=%s | duration=%dms",
            _resolve_principal(request),
            method, path,
            response.status_code,
            _resolve_client_ip(request),
            duration_ms,
        )
        return response


class ApiKeyAuthMiddleware(BaseHTTPMiddleware):
    """Enforces X-API-Key when security_enabled=true. Bypassed for /actuator/* and /health."""

    _PUBLIC_PREFIXES = ("/actuator", "/health", "/docs", "/redoc", "/openapi.json")

    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        if not settings.security_enabled or not settings.api_key:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(p) for p in self._PUBLIC_PREFIXES):
            return await call_next(request)
        if not path.startswith("/api/"):
            return await call_next(request)

        if request.headers.get("X-API-Key", "") == settings.api_key:
            request.state.principal = "api-client"
            return await call_next(request)

        return Response(
            content=(
                '{"type":"urn:problem-type:unauthorized",'
                '"title":"Unauthorized","status":401,'
                '"detail":"Invalid or missing API key"}'
            ),
            status_code=401,
            media_type="application/problem+json",
        )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limiting using a simple in-memory token bucket. Scope: /api/*."""

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.rpm = requests_per_minute
        self._buckets: dict[str, dict] = defaultdict(
            lambda: {"tokens": float(self.rpm), "last": time.monotonic()}
        )

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        client_ip = _resolve_client_ip(request)
        bucket = self._buckets[client_ip]

        now = time.monotonic()
        elapsed = now - bucket["last"]
        bucket["tokens"] = min(self.rpm, bucket["tokens"] + elapsed * (self.rpm / 60.0))
        bucket["last"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return await call_next(request)

        return Response(
            content=(
                '{"type":"urn:problem-type:rate-limited",'
                '"title":"Too Many Requests","status":429,'
                '"detail":"Rate limit exceeded. Try again later."}'
            ),
            status_code=429,
            media_type="application/problem+json",
            headers={"Retry-After": "60"},
        )


def _resolve_principal(request: Request) -> str:
    principal = getattr(request.state, "principal", None)
    if principal:
        return principal
    if request.headers.get("X-API-Key"):
        return "api-key-user"
    return "anonymous"


def _resolve_client_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
