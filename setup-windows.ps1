$ErrorActionPreference = 'Stop'

Write-Host "PharmaTrace Ethereum - Windows setup" -ForegroundColor Cyan
Write-Host ""

$node = node -v
Write-Host "Detected Node.js: $node"
if ($node -notmatch '^v(22\.(1[0-9]|[2-9][0-9])|2[3-4]\.)') {
  throw "Please install Node.js 22.10+ or Node.js 24 LTS, open a new PowerShell window, and run this script again."
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path "$root\backend\.env")) {
  Copy-Item "$root\backend\.env.example" "$root\backend\.env"
  Write-Host "Created backend\.env from the example file." -ForegroundColor Green
}

Write-Host "Checking Docker Desktop..." -ForegroundColor Yellow
docker version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop is not running." }

docker compose up -d

Write-Host "Installing blockchain dependencies..." -ForegroundColor Yellow
npm --prefix .\blockchain install
npm --prefix .\blockchain run compile

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm --prefix .\backend install
npm --prefix .\backend test

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm --prefix .\frontend install

Write-Host "Setup completed." -ForegroundColor Green
Write-Host ""
Write-Host "Next run three PowerShell terminals:" -ForegroundColor Cyan
Write-Host "1) npm run blockchain:node" -ForegroundColor White
Write-Host "2) npm run blockchain:deploy; npm run blockchain:check:runtime; npm run backend:db:init; npm run backend:dev" -ForegroundColor White
Write-Host "3) npm run frontend:dev" -ForegroundColor White
