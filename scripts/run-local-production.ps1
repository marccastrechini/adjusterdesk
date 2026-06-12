param(
  [int]$Port = 3000,
  [string]$BindHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$helperPath = Join-Path $PSScriptRoot "local-runtime.ps1"
. $helperPath

$logDirectory = Join-Path $repoRoot "logs"
if (-not (Test-Path $logDirectory -PathType Container)) {
  New-Item -ItemType Directory -Path $logDirectory | Out-Null
}

$logFilePath = Join-Path $logDirectory "local-production-live.log"
$transcriptStarted = $false
try {
  Start-Transcript -Path $logFilePath -Append | Out-Null
  $transcriptStarted = $true
}
catch {
  Write-Warning "Could not start transcript logging at $logFilePath"
}

$config = Get-LocalRuntimeConfig -Profile "production" -RepoRoot $repoRoot
Set-LocalRuntimeEnvironment -Config $config | Out-Null
Assert-LocalRuntimeSafety -Config $config

$buildIdPath = Join-Path $repoRoot ".next\BUILD_ID"

if (-not (Test-Path $buildIdPath -PathType Leaf)) {
  Write-Error "No production build found. Run npm run build before starting local production."
}

Write-LocalRuntimeSummary -Config $config -Heading "Starting AdjusterDesk local production runtime..."
Write-Output "Repo: $repoRoot"
Write-Output "Binding: http://${BindHost}:$Port"
Write-Output "NODE_ENV=$($env:NODE_ENV)"
Write-Output "Runtime log: $logFilePath"
Write-Output ""
Write-Output "Transcript logging is enabled and appends to the runtime log file."
Write-Output ""

Push-Location $repoRoot
try {
  npm run start -- -H $BindHost -p $Port
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1) {
    throw "Production runtime exited with code $LASTEXITCODE"
  }
  if ($LASTEXITCODE -eq -1) {
    Write-Output "Production runtime stopped."
  }
}
finally {
  Pop-Location

  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
  }
}
