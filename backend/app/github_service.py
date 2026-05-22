import logging
import time
from datetime import datetime, timezone
from typing import Optional

from github import Github, GithubException
from app.config import get_settings
from app.schemas import ProvisionEnvironmentRequest

logger = logging.getLogger(__name__)


class GitHubService:
    """Handles all GitHub operations: branch creation, file commit, PR creation."""

    def __init__(self, repo_full_name: str | None = None, base_branch: str | None = None):
        settings = get_settings()
        if not settings.github_token:
            raise RuntimeError(
                "GITHUB_TOKEN is not set. Backend is in mock mode; refusing real GitHub calls."
            )
        self._gh = Github(settings.github_token)
        self._repo = self._gh.get_repo(repo_full_name or settings.github_repo_full)
        self._base_branch = base_branch or settings.github_base_branch

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def environment_exists(self, environment_name: str) -> bool:
        """Check if the environment folder already exists in the repo."""
        path = f"environments/{environment_name}/terraform.tfvars"
        try:
            self._repo.get_contents(path, ref=self._base_branch)
            return True
        except GithubException as exc:
            if exc.status == 404:
                return False
            raise

    def branch_exists(self, branch_name: str) -> bool:
        """Check if a branch already exists."""
        try:
            self._repo.get_branch(branch_name)
            return True
        except GithubException as exc:
            if exc.status == 404:
                return False
            raise

    def create_branch(self, branch_name: str) -> str:
        """Create a new branch from the base branch. Returns the branch SHA."""
        base_ref = self._repo.get_branch(self._base_branch)
        try:
            ref = self._repo.create_git_ref(
                ref=f"refs/heads/{branch_name}",
                sha=base_ref.commit.sha,
            )
        except GithubException as exc:
            if exc.status == 422:
                raise ValueError(
                    f"Cannot create branch '{branch_name}'. "
                    "A conflicting ref may already exist (e.g. a 'test' branch "
                    "blocks 'test/automation'). Use a different branch name."
                ) from exc
            raise
        logger.info("Created branch %s at %s", branch_name, ref.ref)
        return base_ref.commit.sha

    def commit_file(
        self,
        branch_name: str,
        file_path: str,
        content: str,
        commit_message: str,
    ) -> str:
        """Create or update a file on the given branch. Returns the commit SHA."""
        result = self._repo.create_file(
            path=file_path,
            message=commit_message,
            content=content,
            branch=branch_name,
        )
        sha = result["commit"].sha
        logger.info("Committed %s on %s (%s)", file_path, branch_name, sha)
        return sha

    def get_file_content(self, file_path: str, ref: str | None = None) -> str:
        """Return the decoded text content of a file at the given ref."""
        ref = ref or self._base_branch
        content_file = self._repo.get_contents(file_path, ref=ref)
        return content_file.decoded_content.decode("utf-8")

    def update_file(
        self,
        branch_name: str,
        file_path: str,
        new_content: str,
        commit_message: str,
    ) -> str:
        """Update an existing file on the given branch. Returns the commit SHA.

        Retries once after a short delay to handle GitHub API eventual
        consistency after a recent commit on the same branch.
        """
        for attempt in range(3):
            try:
                content_file = self._repo.get_contents(file_path, ref=branch_name)
                result = self._repo.update_file(
                    path=file_path,
                    message=commit_message,
                    content=new_content,
                    sha=content_file.sha,
                    branch=branch_name,
                )
                sha = result["commit"].sha
                logger.info("Updated %s on %s (%s)", file_path, branch_name, sha)
                return sha
            except GithubException as exc:
                if exc.status in (404, 409, 422) and attempt < 2:
                    logger.warning(
                        "Retry %d for %s on %s: %s", attempt + 1, file_path, branch_name, exc
                    )
                    time.sleep(2)
                    continue
                raise

    def create_pull_request(
        self,
        branch_name: str,
        request: ProvisionEnvironmentRequest,
        changes_summary: list[str],
        file_path: str,
    ) -> tuple[str, int]:
        """Create a PR and return (html_url, pr_number)."""

        title = (
            f"Provision environment: "
            f"{request.environment_name}"
        )

        body = self._build_pr_body(request, changes_summary, file_path, branch_name)

        pr = self._repo.create_pull(
            title=title,
            body=body,
            head=branch_name,
            base=self._base_branch,
        )
        logger.info("Created PR #%d: %s", pr.number, pr.html_url)
        return pr.html_url, pr.number

    # ------------------------------------------------------------------
    # Pipelines / Actions / PRs
    # ------------------------------------------------------------------

    def list_environments_remote(self) -> list[str]:
        """List environment folder names under `environments/` in the repo."""
        try:
            contents = self._repo.get_contents("environments", ref=self._base_branch)
        except GithubException as exc:
            if exc.status == 404:
                return []
            raise
        items = contents if isinstance(contents, list) else [contents]
        return sorted(c.name for c in items if c.type == "dir")

    def trigger_workflow(self, workflow_filename: str, *, ref: Optional[str] = None,
                         inputs: Optional[dict] = None) -> None:
        """Dispatch a GitHub Actions workflow_dispatch event."""
        ref = ref or self._base_branch
        try:
            wf = self._repo.get_workflow(workflow_filename)
        except GithubException as exc:
            raise RuntimeError(f"Workflow '{workflow_filename}' not found: {exc.data}") from exc
        ok = wf.create_dispatch(ref=ref, inputs=inputs or {})
        if not ok:
            raise RuntimeError(f"GitHub rejected dispatch for {workflow_filename}")
        logger.info("Dispatched workflow %s on ref %s", workflow_filename, ref)

    def list_workflow_runs(self, *, environment: Optional[str] = None,
                           limit: int = 20) -> list[dict]:
        """List recent workflow runs, optionally filtered by environment name in title/branch."""
        runs_iter = self._repo.get_workflow_runs()
        results: list[dict] = []
        for run in runs_iter:
            if environment and environment not in (run.head_branch or "") \
                    and environment not in (run.display_title or ""):
                continue
            results.append(_map_run(run))
            if len(results) >= limit:
                break
        return results

    def get_workflow_run(self, run_id: int) -> Optional[dict]:
        try:
            run = self._repo.get_workflow_run(run_id)
        except GithubException as exc:
            if exc.status == 404:
                return None
            raise
        return _map_run(run)

    def list_pull_requests(self, *, limit: int = 10) -> list[dict]:
        """List recent PRs (all states), sorted by updated desc."""
        pulls = self._repo.get_pulls(state="all", sort="updated", direction="desc")
        results: list[dict] = []
        for pr in pulls:
            results.append({
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "merged": bool(pr.merged_at),
                "draft": bool(pr.draft),
                "htmlUrl": pr.html_url,
                "createdAt": _iso(pr.created_at),
                "updatedAt": _iso(pr.updated_at),
                "mergedAt": _iso(pr.merged_at),
                "branch": pr.head.ref if pr.head else None,
                "author": pr.user.login if pr.user else None,
            })
            if len(results) >= limit:
                break
        return results

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_pr_body(
        request: ProvisionEnvironmentRequest,
        changes_summary: list[str],
        file_path: str,
        branch_name: str,
    ) -> str:
        summary_md = "\n".join(f"- {line}" for line in changes_summary)

        return f"""## Infrastructure Provisioning Request

**Branch:** {branch_name}
**Requested via:** Infra Portal (Self-Service)

---

### What this PR does

Creates the **Foundation** Terraform configuration for the
`{request.environment_name}` environment.

**Resources included:**
- App Config Management (SOPS KMS key)
- Bastion Host configuration
- VPC Primary ({request.vpc_primary_region})
{f"- VPC Secondary ({request.vpc_secondary_region})" if request.create_vpc_secondary else ""}
- VPC Flow Logs IAM

**File created:** `{file_path}`

---

### Configuration Summary

{summary_md}

---

### Checklist

- [ ] Review generated Terraform configuration
- [ ] CI/CD ran `terraform fmt` successfully
- [ ] CI/CD ran `terraform validate` successfully
- [ ] CI/CD ran `terraform plan` — review plan output
- [ ] Approved by infrastructure team lead

---

> _This PR was automatically generated by the Infra Portal._
"""


def _iso(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _map_run(run) -> dict:
    name = run.name or ""
    branch = run.head_branch or ""
    # Best-effort environment derivation: workflow input or branch suffix
    env = None
    if "feat/" in branch:
        env = branch.split("/", 1)[1]
    return {
        "id": run.id,
        "environment": env,
        "name": name,
        "workflow": run.path.split("/")[-1] if run.path else None,
        "branch": branch,
        "status": run.status,
        "conclusion": run.conclusion,
        "createdAt": _iso(run.created_at),
        "updatedAt": _iso(run.updated_at),
        "htmlUrl": run.html_url,
    }
