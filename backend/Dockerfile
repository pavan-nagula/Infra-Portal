# ---- Build stage ----
FROM python:3.11-slim AS build

WORKDIR /app

# Install build deps if any wheels need compiling, then drop them
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt

# ---- Runtime stage ----
FROM python:3.11-slim

WORKDIR /app

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

# Copy installed deps and application code
COPY --from=build /install /usr/local/lib/python-deps
COPY --chown=appuser:appgroup app ./app
COPY --chown=appuser:appgroup run.py ./

ENV PYTHONPATH=/usr/local/lib/python-deps:/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

EXPOSE 8000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; \
sys.exit(0 if urllib.request.urlopen('http://localhost:8000/actuator/health/liveness',timeout=3).status==200 else 1)" \
    || exit 1

ENTRYPOINT ["python", "-m", "uvicorn", "app.main:app", \
    "--host", "0.0.0.0", "--port", "8000", \
    "--workers", "2", "--log-level", "info"]
