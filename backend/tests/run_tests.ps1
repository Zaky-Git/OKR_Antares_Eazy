# ============================================
# OKR Antares Eazy - Full Test Runner
# 
# Run: cd backend/tests; .\run_tests.ps1
#
# This script does EVERYTHING automatically:
#   1. Drop & create test database
#   2. Start test server in background
#   3. Wait for server to be ready
#   4. Run all API tests
#   5. Stop server
#   6. Drop test database
# ============================================

$ErrorActionPreference = "SilentlyContinue"

$DB_NAME = "okr_antares_eazy_test"
$MYSQL = "C:\laragon\bin\mysql\mysql-8.0.40-winx64\bin\mysql.exe"
$BACKEND_DIR = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent | Join-Path -ChildPath "backend"

# If running from tests folder, go up one level
if ((Split-Path $PSScriptRoot -Leaf) -eq "tests") {
    $BACKEND_DIR = Split-Path $PSScriptRoot -Parent
}

if (-not (Test-Path $MYSQL)) { $MYSQL = "mysql" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OKR Antares Eazy - Full Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- STEP 1: Reset DB ----
Write-Host "[1/6] Creating test database..." -ForegroundColor Yellow
& $MYSQL -u root -h localhost -P 3306 -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Cannot connect to MySQL. Is Laragon running?" -ForegroundColor Red
    exit 1
}
Write-Host "  OK - $DB_NAME created" -ForegroundColor Green

# ---- STEP 2: Start server ----
Write-Host "[2/6] Starting test server..." -ForegroundColor Yellow

$env:DB_NAME = $DB_NAME
$env:APP_PORT = "8081"

$serverProcess = Start-Process -FilePath "go" -ArgumentList "run", "cmd/api/main.go" -WorkingDirectory $BACKEND_DIR -PassThru -WindowStyle Hidden -RedirectStandardOutput "$PSScriptRoot\server_out.log" -RedirectStandardError "$PSScriptRoot\server_err.log"

if (-not $serverProcess) {
    Write-Host "  ERROR: Failed to start server. Is Go installed?" -ForegroundColor Red
    exit 1
}
Write-Host "  Server PID: $($serverProcess.Id)" -ForegroundColor DarkGray

# ---- STEP 3: Wait for server ----
Write-Host "[3/6] Waiting for server to be ready..." -ForegroundColor Yellow
$ready = $false
$attempts = 0
$maxAttempts = 30

while (-not $ready -and $attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8081/api/auth/me" -Method GET -ErrorAction Stop
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 401) {
            $ready = $true
        }
    }
    Write-Host "  Attempt $attempts/$maxAttempts..." -ForegroundColor DarkGray
}

if (-not $ready) {
    Write-Host "  ERROR: Server did not start within ${maxAttempts}s" -ForegroundColor Red
    Write-Host "  Server error log:" -ForegroundColor Red
    if (Test-Path "$PSScriptRoot\server_err.log") { Get-Content "$PSScriptRoot\server_err.log" | Write-Host }
    Stop-Process -Id $serverProcess.Id -Force 2>$null
    exit 1
}
Write-Host "  OK - Server ready on :8081" -ForegroundColor Green

# ---- STEP 4: Run tests ----
Write-Host "[4/6] Running API tests..." -ForegroundColor Yellow
Write-Host ""

# Reset env vars so api_test doesn't interfere
$env:DB_NAME = $null
$env:APP_PORT = $null

& "$PSScriptRoot\api_test.ps1"
$testResult = $LASTEXITCODE

Write-Host ""

# ---- STEP 5: Stop server ----
Write-Host "[5/6] Stopping test server..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -Force 2>$null

# Also kill any child processes (go compiles and runs a temp binary)
Get-Process | Where-Object { $_.Path -like "*okr-backend*" -or $_.Path -like "*exe\main*" } | Stop-Process -Force 2>$null

# Wait a moment
Start-Sleep -Seconds 1
Write-Host "  OK - Server stopped" -ForegroundColor Green

# ---- STEP 6: Cleanup DB ----
Write-Host "[6/6] Dropping test database..." -ForegroundColor Yellow
& $MYSQL -u root -h localhost -P 3306 -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null
Write-Host "  OK - $DB_NAME dropped" -ForegroundColor Green

# Cleanup log files
Remove-Item "$PSScriptRoot\server_out.log" -Force 2>$null
Remove-Item "$PSScriptRoot\server_err.log" -Force 2>$null

# ---- DONE ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($testResult -eq 0) {
    Write-Host "  ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "  SOME TESTS FAILED" -ForegroundColor Red
}
Write-Host "  Dev database untouched." -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

exit $testResult
