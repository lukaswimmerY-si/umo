# UMO installieren und automatische Updates einrichten (Windows).
# Aufruf in PowerShell:  irm https://github.com/__REPO__/releases/latest/download/install-windows.ps1 | iex
param([string]$Repo = "__REPO__")
$ErrorActionPreference = "Stop"
if ($Repo.StartsWith("__")) { Write-Host "Bitte das GitHub-Repository angeben, z. B.: .\install-windows.ps1 -Repo studio-ysi/umo"; return }
$Base = Join-Path $env:LOCALAPPDATA "UMO"; $Dir = Join-Path $Base "umo-extension"
New-Item -ItemType Directory -Force -Path $Base | Out-Null
Write-Host "UMO wird geladen ..."
$tmp = Join-Path $env:TEMP ("umo-" + [guid]::NewGuid()); New-Item -ItemType Directory -Path $tmp | Out-Null
Invoke-WebRequest "https://github.com/$Repo/releases/latest/download/umo-extension.zip" -OutFile "$tmp\umo.zip" -UseBasicParsing
Expand-Archive "$tmp\umo.zip" "$tmp\new" -Force
if (-not (Test-Path "$tmp\new\manifest.json")) { throw "Das Paket ist ungueltig." }
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
robocopy "$tmp\new" $Dir /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
Remove-Item $tmp -Recurse -Force

$Updater = @'
# UMO Updater fuer Windows. Wird alle 15 Minuten von der Aufgabenplanung gestartet. Log: %LOCALAPPDATA%\UMO\update.log
$Base = Join-Path $env:LOCALAPPDATA "UMO"; $Dir = Join-Path $Base "umo-extension"; $Log = Join-Path $Base "update.log"
function Log($m) { Add-Content $Log ("{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $m) }
try {
  $cfg = Get-Content (Join-Path $Dir "umo-config.json") -Raw | ConvertFrom-Json
  if (-not $cfg.updateManifestUrl) { exit 0 }
  $v = Invoke-RestMethod ($cfg.updateManifestUrl + "?t=" + [DateTimeOffset]::Now.ToUnixTimeSeconds()) -UseBasicParsing
  $cur = (Get-Content (Join-Path $Dir "manifest.json") -Raw | ConvertFrom-Json).version
  if ([version]$v.version -le [version]$cur) { exit 0 }
  $tmp = Join-Path $env:TEMP ("umo-" + [guid]::NewGuid()); New-Item -ItemType Directory -Path $tmp | Out-Null
  Invoke-WebRequest $v.zip -OutFile "$tmp\umo.zip" -UseBasicParsing
  Expand-Archive "$tmp\umo.zip" "$tmp\new" -Force
  $newVer = (Get-Content "$tmp\new\manifest.json" -Raw | ConvertFrom-Json).version
  if ($newVer -ne $v.version) { Log "Paket $($v.version) ist ungueltig"; exit 0 }
  robocopy "$tmp\new" $Dir /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  Remove-Item $tmp -Recurse -Force
  Log "Aktualisiert: $cur -> $($v.version)"
} catch { Log ("Fehler: " + $_.Exception.Message) }
'@
Set-Content -Path (Join-Path $Base "update-umo.ps1") -Value $Updater -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Base\update-umo.ps1`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "UMO Updater" -Action $action -Trigger $trigger -Description "Holt neue UMO-Versionen" -Force | Out-Null

Write-Host ""
Write-Host "Fertig. UMO liegt in: $Dir"
Write-Host "Automatische Updates sind eingerichtet (alle 15 Minuten)."
Write-Host ""
Write-Host "Nur beim ersten Mal in Chrome:"
Write-Host "  1. chrome://extensions oeffnen"
Write-Host "  2. Oben rechts den Entwicklermodus einschalten"
Write-Host "  3. 'Entpackte Erweiterung laden' und diesen Ordner waehlen: $Dir"
Start-Process explorer.exe $Base
