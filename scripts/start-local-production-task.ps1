param(
  [string]$TaskName = "AdjusterDeskLocalProduction"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$priorErrorPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& schtasks.exe /Run /TN $TaskName 2>$null | Out-Null
$taskExitCode = $LASTEXITCODE
$ErrorActionPreference = $priorErrorPreference

if ($taskExitCode -ne 0) {
  Write-Error "Scheduled task not found or failed to start: $TaskName"
}

Write-Output "Started scheduled task: $TaskName"
Write-Output "Check detailed state with: npm run prod:task:status"
