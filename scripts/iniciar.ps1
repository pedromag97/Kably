# Arranca o Kably + túnel Cloudflare e mostra o endereço público.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

# Localizar o cloudflared (instalado via winget)
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
  $candidate = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
  if (Test-Path $candidate) { $cloudflared = $candidate }
  else { Write-Error "cloudflared não encontrado. Instala com: winget install Cloudflare.cloudflared"; exit 1 }
} else { $cloudflared = $cloudflared.Source }

# 1) Servidor Kably (se ainda não estiver a correr na porta 3000)
$running = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $running) {
  Write-Host "A arrancar o servidor Kably..." -ForegroundColor Cyan
  Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $root -WindowStyle Minimized
  $tries = 0
  while (-not (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Start-Sleep -Seconds 1
    $tries++
    if ($tries -gt 60) { Write-Error "O servidor não arrancou em 60s."; exit 1 }
  }
}
Write-Host "Servidor Kably a correr em http://localhost:3000" -ForegroundColor Green

# 2) Túnel Cloudflare (URL pública gratuita — muda a cada arranque do túnel)
Write-Host "A abrir o túnel Cloudflare..." -ForegroundColor Cyan
$log = Join-Path $env:TEMP "kably-tunnel.log"
Remove-Item $log -ErrorAction SilentlyContinue
$tunnel = Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", "http://localhost:3000" -RedirectStandardError $log -WindowStyle Hidden -PassThru

$url = $null
$tries = 0
while (-not $url -and $tries -lt 30) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
  $tries++
}

if ($url) {
  Write-Host ""
  Write-Host "==============================================" -ForegroundColor Yellow
  Write-Host "  Kably acessível em:  $url" -ForegroundColor Yellow
  Write-Host "==============================================" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Abre este endereço no telemóvel e entra com a palavra-passe do .env.local."
  Write-Host "Nota: o endereço muda sempre que o túnel reinicia."
  Write-Host "Fecha esta janela (ou Ctrl+C) para desligar o túnel."
  Wait-Process -Id $tunnel.Id
} else {
  Write-Error "Não foi possível obter o URL do túnel. Vê o log: $log"
}
