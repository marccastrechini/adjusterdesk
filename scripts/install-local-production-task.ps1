param(
  [string]$TaskName = "AdjusterDeskLocalProduction",
  [switch]$ConfirmInstall
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmInstall) {
  Write-Error "Install aborted. Re-run with -ConfirmInstall to create/update the scheduled task."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runScriptPath = Join-Path $repoRoot "scripts\run-local-production.ps1"

if (-not (Test-Path $runScriptPath -PathType Leaf)) {
  Write-Error "Run script not found: $runScriptPath"
}

$command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$runScriptPath`""

& schtasks.exe /Create /TN $TaskName /SC ONLOGON /RL LIMITED /TR $command /F | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install/update scheduled task $TaskName"
}

Write-Output "Scheduled task installed/updated: $TaskName"
Write-Output "Task action: powershell -> scripts/run-local-production.ps1"
Write-Output "Working directory in command: $repoRoot"
Write-Output "Trigger: At log on"
