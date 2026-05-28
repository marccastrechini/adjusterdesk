param(
  [string]$TaskName = "AdjusterDeskLocalProduction",
  [switch]$ConfirmStop
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Get-Port3000ProcessDetails {
  $processIds = @()

  $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if ($listeners) {
    $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  }

  if (-not $processIds -or $processIds.Count -eq 0) {
    $netstatMatches = netstat -ano -p tcp | Select-String -Pattern "^\s*TCP\s+\S+:3000\s+\S+\s+LISTENING\s+(\d+)"
    if ($netstatMatches) {
      $processIds = $netstatMatches | ForEach-Object {
        [int]($_.Matches[0].Groups[1].Value)
      } | Select-Object -Unique
    }
  }

  if (-not $processIds -or $processIds.Count -eq 0) {
    return @()
  }

  $details = @()

  foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $process) {
      continue
    }

    $exePath = $null
    try {
      $exePath = (Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue).ExecutablePath
    }
    catch {
      $exePath = $null
    }

    $details += [pscustomobject]@{
      Id = $process.Id
      ProcessName = $process.ProcessName
      Path = $(if ($exePath) { $exePath } else { "Unavailable" })
    }
  }

  return $details
}

$priorErrorPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& schtasks.exe /End /TN $TaskName 2>$null | Out-Null
$taskExitCode = $LASTEXITCODE
$ErrorActionPreference = $priorErrorPreference

if ($taskExitCode -ne 0) {
  Write-Warning "Scheduled task not found or not running: $TaskName"
}
else {
  Write-Output "Stop requested for scheduled task: $TaskName"
}

$processes = Get-Port3000ProcessDetails
if (-not $processes -or $processes.Count -eq 0) {
  Write-Output "No listening process found on port 3000."
  return
}

Write-Output "Port 3000 listener details:"
$processes | Format-Table -AutoSize | Out-String | Write-Output

if (-not $ConfirmStop) {
  Write-Warning "A process is still listening on port 3000. Re-run with -ConfirmStop to stop node.exe listeners."
  return
}

foreach ($process in $processes) {
  if ($process.ProcessName -ieq "node") {
    try {
      Stop-Process -Id $process.Id -Force
      Write-Output "Stopped node listener on port 3000: PID=$($process.Id) Path=$($process.Path)"
    }
    catch {
      Write-Warning "Could not stop node listener on port 3000: PID=$($process.Id) Path=$($process.Path). Run from an elevated PowerShell session."
    }
  }
  else {
    Write-Warning "Process on port 3000 is not node.exe and was not stopped: PID=$($process.Id) Name=$($process.ProcessName) Path=$($process.Path)"
  }
}
