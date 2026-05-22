"""Schemas and routes for pipeline operations (workflow runs, PRs, plan/apply triggers)."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.github_service import GitHubService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pipelines", tags=["pipelines"])

# Workflow filenames in the terraform repo
_VALIDATE_PLAN_WORKFLOW = "terraform_validate_plan.yml"
_PLAN_DEPLOY_WORKFLOW = "terraform_plan_deploy.yml"


# ─────────────────────────────────────────────────────────────────────
# Response models
# ─────────────────────────────────────────────────────────────────────

class TriggerResponse(BaseModel):
    success: bool
    message: str
    environment: str
    workflow: str
    ref: str


class WorkflowRun(BaseModel):
    id: int
    environment: Optional[str] = None
    name: Optional[str] = None
    workflow: Optional[str] = None
    branch: Optional[str] = None
    status: Optional[str] = None
    conclusion: Optional[str] = None
    created_at: Optional[str] = Field(default=None, alias="createdAt")
    updated_at: Optional[str] = Field(default=None, alias="updatedAt")
    html_url: Optional[str] = Field(default=None, alias="htmlUrl")

    model_config = {"populate_by_name": True}


class PullRequestSummary(BaseModel):
    number: int
    title: str
    state: str
    merged: bool = False
    draft: bool = False
    html_url: str = Field(alias="htmlUrl")
    created_at: Optional[str] = Field(default=None, alias="createdAt")
    updated_at: Optional[str] = Field(default=None, alias="updatedAt")
    merged_at: Optional[str] = Field(default=None, alias="mergedAt")
    branch: Optional[str] = None
    author: Optional[str] = None

    model_config = {"populate_by_name": True}


# ─────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────

@router.post("/{environment}/plan", response_model=TriggerResponse)
async def trigger_plan(environment: str):
    """Trigger the terraform plan workflow for the given environment."""
    return _dispatch(_VALIDATE_PLAN_WORKFLOW, environment, action="plan")


@router.post("/{environment}/apply", response_model=TriggerResponse)
async def trigger_apply(environment: str):
    """Trigger the terraform plan-deploy workflow (apply) for the given environment."""
    return _dispatch(_PLAN_DEPLOY_WORKFLOW, environment, action="apply")


@router.get("/runs", response_model=list[WorkflowRun])
async def list_runs(
    environment: Optional[str] = Query(default=None, description="Filter by environment name"),
    limit: int = Query(default=20, ge=1, le=100),
):
    """List recent workflow runs from GitHub Actions (optionally filtered by environment)."""
    settings = get_settings()
    if settings.is_mock_mode:
        return _mock_runs(environment, limit)
    try:
        gh = GitHubService()
        return gh.list_workflow_runs(environment=environment, limit=limit)
    except Exception:
        logger.exception("Failed to list workflow runs")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve workflow runs from GitHub.",
        )


@router.get("/runs/{run_id}", response_model=WorkflowRun)
async def get_run(run_id: int):
    """Get a single workflow run by ID."""
    settings = get_settings()
    if settings.is_mock_mode:
        return _mock_run(run_id)
    try:
        gh = GitHubService()
        run = gh.get_workflow_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail=f"Workflow run {run_id} not found")
        return run
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to get workflow run %s", run_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve workflow run from GitHub.",
        )


@router.get("/pulls", response_model=list[PullRequestSummary])
async def list_pull_requests(limit: int = Query(default=10, ge=1, le=50)):
    """List recent pull requests (open + closed) from the terraform repo."""
    settings = get_settings()
    if settings.is_mock_mode:
        return _mock_pulls(limit)
    try:
        gh = GitHubService()
        return gh.list_pull_requests(limit=limit)
    except Exception:
        logger.exception("Failed to list pull requests")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve pull requests from GitHub.",
        )


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

def _dispatch(workflow: str, environment: str, action: str) -> TriggerResponse:
    settings = get_settings()
    if settings.is_mock_mode:
        logger.info("[MOCK] Would dispatch %s for env=%s", workflow, environment)
        return TriggerResponse(
            success=True,
            message=f"[MOCK] {action} triggered for '{environment}'",
            environment=environment,
            workflow=workflow,
            ref=settings.github_base_branch,
        )
    try:
        gh = GitHubService()
        gh.trigger_workflow(workflow, ref=settings.github_base_branch,
                            inputs={"environment": environment})
        return TriggerResponse(
            success=True,
            message=f"{action} triggered for '{environment}'",
            environment=environment,
            workflow=workflow,
            ref=settings.github_base_branch,
        )
    except Exception:
        logger.exception("Failed to trigger %s for %s", workflow, environment)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to trigger {action} workflow.",
        )


# ─────────────────────────────────────────────────────────────────────
# Mock-mode responses (when GITHUB_TOKEN not set)
# ─────────────────────────────────────────────────────────────────────

def _mock_runs(environment: Optional[str], limit: int) -> list[dict]:
    sample = [
        {"id": 1000 + i, "environment": environment or f"internal-qa-{i}",
         "name": "Terraform Plan", "workflow": _VALIDATE_PLAN_WORKFLOW,
         "branch": "main",
         "status": "completed" if i % 2 == 0 else "in_progress",
         "conclusion": "success" if i % 2 == 0 else None,
         "createdAt": "2026-05-21T10:00:00Z",
         "updatedAt": "2026-05-21T10:05:00Z",
         "htmlUrl": f"https://github.com/cubic-aws/terraform-cts-umb-internal/actions/runs/{1000 + i}"}
        for i in range(min(limit, 5))
    ]
    return sample


def _mock_run(run_id: int) -> dict:
    return {
        "id": run_id, "environment": "internal-qa", "name": "Terraform Plan",
        "workflow": _VALIDATE_PLAN_WORKFLOW, "branch": "main",
        "status": "completed", "conclusion": "success",
        "createdAt": "2026-05-21T10:00:00Z", "updatedAt": "2026-05-21T10:05:00Z",
        "htmlUrl": f"https://github.com/cubic-aws/terraform-cts-umb-internal/actions/runs/{run_id}",
    }


def _mock_pulls(limit: int) -> list[dict]:
    return [
        {"number": 100 + i, "title": f"Provision environment: demo-{i}",
         "state": "open" if i == 0 else "closed", "merged": i > 1, "draft": False,
         "htmlUrl": f"https://github.com/cubic-aws/terraform-cts-umb-internal/pull/{100 + i}",
         "createdAt": "2026-05-21T10:00:00Z", "updatedAt": "2026-05-21T11:00:00Z",
         "mergedAt": "2026-05-21T11:00:00Z" if i > 1 else None,
         "branch": f"feat/DEMO-{100 + i}", "author": "infra-portal-bot"}
        for i in range(min(limit, 5))
    ]
