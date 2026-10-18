$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "PharmaTrace Ethereum starter" -ForegroundColor Cyan

if (-not (Test-Path "$root\backend\.env")) {
  Copy-Item "$root\backend\.env.example" "$root\backend\.env"
}

docker compose up -d

if (-not (Test-Path "$root\blockchain\node_modules")) { npm --prefix .\blockchain install }
if (-not (Test-Path "$root\backend\node_modules")) { npm --prefix .\backend install }
if (-not (Test-Path "$root\frontend\node_modules")) { npm --prefix .\frontend install }

Write-Host "Dependencies ready." -ForegroundColor Green
Write-Host "PowerShell 1: npm run blockchain:node" -ForegroundColor White
Write-Host "PowerShell 2: npm run blockchain:compile; npm run blockchain:deploy; npm run blockchain:check:runtime; npm run backend:db:init; npm run backend:dev" -ForegroundColor White
Write-Host "PowerShell 3: npm run frontend:dev" -ForegroundColor White
