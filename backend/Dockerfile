FROM python:3.11-slim

# ── Build args / labels ───────────────────────────────────────────────────────
LABEL maintainer="Money Buddy" \
      description="Money Buddy Bill Management API"

# ── System deps ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ─────────────────────────────────────────────────────────
WORKDIR /app

# ── Python deps ───────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application source ────────────────────────────────────────────────────────
COPY . .

# ── Upload volume ─────────────────────────────────────────────────────────────
RUN mkdir -p /uploads
VOLUME ["/uploads"]

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Non-root user for security ────────────────────────────────────────────────
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app /uploads
USER appuser

# ── Runtime ───────────────────────────────────────────────────────────────────
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
