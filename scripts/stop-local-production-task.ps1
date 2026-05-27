param(
  [string]$TaskName = "AdjusterDeskLocalProduction",
  [switch]$ConfirmStopPort3000Process
)

$ErrorActionPreference = "Stop"

& schtasks.exe /End /TN $TaskName | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Scheduled task not found or not running: $TaskName"
}
else {
  Write-Output "Stop requested for scheduled task: $TaskName"
}

$listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Output "No listening process found on port 3000."
  return
}

$processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique

if (-not $ConfirmStopPort3000Process) {
  Write-Warning "A process is still listening on port 3000. Re-run with -ConfirmStopPort3000Process to stop it."
  Get-Process -Id $processIds -ErrorAction SilentlyContinue | Select-Object Id, ProcessName | Format-Table -AutoSize
  return
}

foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $processId -Force
    Write-Output "Stopped process on port 3000: ID=$processId Name=$($process.ProcessName)"
  }
}
