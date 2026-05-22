"""Application configuration loaded from environment variables / .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Application ---
    env: str = "development"
    app_name: str = "infra-portal-backend"
    app_version: str = "1.0.0"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- GitHub (terraform repo) ---
    # Leave empty to run in MOCK MODE
    github_token: str = ""
    github_org: str = "cubic-aws"
    github_repo: str = "terraform-cts-umb-internal"
    github_base_branch: str = "main"

    # --- GitHub (ArgoCD app-of-apps repo, for cluster registration) ---
    argocd_github_repo: str = "argocd-cts-umb-app-of-apps"
    argocd_github_base_branch: str = "gotham"

    # --- Optional local terraform repo path (used by GET /api/v1/environments fallback) ---
    terraform_repo_path: str = ""

    # --- CORS ---
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # --- Security (API-key) ---
    security_enabled: bool = False
    api_key: str = ""

    # --- Rate limiting ---
    rate_limit_per_minute: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Derived helpers ---
    @property
    def github_repo_full(self) -> str:
        return f"{self.github_org}/{self.github_repo}"

    @property
    def argocd_github_repo_full(self) -> str:
        return f"{self.github_org}/{self.argocd_github_repo}"

    @property
    def is_mock_mode(self) -> bool:
        return not self.github_token

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Convenience singleton for module-level imports (e.g. middleware)
settings = get_settings()
