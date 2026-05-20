# ============================================
# OKR Antares Eazy - API Automation Test
#
# HOW TO RUN:
#   1. Open Terminal 1 (for test server):
#      cd backend
#      $env:DB_NAME="okr_antares_eazy_test"; $env:APP_PORT="8081"; go run cmd/api/main.go
#
#   2. Open Terminal 2 (for test):
#      cd backend/tests
#      .\api_test.ps1
#
#   3. After test, stop server (Ctrl+C) and run cleanup:
#      .\api_test.ps1 -Cleanup
#
# IMPORTANT: Uses separate DB (okr_antares_eazy_test) on port 8081.
# Does NOT touch dev database (okr_antares_eazy).
# ============================================

param(
    [switch]$Cleanup
)

$BASE_URL = "http://localhost:8081/api"
$DB_NAME = "okr_antares_eazy_test"
$MYSQL = "C:\laragon\bin\mysql\mysql-8.0.40-winx64\bin\mysql.exe"

if (-not (Test-Path $MYSQL)) { $MYSQL = "mysql" }

# Cleanup mode
if ($Cleanup) {
    Write-Host "Dropping test database..." -ForegroundColor Yellow
    & $MYSQL -u root -h localhost -P 3306 -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null
    Write-Host "Done. Test database removed." -ForegroundColor Green
    exit 0
}

$Pass = 0
$Fail = 0
$Total = 0
$Token = ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [int]$ExpectedStatus,
        [string]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $script:Total++
    $statusCode = $null
    $content = $null
    
    $params = @{
        Method = $Method
        Uri = $Url
        ContentType = "application/json"
        ErrorAction = "Stop"
    }

    if ($Body) { $params.Body = $Body }
    if ($Headers.Count -gt 0) { $params.Headers = $Headers }

    try {
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($_.ErrorDetails.Message) {
            try { $content = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
        }
    }

    if ($statusCode -eq $ExpectedStatus) {
        Write-Host "  PASS " -ForegroundColor Green -NoNewline
        Write-Host "[$statusCode] $Name"
        $script:Pass++
    }
    else {
        Write-Host "  FAIL " -ForegroundColor Red -NoNewline
        Write-Host "[$statusCode, expected $ExpectedStatus] $Name"
        $script:Fail++
    }

    return $content
}

# ---- Check server is running ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OKR Antares Eazy - API Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking server at $BASE_URL ..." -ForegroundColor DarkGray
try {
    $check = Invoke-WebRequest -Uri "$BASE_URL/auth/me" -Method GET -ErrorAction Stop
} catch {
    $checkStatus = $_.Exception.Response.StatusCode.value__
    if ($checkStatus -eq 401) {
        Write-Host "Server is running!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Server not reachable at $BASE_URL" -ForegroundColor Red
        Write-Host ""
        Write-Host "Start the test server first:" -ForegroundColor Yellow
        Write-Host '  cd backend' -ForegroundColor White
        Write-Host '  $env:DB_NAME="okr_antares_eazy_test"; $env:APP_PORT="8081"; go run cmd/api/main.go' -ForegroundColor White
        Write-Host ""
        exit 1
    }
}
Write-Host ""

# ---- AUTH ----
Write-Host "--- Auth ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Register" -Method "POST" -Url "$BASE_URL/auth/register" -ExpectedStatus 201 -Body '{"name":"TestUser","email":"testapi@antares.id","password":"password123"}'

$result = Test-Endpoint -Name "Register duplicate email" -Method "POST" -Url "$BASE_URL/auth/register" -ExpectedStatus 400 -Body '{"name":"TestUser","email":"testapi@antares.id","password":"password123"}'

$result = Test-Endpoint -Name "Login" -Method "POST" -Url "$BASE_URL/auth/login" -ExpectedStatus 200 -Body '{"email":"testapi@antares.id","password":"password123"}'
if ($result.data.token) { $Token = $result.data.token }

$result = Test-Endpoint -Name "Login wrong password" -Method "POST" -Url "$BASE_URL/auth/login" -ExpectedStatus 401 -Body '{"email":"testapi@antares.id","password":"wrong"}'

$AuthHeaders = @{ "Authorization" = "Bearer $Token" }

$result = Test-Endpoint -Name "Get Me" -Method "GET" -Url "$BASE_URL/auth/me" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Me without token (401)" -Method "GET" -Url "$BASE_URL/auth/me" -ExpectedStatus 401

$result = Test-Endpoint -Name "Get Me invalid token (401)" -Method "GET" -Url "$BASE_URL/auth/me" -ExpectedStatus 401 -Headers @{ "Authorization" = "Bearer invalidtoken123" }

Write-Host ""

# ---- PERIOD ----
Write-Host "--- Period ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Ensure Current Year" -Method "POST" -Url "$BASE_URL/periods/ensure-current-year" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Ensure Current Year (idempotent)" -Method "POST" -Url "$BASE_URL/periods/ensure-current-year" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get All Periods" -Method "GET" -Url "$BASE_URL/periods" -ExpectedStatus 200 -Headers $AuthHeaders

$PeriodID = 0
if ($result.data) {
    foreach ($p in $result.data) {
        if ($p.quarter -eq "Q2") { $PeriodID = $p.id }
    }
}
if ($PeriodID -eq 0 -and $result.data.Count -gt 0) { $PeriodID = $result.data[0].id }

$result = Test-Endpoint -Name "Get Current Period" -Method "GET" -Url "$BASE_URL/periods/current" -ExpectedStatus 200 -Headers $AuthHeaders

Write-Host ""

# ---- OBJECTIVE ----
Write-Host "--- Objective ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Create Objective" -Method "POST" -Url "$BASE_URL/objectives" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"period_id`":$PeriodID,`"title`":`"Test Objective Alpha`",`"description`":`"Improve reliability`",`"confidence_level`":7}"
$ObjID = if ($result.data.id) { $result.data.id } else { 1 }

$result = Test-Endpoint -Name "Create Objective 2" -Method "POST" -Url "$BASE_URL/objectives" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"period_id`":$PeriodID,`"title`":`"Test Objective Beta`",`"description`":`"Improve performance`",`"confidence_level`":6}"
$ObjID2 = if ($result.data.id) { $result.data.id } else { 2 }

$result = Test-Endpoint -Name "Create Objective (no title - 400)" -Method "POST" -Url "$BASE_URL/objectives" -ExpectedStatus 400 -Headers $AuthHeaders -Body "{`"period_id`":$PeriodID,`"title`":`"`"}"

$result = Test-Endpoint -Name "Create Objective (no period - 400)" -Method "POST" -Url "$BASE_URL/objectives" -ExpectedStatus 400 -Headers $AuthHeaders -Body '{"title":"No period"}'

$result = Test-Endpoint -Name "Get Objectives by Period" -Method "GET" -Url "$BASE_URL/objectives?period_id=$PeriodID&page=1&limit=10" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Objectives (missing period_id - 400)" -Method "GET" -Url "$BASE_URL/objectives?page=1&limit=10" -ExpectedStatus 400 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Objective by ID" -Method "GET" -Url "$BASE_URL/objectives/$ObjID" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Objective not found (404)" -Method "GET" -Url "$BASE_URL/objectives/99999" -ExpectedStatus 404 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Update Objective" -Method "PATCH" -Url "$BASE_URL/objectives/$ObjID" -ExpectedStatus 200 -Headers $AuthHeaders -Body '{"title":"Updated Objective Alpha","confidence_level":9,"status":"ON_TRACK"}'

$result = Test-Endpoint -Name "Update Objective (invalid confidence - 400)" -Method "PATCH" -Url "$BASE_URL/objectives/$ObjID" -ExpectedStatus 400 -Headers $AuthHeaders -Body '{"confidence_level":15}'

$result = Test-Endpoint -Name "Delete Objective" -Method "DELETE" -Url "$BASE_URL/objectives/$ObjID2" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Deleted Objective (404)" -Method "GET" -Url "$BASE_URL/objectives/$ObjID2" -ExpectedStatus 404 -Headers $AuthHeaders

Write-Host ""

# ---- OWNERSHIP TEST ----
Write-Host "--- Ownership ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Register User 2" -Method "POST" -Url "$BASE_URL/auth/register" -ExpectedStatus 201 -Body '{"name":"Other User","email":"other@antares.id","password":"password123"}'

$result = Test-Endpoint -Name "Login User 2" -Method "POST" -Url "$BASE_URL/auth/login" -ExpectedStatus 200 -Body '{"email":"other@antares.id","password":"password123"}'
$Token2 = ""
if ($result.data.token) { $Token2 = $result.data.token }
$AuthHeaders2 = @{ "Authorization" = "Bearer $Token2" }

$result = Test-Endpoint -Name "User 2 update User 1 objective (403)" -Method "PATCH" -Url "$BASE_URL/objectives/$ObjID" -ExpectedStatus 403 -Headers $AuthHeaders2 -Body '{"title":"Hacked"}'

$result = Test-Endpoint -Name "User 2 delete User 1 objective (403)" -Method "DELETE" -Url "$BASE_URL/objectives/$ObjID" -ExpectedStatus 403 -Headers $AuthHeaders2

Write-Host ""

# ---- SPRINT ----
Write-Host "--- Sprint ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Create Sprint" -Method "POST" -Url "$BASE_URL/sprints" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"period_id`":$PeriodID,`"name`":`"Sprint 1`",`"goal`":`"Core features`",`"start_date`":`"2026-04-01`",`"end_date`":`"2026-04-14`"}"
$SprintID = if ($result.data.id) { $result.data.id } else { 1 }

$result = Test-Endpoint -Name "Create Sprint 2" -Method "POST" -Url "$BASE_URL/sprints" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"period_id`":$PeriodID,`"name`":`"Sprint 2`",`"start_date`":`"2026-04-15`",`"end_date`":`"2026-04-28`"}"
$SprintID2 = if ($result.data.id) { $result.data.id } else { 2 }

$result = Test-Endpoint -Name "Create Sprint (date outside quarter - 400)" -Method "POST" -Url "$BASE_URL/sprints" -ExpectedStatus 400 -Headers $AuthHeaders -Body "{`"period_id`":$PeriodID,`"name`":`"Bad Sprint`",`"start_date`":`"2026-01-01`",`"end_date`":`"2026-01-14`"}"

$result = Test-Endpoint -Name "Get Sprints by Period" -Method "GET" -Url "$BASE_URL/sprints?period_id=$PeriodID" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Sprint by ID" -Method "GET" -Url "$BASE_URL/sprints/$SprintID" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Activate Sprint" -Method "PATCH" -Url "$BASE_URL/sprints/$SprintID/activate" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Activate Sprint 2 (already active - 422)" -Method "PATCH" -Url "$BASE_URL/sprints/$SprintID2/activate" -ExpectedStatus 422 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Complete Sprint" -Method "PATCH" -Url "$BASE_URL/sprints/$SprintID/complete" -ExpectedStatus 200 -Headers $AuthHeaders -Body '{"review_note":"All done","retro_note":"Need better planning"}'

$result = Test-Endpoint -Name "Complete already completed (422)" -Method "PATCH" -Url "$BASE_URL/sprints/$SprintID/complete" -ExpectedStatus 422 -Headers $AuthHeaders

Write-Host ""

# ---- KEY RESULT ----
Write-Host "--- Key Result ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Create Key Result" -Method "POST" -Url "$BASE_URL/objectives/$ObjID/key-results" -ExpectedStatus 201 -Headers $AuthHeaders -Body '{"title":"Reduce bugs from 50 to 10","target_value":50,"current_value":0,"metric_unit":"bugs fixed","confidence_level":6}'
$KRID = if ($result.data.id) { $result.data.id } else { 1 }

$result = Test-Endpoint -Name "Create Key Result 2" -Method "POST" -Url "$BASE_URL/objectives/$ObjID/key-results" -ExpectedStatus 201 -Headers $AuthHeaders -Body '{"title":"Increase coverage to 90%","target_value":90,"current_value":60,"metric_unit":"%"}'

$result = Test-Endpoint -Name "Update Key Result" -Method "PATCH" -Url "$BASE_URL/key-results/$KRID" -ExpectedStatus 200 -Headers $AuthHeaders -Body '{"current_value":15,"confidence_level":7}'

$result = Test-Endpoint -Name "Update KR (forbidden by user2 - 403)" -Method "PATCH" -Url "$BASE_URL/key-results/$KRID" -ExpectedStatus 403 -Headers $AuthHeaders2 -Body '{"title":"Hacked KR"}'

Write-Host ""

# ---- INITIATIVE ----
Write-Host "--- Initiative ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Create Initiative (root)" -Method "POST" -Url "$BASE_URL/key-results/$KRID/initiatives" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"title`":`"Fix auth bugs`",`"assignee_id`":1,`"sprint_id`":$SprintID2,`"due_date`":`"2026-04-20`"}"
$InitID = if ($result.data.id) { $result.data.id } else { 1 }

$result = Test-Endpoint -Name "Create Child Initiative" -Method "POST" -Url "$BASE_URL/initiatives/$InitID/children" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"title`":`"Fix token expiry`",`"assignee_id`":1,`"sprint_id`":$SprintID2,`"due_date`":`"2026-04-18`"}"
$ChildID = if ($result.data.id) { $result.data.id } else { 2 }

$result = Test-Endpoint -Name "Create Child Initiative 2" -Method "POST" -Url "$BASE_URL/initiatives/$InitID/children" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"title`":`"Fix password reset`",`"assignee_id`":1,`"due_date`":`"2026-04-19`"}"
$ChildID2 = if ($result.data.id) { $result.data.id } else { 3 }

$result = Test-Endpoint -Name "Get Initiative Tree" -Method "GET" -Url "$BASE_URL/key-results/$KRID/initiative-tree" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Update Progress (leaf child)" -Method "PATCH" -Url "$BASE_URL/initiatives/$ChildID/progress" -ExpectedStatus 200 -Headers $AuthHeaders -Body '{"progress":80,"note":"Almost done","blocker":""}'

$result = Test-Endpoint -Name "Update Progress (leaf child 2)" -Method "PATCH" -Url "$BASE_URL/initiatives/$ChildID2/progress" -ExpectedStatus 200 -Headers $AuthHeaders -Body '{"progress":40,"note":"In progress"}'

$result = Test-Endpoint -Name "Update Progress (parent - 422)" -Method "PATCH" -Url "$BASE_URL/initiatives/$InitID/progress" -ExpectedStatus 422 -Headers $AuthHeaders -Body '{"progress":50}'

$result = Test-Endpoint -Name "Update Initiative status" -Method "PATCH" -Url "$BASE_URL/initiatives/$ChildID" -ExpectedStatus 200 -Headers $AuthHeaders -Body '{"status":"IN_PROGRESS"}'

$result = Test-Endpoint -Name "Delete Initiative (cascade)" -Method "DELETE" -Url "$BASE_URL/initiatives/$InitID" -ExpectedStatus 200 -Headers $AuthHeaders

Write-Host ""

# ---- NOTIFICATION ----
Write-Host "--- Notification ---" -ForegroundColor Yellow

# Create a new initiative with near due date for notification test
$result = Test-Endpoint -Name "Create initiative for notification test" -Method "POST" -Url "$BASE_URL/key-results/$KRID/initiatives" -ExpectedStatus 201 -Headers $AuthHeaders -Body "{`"title`":`"Notif test initiative`",`"assignee_id`":1,`"due_date`":`"2026-05-19`"}"

$result = Test-Endpoint -Name "Check Due Initiatives" -Method "POST" -Url "$BASE_URL/notifications/check-due-initiatives" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Notifications" -Method "GET" -Url "$BASE_URL/notifications?page=1&limit=10" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Unread Count" -Method "GET" -Url "$BASE_URL/notifications/unread-count" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Mark All Read" -Method "PATCH" -Url "$BASE_URL/notifications/read-all" -ExpectedStatus 200 -Headers $AuthHeaders

Write-Host ""

# ---- DASHBOARD ----
Write-Host "--- Dashboard ---" -ForegroundColor Yellow

$result = Test-Endpoint -Name "Get Dashboard (by period)" -Method "GET" -Url "$BASE_URL/dashboard?period_id=$PeriodID" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Dashboard (missing period - 400)" -Method "GET" -Url "$BASE_URL/dashboard" -ExpectedStatus 400 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Annual Dashboard" -Method "GET" -Url "$BASE_URL/dashboard/annual?year=2026" -ExpectedStatus 200 -Headers $AuthHeaders

$result = Test-Endpoint -Name "Get Annual Dashboard (missing year - 400)" -Method "GET" -Url "$BASE_URL/dashboard/annual" -ExpectedStatus 400 -Headers $AuthHeaders

Write-Host ""

# ---- SUMMARY ----
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $Pass passed, $Fail failed, $Total total" -ForegroundColor $(if ($Fail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To cleanup test DB: .\api_test.ps1 -Cleanup" -ForegroundColor DarkGray
Write-Host "  Then stop test server with Ctrl+C" -ForegroundColor DarkGray
Write-Host ""

if ($Fail -gt 0) { exit 1 }
