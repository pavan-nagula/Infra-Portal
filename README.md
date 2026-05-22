# Infra Portal (Python)

Production-grade self-service infrastructure provisioning portal.

- **Backend**: FastAPI (Python 3.11) — port `8000`
- **Frontend**: React 18 + TypeScript + Vite + Ant Design (dark theme)
- **Deployment**: Docker → ECR → EKS via Helm + ArgoCD

## Quick start (local)

```powershell
# Backend
cd backend
python -m venv .venv ; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env   # leave GITHUB_TOKEN blank for mock mode
python run.py                  # http://localhost:8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Or use Docker Compose:

```powershell
docker compose up --build
```

## Architecture

```
┌────────────┐    /api/*    ┌──────────────┐    PyGithub    ┌────────────┐
│  Frontend  ├─────────────►│   Backend    ├───────────────►│   GitHub   │
│ React+AntD │              │  FastAPI     │                │  (PRs +    │
│  Nginx :80 │              │  uvicorn:8000│                │  Actions)  │
└────────────┘              └──────────────┘                └────────────┘
```

## Backend security & ops features

- RFC 7807 problem+json error envelope on all 4xx/5xx
- `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`, `/actuator/info`
- API key auth (`X-API-Key` header) — gated by `SECURITY_ENABLED`
- Rate limiting (`/api/*` only)
- Audit + request logging middleware
- Mock mode when `GITHUB_TOKEN=""`

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `ENV` | `development` | |
| `SECURITY_ENABLED` | `false` | Set `true` in prod |
| `API_KEY` | _empty_ | Required header value if security enabled |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated |
| `RATE_LIMIT_PER_MINUTE` | `60` | Per principal/IP |
| `GITHUB_TOKEN` | _empty_ | Empty → mock mode |
| `GITHUB_ORG` | `cubic-aws` | |
| `GITHUB_REPO` | `terraform-cts-umb-internal` | |
| `GITHUB_BASE_BRANCH` | `main` | |
| `ARGOCD_GITHUB_ORG` | `cubic-aws` | |
| `ARGOCD_GITHUB_REPO` | `argocd-cts-umb-app-of-apps` | |
| `ARGOCD_GITHUB_BASE_BRANCH` | `gotham` | |
| `TERRAFORM_REPO_PATH` | _empty_ | If set, lists env folders from local clone instead of GitHub |

## Project structure

```
infra-portal-python/
├── backend/             FastAPI service
│   ├── app/
│   │   ├── main.py              app + middleware + actuator + handlers
│   │   ├── config.py            Pydantic Settings
│   │   ├── middleware.py        API key, rate limit, audit, request log
│   │   ├── github_service.py    PyGithub client (mock-mode aware)
│   │   ├── routes_environments  list/get/clone environments
│   │   ├── routes_pipelines     plan/apply/runs/PRs
│   │   ├── routes.py            legacy provision + cluster-registration
│   │   └── templates/           Jinja2 *.j2
│   ├── Dockerfile               multi-stage non-root
│   └── requirements.txt
├── frontend/            React + TypeScript + Ant Design
│   ├── src/
│   │   ├── pages/{Dashboard,EnvironmentList,CreateEnvironment,
│   │   │           PipelineHistory,ClusterRegistration}.tsx
│   │   ├── components/{PageLayout,TfvarsPreview}.tsx
│   │   ├── services/api.ts
│   │   └── hooks/useAsync.ts
│   ├── Dockerfile               build → nginx, non-root
│   └── nginx.conf               security headers + SPA + /api proxy + /healthz
├── helm/infra-portal/   Helm chart (backend + UI + ingress + HPA)
├── argocd/              AppProject + 3 Applications (dev/staging/prod)
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Deployment

ArgoCD applications point at `helm/infra-portal/`. Per-env overrides in
`values-{dev,staging,prod}.yaml`. Dev & staging auto-sync; prod is manual.

Images are pushed by CI to ECR:
- `infra-portal-backend:{dev,staging,prod}-<sha>`
- `infra-portal-ui:{dev,staging,prod}-<sha>`

## Testing

```powershell
# Backend
cd backend ; pytest -q --cov=app

# Frontend
cd frontend ; npm test
```
