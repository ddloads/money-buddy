$rootDir    = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
Set-Location $backendDir

# ── .env ──────────────────────────────────────────────────────────────────────
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "  .env created (SQLite, no database install needed)." -ForegroundColor Yellow
    Write-Host "  Edit backend\.env to switch to PostgreSQL for production." -ForegroundColor Yellow
    Write-Host ""
}

# ── Python venv ───────────────────────────────────────────────────────────────
if (!(Test-Path "venv")) {
    Write-Host "  Setting up Python 3.11 virtual environment..." -ForegroundColor Cyan
    py -3.11 -m venv venv
    Write-Host "  Installing Python dependencies..." -ForegroundColor Cyan
    & ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet
}

# ── Start ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Backend  -> http://localhost:8001" -ForegroundColor Green
Write-Host "  API docs -> http://localhost:8001/docs" -ForegroundColor Green
Write-Host "  Database -> money_buddy.db (SQLite)" -ForegroundColor Green
Write-Host ""

& ".\venv\Scripts\uvicorn.exe" app.main:app --reload --port 8001
