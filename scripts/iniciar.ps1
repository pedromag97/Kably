# Arranca o Kably + túnel Cloudflare, regista o endereço público e fica a vigiar.
# Uso manual:    powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1
# Uso automático: atalho na pasta Startup do Windows (criado uma vez).
#
# O endereço público fica guardado em:
#   - data\tunnel-url.txt (na pasta do projeto)
#   - "Kably - endereco.txt" no Ambiente de Trabalho
#   - "Kably - endereco.txt" no pCloud (se o disco P: estiver montado)
# Se TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID estiverem no .env.local,
# o endereço é também enviado por Telegram sempre que muda.
#
# Depois de arrancar, o script verifica de minuto a minuto se o servidor e o
# túnel respondem. Os túneis gratuitos caem sem aviso (p. ex. depois de o PC
# suspender) e ficam com o processo vivo mas o endereço morto — nesse caso
# abre-se um túnel novo e o endereço novo é registado e enviado.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$log = Join-Path $env:TEMP "kably-tunnel.log"
$checkEvery = 60   # segundos entre verificações
$maxFails = 3      # verificações falhadas seguidas até reabrir o túnel

# Localizar o cloudflared (instalado via winget)
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflared) { $cloudflared = $cloudflared.Source }
else {
  $candidate = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
  if (Test-Path $candidate) { $cloudflared = $candidate }
  else { Write-Error "cloudflared não encontrado. Instala com: winget install Cloudflare.cloudflared"; exit 1 }
}

# Só pode haver um vigilante: dois a correr matariam o túnel um do outro.
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match '-File\s+"?[^"]*iniciar\.ps1' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction Stop } catch {} }

function Test-Server {
  return [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
}

function Test-Url($u) {
  try { Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 15 | Out-Null; return $true }
  catch { return $false }
}

function Start-Server {
  Write-Host "A arrancar o servidor Kably..." -ForegroundColor Cyan
  Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $root -WindowStyle Hidden
  $tries = 0
  while (-not (Test-Server)) {
    Start-Sleep -Seconds 1
    $tries++
    if ($tries -gt 90) { return $false }
  }
  return $true
}

# Abre um túnel Cloudflare (URL pública gratuita — muda a cada arranque do
# túnel) e devolve o endereço, ou $null se não o conseguir obter.
function Start-Tunnel {
  # Túneis órfãos de arranques anteriores dariam URLs mortos — limpar primeiro.
  try { Stop-Process -Name cloudflared -Force -Confirm:$false -ErrorAction Stop; Start-Sleep -Seconds 1 } catch {}
  Remove-Item $log -ErrorAction SilentlyContinue
  Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", "http://localhost:3000" -RedirectStandardError $log -WindowStyle Hidden
  $tries = 0
  while ($tries -lt 45) {
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
      $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches | Select-Object -First 1
      if ($m) { return $m.Matches[0].Value }
    }
    $tries++
  }
  return $null
}

# Regista o endereço onde o Pedro o encontra: ficheiros, Telegram e pCloud.
function Publish-Address($url) {
  $stamp = Get-Date -Format "dd/MM/yyyy HH:mm"
  $ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" } |
    Select-Object -First 1).IPAddress
  $lines = @("Kably acessível em:", "", "  Internet (qualquer lado):  $url")
  if ($ip) { $lines += "  Mesma rede (Wi-Fi/cabo):   http://${ip}:3000" }
  $lines += "  Neste PC:                  http://localhost:3000"
  $lines += ""
  $lines += "(túnel aberto em $stamp — o endereço da internet muda sempre que o túnel reinicia)"
  $note = $lines -join "`r`n"
  New-Item -ItemType Directory -Force (Join-Path $root "data") | Out-Null
  $note | Out-File -Encoding utf8 (Join-Path $root "data\tunnel-url.txt")
  $note | Out-File -Encoding utf8 (Join-Path ([Environment]::GetFolderPath("Desktop")) "Kably - endereco.txt")

  # Telegram (opcional): envia o endereço se houver credenciais no .env.local
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

  # Cópia da nota no pCloud. O disco P: monta uns segundos depois do arranque
  # do Windows — esperar um pouco, e seguir em frente se não aparecer.
  $pcloud = "P:\Geral-pCloud\Lsc-Pedro\07 KABLY"
  $tries = 0
  while (-not (Test-Path $pcloud) -and $tries -lt 30) { Start-Sleep -Seconds 2; $tries++ }
  if (Test-Path $pcloud) {
    try { $note | Out-File -Encoding utf8 (Join-Path $pcloud "Kably - endereco.txt") }
    catch { Write-Host "Falha ao escrever a nota no pCloud: $($_.Exception.Message)" -ForegroundColor Yellow }
  }

  Write-Host ""
  Write-Host "==============================================" -ForegroundColor Yellow
  Write-Host "  Kably acessível em:  $url" -ForegroundColor Yellow
  Write-Host "==============================================" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Endereço guardado em 'Kably - endereco.txt' no Ambiente de Trabalho."
}

# 1) Servidor Kably (se ainda não estiver a correr na porta 3000)
if (-not (Test-Server)) {
  if (-not (Start-Server)) { Write-Error "O servidor não arrancou em 90s."; exit 1 }
}
Write-Host "Servidor Kably a correr em http://localhost:3000" -ForegroundColor Green

# 2) Túnel + registo do endereço, e depois vigiar (até fechar a janela)
$url = $null   # endereço público atual ($null = sem túnel a funcionar)
$fails = 0     # verificações falhadas seguidas
while ($true) {
  try {
    if (-not (Test-Server)) {
      Write-Host "Servidor em baixo — a rearrancar..." -ForegroundColor Yellow
      Start-Server | Out-Null
    }
    elseif (-not $url) {
      Write-Host "A abrir o túnel Cloudflare..." -ForegroundColor Cyan
      $url = Start-Tunnel
      $fails = 0
      if ($url) { Publish-Address $url }
      else { Write-Host "Não foi possível obter o URL do túnel (log: $log). Nova tentativa a seguir." -ForegroundColor Yellow }
    }
    elseif (Test-Url "$url/login") { $fails = 0 }
    elseif ((Test-Url "http://localhost:3000/login") -and (Test-Url "https://www.cloudflare.com/cdn-cgi/trace")) {
      # A app responde neste PC e há internet: o problema é mesmo o túnel.
      $fails++
      if ($fails -ge $maxFails) {
        Write-Host "Túnel sem resposta — vai ser aberto um novo." -ForegroundColor Yellow
        $url = $null
      }
    }
  } catch {
    Write-Host "Erro na vigilância: $($_.Exception.Message)" -ForegroundColor Yellow
  }
  Start-Sleep -Seconds $checkEvery
}
