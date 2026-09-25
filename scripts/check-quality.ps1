# TechniŚwiadectwo - Script to run all quality checks (Backend & Frontend)

Write-Host "=== 1. Checking Backend Code Quality ===" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\..\backend"

$venvPython = ".\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    $venvPython = ".\.venv\Scripts\python.exe"
}
if (-not (Test-Path $venvPython)) {
    $venvPython = "python"
}

Write-Host "Using Python interpreter: $venvPython" -ForegroundColor Gray

Write-Host "Running Ruff Linter..." -ForegroundColor Yellow
& $venvPython -m ruff check .
if ($LASTEXITCODE -ne 0) { Write-Error "Backend linting failed!"; exit $LASTEXITCODE }

Write-Host "Running Ruff Format Check..." -ForegroundColor Yellow
& $venvPython -m ruff format --check .
if ($LASTEXITCODE -ne 0) { Write-Error "Backend format check failed!"; exit $LASTEXITCODE }

Write-Host "Running Mypy Type Checker..." -ForegroundColor Yellow
& $venvPython -m mypy .
if ($LASTEXITCODE -ne 0) { Write-Error "Backend type check failed!"; exit $LASTEXITCODE }

Write-Host "Running Pytest..." -ForegroundColor Yellow
& $venvPython -m pytest
if ($LASTEXITCODE -ne 0) { Write-Error "Backend tests failed!"; exit $LASTEXITCODE }


Write-Host "=== 2. Checking Frontend Code Quality ===" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\..\frontend"

Write-Host "Running ESLint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend linting failed!"; exit $LASTEXITCODE }

Write-Host "Running Prettier Format Check..." -ForegroundColor Yellow
npm run format:check
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend format check failed!"; exit $LASTEXITCODE }

Write-Host "Running TypeScript Type Check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend type check failed!"; exit $LASTEXITCODE }

Write-Host "Running Vitest Tests..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend tests failed!"; exit $LASTEXITCODE }

Set-Location -Path "$PSScriptRoot\.."

Write-Host "=== ALL QUALITY CHECKS PASSED SUCCESSFULLY! ===" -ForegroundColor Green
