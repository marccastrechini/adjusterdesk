param(
  [int]$Port = 3000,
  [string]$BindHost = "127.0.0.1",
  [switch]$AllowProductionDatabase
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$helperPath = Join-Path $PSScriptRoot "local-runtime.ps1"
. $helperPath

$config = Get-LocalRuntimeConfig -Profile "development" -RepoRoot $repoRoot
Set-LocalRuntimeEnvironment -Config $config | Out-Null
Assert-LocalRuntimeSafety -Config $config -AllowProductionDatabase:$AllowProductionDatabase

$buildIdPath = Join-Path $repoRoot ".next\BUILD_ID"

Write-LocalRuntimeSummary -Config $config -Heading "Starting AdjusterDesk development runtime..."
Write-Output "Repo: $repoRoot"
Write-Output "Binding: http://${BindHost}:$Port"
Write-Output "NODE_ENV=$($env:NODE_ENV)"
Write-Output ""

if (-not (Test-Path $buildIdPath -PathType Leaf)) {
  Write-Output "No production build found. This development runtime will still start with next dev."
}

Push-Location $repoRoot
try {
  npm run dev -- -H $BindHost -p $Port
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1) {
    throw "Development runtime exited with code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}