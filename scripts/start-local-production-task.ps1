param(
  [string]$TaskName = "AdjusterDeskLocalProduction"
)

$ErrorActionPreference = "Stop"

& schtasks.exe /Run /TN $TaskName | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Scheduled task not found or failed to start: $TaskName"
}

Write-Output "Started scheduled task: $TaskName"
Write-Output "Check detailed state with: npm run prod:task:status"
