param(
  [Parameter(Mandatory = $false)]
  [switch]$ConfirmReset,

  [Parameter(Mandatory = $false)]
  [switch]$ConfirmProductionReset,

  [Parameter(Mandatory = $false)]
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmReset) {
  Write-Error "Demo reset aborted. Re-run with -ConfirmReset only when you are sure this is demo data."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$helperPath = Join-Path $scriptDir "local-runtime.ps1"
. $helperPath

$profile = if ($ConfirmProductionReset) { "production" } else { "development" }
$config = Get-LocalRuntimeConfig -Profile $profile -RepoRoot $repoRoot.Path
Set-LocalRuntimeEnvironment -Config $config | Out-Null

if ($config.Profile -eq "production" -and -not $ConfirmProductionReset) {
  Write-Error "Demo reset aborted. Production data requires -ConfirmProductionReset and a production profile file."
}

if ($config.Profile -eq "production") {
  Write-Error "Demo reset aborted. Full production database reseeding is disabled. Use npm run prod:demo:bootstrap -- -ConfirmProductionDemo for the firm-scoped production demo workspace refresh."
}

Assert-LocalRuntimeSafety -Config $config

Write-Warning "This reset is destructive and is only safe for demo/training data."
if ($config.Profile -eq "production") {
  Write-Warning "Production demo reset confirmed. Use only when you explicitly intend to reseed the production demo profile."
}
else {
  Write-Warning "Do not run this script against real pilot office data."
}

Push-Location $repoRoot.Path
try {
  if (-not $SkipBackup) {
    Write-Output "Creating a safety backup before reset..."
    if ($config.Profile -eq "production") {
      npm run prod:backup:local
    }
    else {
      npm run backup:local
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Backup failed. Reset cancelled."
    }
  }

  Write-Output "Resetting and reseeding local demo data..."
  npm run db:seed
  if ($LASTEXITCODE -ne 0) {
    throw "Seed failed."
  }
}
finally {
  Pop-Location
}

Write-Output "Demo reset complete."
