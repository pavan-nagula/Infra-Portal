"""Routes for environment listing, retrieval, and cloning.

These complement the existing `/provision/environment` routes by providing
read-only listing (used by the UI to populate the environments page) and a
clone-from-template flow that copies an existing tfvars and substitutes the
environment name + account id tokens.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.github_service import GitHubService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/environments", tags=["environments"])

_ENV_NAME_RE = re.compile(r"^[a-z][a-z0-9-]+[a-z0-9]$")


# ─────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────

class CloneEnvironmentRequest(BaseModel):
    template_name: str = Field(..., min_length=3, description="Existing environment to clone from")
    new_name: str = Field(..., min_length=3, max_length=40,
                          description="New environment name (lowercase, hyphens)")
    aws_account_id: str = Field(..., pattern=r"^\d{12}$",
                                description="12-digit AWS account ID for the new environment")
    branch_name: Optional[str] = Field(default=None, description="Branch name. Auto-derived if omitted.")
    tag: Optional[str] = Field(default=None, description="Optional environment tag override")


class CloneEnvironmentResponse(BaseModel):
    success: bool
    message: str
    branch_name: str
    pr_url: Optional[str] = None
    pr_number: Optional[int] = None
    file_path: str
    template_name: str


class EnvironmentSummary(BaseModel):
    name: str
    source: str  # "local" | "remote" | "mock"


# ─────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[EnvironmentSummary])
async def list_environments():
    """List environment directories.

    Resolution order:
    1. If TERRAFORM_REPO_PATH is set and exists → list local folders
    2. Else if mock_mode → return fake list
    3. Else → list via GitHub Contents API
    """
    settings = get_settings()
    if settings.terraform_repo_path:
        local = Path(settings.terraform_repo_path) / "environments"
        if local.is_dir():
            return [
                EnvironmentSummary(name=d.name, source="local")
                for d in sorted(local.iterdir())
                if d.is_dir() and not d.name.startswith(".")
            ]

    if settings.is_mock_mode:
        return [
            EnvironmentSummary(name=n, source="mock")
            for n in ("internal-qa", "internal-performance", "boil")
        ]

    try:
        gh = GitHubService()
        names = gh.list_environments_remote()
        return [EnvironmentSummary(name=n, source="remote") for n in names]
    except Exception:
        logger.exception("Failed to list environments from GitHub")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to list environments from GitHub.",
        )


@router.get("/{name}")
async def get_environment(name: str):
    """Return the raw tfvars content for the given environment."""
    settings = get_settings()
    rel_path = f"environments/{name}/terraform.tfvars"

    # Local
    if settings.terraform_repo_path:
        local = Path(settings.terraform_repo_path) / rel_path
        if local.is_file():
            return {"name": name, "path": rel_path, "content": local.read_text(encoding="utf-8")}

    if settings.is_mock_mode:
        return {"name": name, "path": rel_path,
                "content": f"# [MOCK] terraform.tfvars for {name}\nenvironment = \"{name}\"\n"}

    try:
        gh = GitHubService()
        content = gh.get_file_content(rel_path)
        return {"name": name, "path": rel_path, "content": content}
    except Exception as e:
        logger.exception("Failed to get tfvars for %s", name)
        raise HTTPException(status_code=404, detail=f"Environment '{name}' not found: {e}")


@router.post("/clone", response_model=CloneEnvironmentResponse)
async def clone_environment(request: CloneEnvironmentRequest):
    """Clone an existing environment's tfvars into a new one.

    Substitutes occurrences of the template name in the tfvars content with the
    new name (whole-word and dotted-path variants) and opens a PR.
    """
    if not _ENV_NAME_RE.match(request.new_name):
        raise HTTPException(
            status_code=400,
            detail="new_name must be lowercase alphanumeric with hyphens, "
                   "start with a letter, end with a letter or digit.",
        )

    branch_name = request.branch_name or f"feat/clone-{request.new_name}"
    file_path = f"environments/{request.new_name}/terraform.tfvars"
    settings = get_settings()

    if settings.is_mock_mode:
        logger.info("[MOCK] clone %s -> %s", request.template_name, request.new_name)
        return CloneEnvironmentResponse(
            success=True,
            message=f"[MOCK] Cloned '{request.template_name}' to '{request.new_name}'",
            branch_name=branch_name,
            pr_url=f"https://github.com/{settings.github_repo_full}/pull/MOCK",
            pr_number=None,
            file_path=file_path,
            template_name=request.template_name,
        )

    try:
        gh = GitHubService()
    except Exception:
        logger.exception("Failed to connect to GitHub")
        raise HTTPException(status_code=502, detail="Unable to connect to GitHub.")

    # Guards
    if gh.environment_exists(request.new_name):
        raise HTTPException(status_code=409,
                            detail=f"Environment '{request.new_name}' already exists.")
    if gh.branch_exists(branch_name):
        raise HTTPException(status_code=409, detail=f"Branch '{branch_name}' already exists.")

    # Fetch template
    template_path = f"environments/{request.template_name}/terraform.tfvars"
    try:
        template_content = gh.get_file_content(template_path)
    except Exception:
        raise HTTPException(
            status_code=404,
            detail=f"Template environment '{request.template_name}' not found.",
        )

    # Substitute env-name tokens (whole word + dotted) and account id
    new_content = _substitute_tokens(
        template_content,
        old_env=request.template_name,
        new_env=request.new_name,
        new_account_id=request.aws_account_id,
        new_tag=request.tag,
    )

    # Create branch + commit
    try:
        gh.create_branch(branch_name)
        gh.commit_file(
            branch_name, file_path, new_content,
            f"feat: clone {request.template_name} -> {request.new_name}",
        )
    except Exception:
        logger.exception("Clone commit failed")
        raise HTTPException(status_code=502, detail="Failed to commit cloned tfvars.")

    # Create PR
    try:
        pr = gh._repo.create_pull(  # noqa: SLF001 — internal helper, acceptable here
            title=f"Clone environment: {request.new_name} (from {request.template_name})",
            body=(
                f"## Cloned environment\n\n"
                f"- **Template:** `{request.template_name}`\n"
                f"- **New environment:** `{request.new_name}`\n"
                f"- **AWS Account ID:** `{request.aws_account_id}`\n"
                f"- **File:** `{file_path}`\n\n"
                f"_Auto-generated by Infra Portal._"
            ),
            head=branch_name,
            base=settings.github_base_branch,
        )
    except Exception:
        logger.exception("Failed to create clone PR")
        raise HTTPException(
            status_code=502,
            detail="Branch and commit created, but failed to create the pull request.",
        )

    return CloneEnvironmentResponse(
        success=True,
        message=f"PR #{pr.number} created for cloned environment '{request.new_name}'.",
        branch_name=branch_name,
        pr_url=pr.html_url,
        pr_number=pr.number,
        file_path=file_path,
        template_name=request.template_name,
    )


def _substitute_tokens(content: str, *, old_env: str, new_env: str,
                       new_account_id: str, new_tag: Optional[str]) -> str:
    """Best-effort substitution of template environment tokens."""
    # Replace whole-word occurrences of the env name (e.g. environment = "old")
    pattern = re.compile(rf'(?<![a-zA-Z0-9-]){re.escape(old_env)}(?![a-zA-Z0-9-])')
    result = pattern.sub(new_env, content)

    # Replace any 12-digit account id assignment (best effort)
    result = re.sub(
        r'(aws_account_id\s*=\s*")(\d{12})(")',
        rf'\g<1>{new_account_id}\g<3>',
        result,
    )
    if new_tag:
        result = re.sub(
            r'(environment_tag\s*=\s*")[^"]*(")',
            rf'\g<1>{new_tag}\g<2>',
            result,
        )
    return result
