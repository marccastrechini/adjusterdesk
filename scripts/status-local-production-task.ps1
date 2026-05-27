param(
  [string]$TaskName = "AdjusterDeskLocalProduction"
)

$ErrorActionPreference = "Stop"

$queryFailed = $false
try {
  $taskQuery = & schtasks.exe /Query /TN $TaskName /V /FO LIST 2>&1
}
catch {
  $queryFailed = $true
  $taskQuery = $_.ToString()
}

if ($queryFailed -or $LASTEXITCODE -ne 0) {
  Write-Output "Scheduled task not found: $TaskName"
}
else {
  Write-Output $taskQuery
}

$listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Output "Port 3000 listener: not found"
  return
}

$processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
$processes = Get-Process -Id $processIds -ErrorAction SilentlyContinue

Write-Output "Port 3000 listener: active"
if ($processes) {
  $processes | Select-Object Id, ProcessName, StartTime | Format-Table -AutoSize
}
