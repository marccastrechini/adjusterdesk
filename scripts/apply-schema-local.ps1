param(
  [Parameter(Mandatory = $false)]
  [ValidateSet("development", "production")]
  [string]$Profile = "development",

  [Parameter(Mandatory = $false)]
  [switch]$ConfirmProductionSchema,

  [Parameter(Mandatory = $false)]
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Description,
    [Parameter(Mandatory = $true)]
    [scriptblock]$ScriptBlock
  )

  Write-Output ""
  Write-Output "==> $Description"
  & $ScriptBlock
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE"
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$helperPath = Join-Path $PSScriptRoot "local-runtime.ps1"
. $helperPath

$config = Get-LocalRuntimeConfig -Profile $Profile -RepoRoot $repoRoot
Set-LocalRuntimeEnvironment -Config $config | Out-Null
Assert-LocalRuntimeSafety -Config $config

if ($config.Profile -eq "production" -and -not $ConfirmProductionSchema) {
  Write-Error "Production schema apply aborted. Re-run with -ConfirmProductionSchema after taking or confirming a production backup."
}

Push-Location $repoRoot
try {
  if ($config.Profile -eq "production" -and -not $SkipBackup) {
    Invoke-Step -Description "npm run prod:backup:local" -ScriptBlock { npm run prod:backup:local }
  }

  Invoke-Step -Description "npm run prisma:generate" -ScriptBlock { npm run prisma:generate }
  Invoke-Step -Description "npm run db:push" -ScriptBlock { npm run db:push }
}
finally {
  Pop-Location
}

Write-Output ""
Write-Output "Schema apply complete for $($config.Profile) profile."