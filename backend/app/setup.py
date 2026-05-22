"""
First-run setup endpoints.
Allows an admin to configure GITHUB_TOKEN and API_KEY via the UI
when no .env file exists yet. Once configured, these endpoints lock out.
"""

import logging
from pathlib import Path
from pydantic import BaseModel, field_validator
from fastapi import APIRouter, HTTPException, status
from app.config import ENV_FILE, get_settings, reload_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/setup", tags=["setup"])


class SetupRequest(BaseModel):
    github_token: str
    api_key: str
    github_org: str = "cubic-aws"
    github_repo: str = "terraform-cts-umb-internal"
    github_base_branch: str = "main"

    @field_validator("github_token")
    @classmethod
    def validate_token(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("GitHub token is required")
        return v

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, v):
        v = v.strip()
        if len(v) < 8:
            raise ValueError("API key must be at least 8 characters")
        return v


class SetupStatusResponse(BaseModel):
    configured: bool
    message: str


class SetupCompleteResponse(BaseModel):
    success: bool
    message: str
    api_key: str


@router.get("/status", response_model=SetupStatusResponse)
async def setup_status():
    """Check whether the portal has been configured."""
    settings = get_settings()
    if settings.is_configured:
        return SetupStatusResponse(
            configured=True,
            message="Portal is configured and ready to use.",
        )
    return SetupStatusResponse(
        configured=False,
        message="First-run setup required. Please provide GitHub token and API key.",
    )


@router.post("/configure", response_model=SetupCompleteResponse)
async def configure(request: SetupRequest):
    """
    Save configuration to .env file (first-run only).
    Once configured, this endpoint is locked.
    """
    settings = get_settings()
    if settings.is_configured:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Portal is already configured. To reconfigure, edit or delete the .env file on the server.",
        )

    # Write .env file
    env_content = f"""# Infra Portal Configuration (auto-generated)
ENV=development

# GitHub Configuration
GITHUB_TOKEN={request.github_token}
GITHUB_ORG={request.github_org}
GITHUB_REPO={request.github_repo}
GITHUB_BASE_BRANCH={request.github_base_branch}

# API Security
API_KEY={request.api_key}

# Server
HOST=0.0.0.0
PORT=8000
"""

    try:
        ENV_FILE.write_text(env_content, encoding="utf-8")
        logger.info("First-run setup complete — .env written to %s", ENV_FILE)
    except OSError:
        logger.exception("Failed to write .env file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to write configuration file. Check server file permissions.",
        )

    # Reload settings
    reload_settings()

    return SetupCompleteResponse(
        success=True,
        message="Configuration saved. Portal is ready to use.",
        api_key=request.api_key,
    )
