param(
  [Parameter(Mandatory = $false)]
  [switch]$ConfirmReset,

  [Parameter(Mandatory = $false)]
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmReset) {
  Write-Error "Demo reset aborted. Re-run with -ConfirmReset only when you are sure this is demo data."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

Write-Warning "This reset is destructive and is only safe for demo/training data."
Write-Warning "Do not run this script against real pilot office data."

Push-Location $repoRoot.Path
try {
  if (-not $SkipBackup) {
    Write-Output "Creating a safety backup before reset..."
    npm run backup:local
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
