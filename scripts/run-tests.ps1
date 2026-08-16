$ErrorActionPreference = "Stop"

Write-Host "[TEST] Lancement des tests P0 Kimoxa..." -ForegroundColor Cyan

# Chargement .env.test
$envTestPath = Join-Path $PSScriptRoot "..\.env.test"
if (-not (Test-Path $envTestPath)) { $envTestPath = ".env.test" }

if (Test-Path $envTestPath) {
    Get-Content $envTestPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Count -eq 2) {
                [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }
    }
}

if (-not $env:DATABASE_URL_TESTING) {
    Write-Host "[ERROR] DATABASE_URL_TESTING manquant" -ForegroundColor Red
    exit 1
}

# Tuer tout node residuel
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Forcer port 3000
$env:DATABASE_URL = $env:DATABASE_URL_TESTING
$env:PORT = "3000"

Write-Host "[INFO] Demarrage serveur sur port 3000..." -ForegroundColor Yellow
$server = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-p", "3000" -PassThru -NoNewWindow

# Attente serveur pret
Write-Host "[INFO] Attente serveur (90s)..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -ErrorAction Stop
        $ready = $true
        break
    } catch {
        if ($_.Exception.Message -match "200|404|302") {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host "[ERROR] Serveur non demarre" -ForegroundColor Red
    Stop-Process -Id $server.Id -Force
    exit 1
}

# TEST DIAGNOSTIC : verifier que le helper repond
Write-Host "[DIAG] Test endpoint /api/test-helpers/create-user..." -ForegroundColor Yellow
try {
    $diagBody = @{ email = "diagtest@kimoxa.test"; password = "Test1234"; role = "buyer"; full_name = "Diag" } | ConvertTo-Json
    $diagResp = Invoke-RestMethod -Uri http://localhost:3000/api/test-helpers/create-user -Method POST -ContentType "application/json" -Body $diagBody
    Write-Host "[DIAG OK] Helper repond : $diagResp" -ForegroundColor Green
} catch {
    Write-Host "[DIAG FAIL] Helper ne repond pas :" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    Stop-Process -Id $server.Id -Force
    exit 1
}

Write-Host "[TEST] Execution des 16 tests..." -ForegroundColor Cyan
$exitCode = 0
try {
    node --test scripts/e2e-p0.test.mjs
    $exitCode = $LASTEXITCODE
} finally {
    Write-Host "[INFO] Arret serveur..." -ForegroundColor Gray
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}

if ($exitCode -eq 0) {
    Write-Host "[SUCCESS] TOUS LES TESTS SONT PASSES" -ForegroundColor Green
} else {
    Write-Host "[FAIL] CERTAINS TESTS ONT ECHOUE" -ForegroundColor Red
}

exit $exitCode