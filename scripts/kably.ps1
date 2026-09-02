# Arranca o Kably no teu PC, ligado a base de dados na cloud (Turso).
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\kably.ps1            (so neste PC)
#   powershell -ExecutionPolicy Bypass -File scripts\kably.ps1 -rede      (tambem telemovel/tablet na mesma rede)
#   powershell -ExecutionPolicy Bypass -File scripts\kably.ps1 -recompilar (depois de atualizacoes ao codigo)

param(
  [switch]$rede,
  [switch]$recompilar
)

$ErrorActionPreference = "Stop"
$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj

# --- Verificacoes basicas -------------------------------------------------
if (-not (Test-Path ".env.local")) {
  Write-Host "ERRO: falta o ficheiro .env.local (com DATABASE_URL e DATABASE_AUTH_TOKEN)." -ForegroundColor Red
  exit 1
}
$dbLine = (Select-String -Path ".env.local" -Pattern "^DATABASE_URL=").Line
if ($dbLine -notmatch "libsql://") {
  Write-Host "AVISO: o DATABASE_URL nao aponta para a cloud (Turso):" -ForegroundColor Yellow
  Write-Host "  $dbLine" -ForegroundColor Yellow
  Write-Host "  Estarias a trabalhar numa base de dados local/de teste." -ForegroundColor Yellow
  $r = Read-Host "Continuar mesmo assim? (s/N)"
  if ($r -ne "s") { exit 1 }
}

# --- Compilar se preciso --------------------------------------------------
if ($recompilar -and (Test-Path ".next")) { Remove-Item -Recurse -Force ".next" }
if (-not (Test-Path ".next")) {
  Write-Host "A compilar a aplicacao (demora cerca de 1 minuto)..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Host "A compilacao falhou." -ForegroundColor Red; exit 1 }
}

# --- Arrancar -------------------------------------------------------------
Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "   KABLY  -  orcamentos Lousacabo" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "   Neste PC:   http://localhost:3000"

if ($rede) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" } |
    Select-Object -First 1).IPAddress
  if ($ip) { Write-Host "   Telemovel:  http://${ip}:3000   (mesma rede Wi-Fi)" }
  Write-Host "   (na 1a vez, o Windows pede autorizacao na firewall)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "   Entra com: pedromag997@gmail.com"
Write-Host "   Para parar: fecha esta janela ou Ctrl+C"
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "http://localhost:3000"

if ($rede) { npx next start -H 0.0.0.0 -p 3000 } else { npx next start -p 3000 }
