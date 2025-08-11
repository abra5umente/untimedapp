# syntax=docker/dockerfile:1

# Minimal, production-ready image for the FastAPI app
FROM python:3.11-slim AS runtime

# Prevent Python from writing .pyc files and enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install runtime dependencies
# We install FastAPI and Uvicorn; FastAPI pulls Starlette/Pydantic transitively.
RUN pip install --upgrade pip && \
    pip install fastapi uvicorn[standard]

# Copy application code
COPY pymodoro ./pymodoro
COPY webapp ./webapp
COPY README.md ./README.md
COPY LICENSE ./LICENSE

# Create a non-root user for security
RUN useradd -m -u 10001 appuser
USER appuser

EXPOSE 8000

# Allow overriding port with $PORT (e.g., on PaaS)
CMD ["sh", "-c", "uvicorn webapp.app:app --host 0.0.0.0 --port ${PORT:-8000}"]

