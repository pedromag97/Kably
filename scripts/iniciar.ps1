# Arranca o Kably + túnel Cloudflare e regista o endereço público.
# Uso manual:    powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1
# Uso automático: atalho na pasta Startup do Windows (criado uma vez).
#
# O endereço público fica guardado em:
#   - data\tunnel-url.txt (na pasta do projeto)
#   - "Kably - endereco.txt" no Ambiente de Trabalho
# Se TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID estiverem no .env.local,
# o endereço é também enviado por Telegram a cada arranque.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

# Localizar o cloudflared (instalado via winget)
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflared) { $cloudflared = $cloudflared.Source }
else {
  $candidate = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
  if (Test-Path $candidate) { $cloudflared = $candidate }
  else { Write-Error "cloudflared não encontrado. Instala com: winget install Cloudflare.cloudflared"; exit 1 }
}

# Túneis órfãos de arranques anteriores dariam URLs mortos — limpar primeiro.
try { Stop-Process -Name cloudflared -Force -Confirm:$false -ErrorAction Stop } catch {}

# 1) Servidor Kably (se ainda não estiver a correr na porta 3000)
$running = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $running) {
  Write-Host "A arrancar o servidor Kably..." -ForegroundColor Cyan
  Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $root -WindowStyle Hidden
  $tries = 0
  while (-not (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Start-Sleep -Seconds 1
    $tries++
    if ($tries -gt 90) { Write-Error "O servidor não arrancou em 90s."; exit 1 }
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
while (-not $url -and $tries -lt 45) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
  $tries++
}

if (-not $url) {
  Write-Error "Não foi possível obter o URL do túnel. Vê o log: $log"
  exit 1
}

# 3) Registar o endereço onde o Pedro o encontra
$stamp = Get-Date -Format "dd/MM/yyyy HH:mm"
$note = "Kably acessível em:`r`n$url`r`n`r`n(arrancado em $stamp — o endereço muda a cada reinício do túnel)"
New-Item -ItemType Directory -Force (Join-Path $root "data") | Out-Null
$note | Out-File -Encoding utf8 (Join-Path $root "data\tunnel-url.txt")
$note | Out-File -Encoding utf8 (Join-Path ([Environment]::GetFolderPath("Desktop")) "Kably - endereco.txt")

# 4) Telegram (opcional): envia o endereço se houver credenciais no .env.local
$envFile = Join-Path $root ".env.local"
if (Test-Path $envFile) {
  $envVars = @{}
  Get-Content $envFile | Where-Object { $_ -match "^\s*([^#=]+)=(.*)$" } | ForEach-Object {
    $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
  }
  if ($envVars["TELEGRAM_BOT_TOKEN"] -and $envVars["TELEGRAM_CHAT_ID"]) {
    try {
      $body = @{ chat_id = $envVars["TELEGRAM_CHAT_ID"]; text = "⚡ Kably no ar: $url" }
      Invoke-RestMethod -Uri "https://api.telegram.org/bot$($envVars['TELEGRAM_BOT_TOKEN'])/sendMessage" -Method Post -Body $body | Out-Null
      Write-Host "Endereço enviado por Telegram." -ForegroundColor Green
    } catch {
      Write-Host "Falha ao enviar por Telegram: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "  Kably acessível em:  $url" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Endereço guardado em 'Kably - endereco.txt' no Ambiente de Trabalho."
Wait-Process -Id $tunnel.Id
