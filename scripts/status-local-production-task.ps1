param(
  [string]$TaskName = "AdjusterDeskLocalProduction"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Get-TaskState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $priorErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $queryOutput = & schtasks.exe /Query /TN $Name /V /FO LIST 2>$null
  $queryExitCode = $LASTEXITCODE
  $ErrorActionPreference = $priorErrorPreference

  if ($queryExitCode -ne 0) {
    return [pscustomobject]@{
      Found = $false
      State = "Not found"
      Raw = $queryOutput
    }
  }

  $stateLine = $queryOutput | Where-Object { $_ -like "Status:*" } | Select-Object -First 1
  $state = "Unknown"
  if ($stateLine) {
    $state = ($stateLine -split ":", 2)[1].Trim()
  }

  return [pscustomobject]@{
    Found = $true
    State = $state
    Raw = $queryOutput
  }
}

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

function Test-UrlResponse {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 10 -ErrorAction Stop
    return "OK ($($response.StatusCode))"
  }
  catch {
    $statusCode = $null
    try {
      $statusCode = $_.Exception.Response.StatusCode.value__
    }
    catch {
      $statusCode = $null
    }

    if ($statusCode) {
      return "HTTP error ($statusCode)"
    }

    return "No response"
  }
}

$task = Get-TaskState -Name $TaskName
Write-Output "Task name: $TaskName"
Write-Output "Task status: $($task.State)"
if (-not $task.Found) {
  Write-Output "Task detail: not found"
}

$processes = Get-Port3000ProcessDetails
$localStatus = Test-UrlResponse -Url "http://127.0.0.1:3000"
$publicStatus = Test-UrlResponse -Url "https://adjusterdesk.xyz/system"

$hasProcessDetails = $processes.Count -gt 0
$isPortListening = $hasProcessDetails -or $localStatus.StartsWith("OK")

Write-Output "Port 3000 listening: $(if ($isPortListening) { "Yes" } else { "No" })"
if ($hasProcessDetails) {
  Write-Output "Port 3000 process details:"
  $processes | Format-Table -AutoSize | Out-String | Write-Output
}

if ($isPortListening -and -not $hasProcessDetails) {
  Write-Output "Port 3000 process details: unavailable in this session."
}

Write-Output "Local URL http://127.0.0.1:3000: $localStatus"
Write-Output "Public URL https://adjusterdesk.xyz/system: $publicStatus"
