param(
  [switch]$AllowDirty
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
$config = Get-LocalRuntimeConfig -Profile "production" -RepoRoot $repoRoot
Set-LocalRuntimeEnvironment -Config $config | Out-Null
Assert-LocalRuntimeSafety -Config $config

Push-Location $repoRoot
try {
  if (-not $AllowDirty) {
    $status = git status --short
    if ($status) {
      Write-Output "Working tree is not clean:"
      Write-Output $status
      Write-Error "Deploy aborted. Commit/stash changes or re-run with -AllowDirty."
    }
  }

  Invoke-Step -Description "git pull --ff-only" -ScriptBlock { git pull --ff-only }
  Invoke-Step -Description "npm install" -ScriptBlock { npm install }
  Invoke-Step -Description "npm run prod:schema:apply -- -ConfirmProductionSchema" -ScriptBlock { npm run prod:schema:apply -- -ConfirmProductionSchema }
  Invoke-Step -Description "npm run build" -ScriptBlock { npm run build }
}
finally {
  Pop-Location
}

Write-Output ""
Write-Output "Local production deploy/update completed."
Write-Output "Next steps:"
Write-Output "1. Restart the scheduled task: npm run prod:task:stop -- -ConfirmStop ; npm run prod:task:start"
Write-Output "2. Or run directly: npm run prod:run:local"
Write-Output "3. Verify: http://127.0.0.1:3000 and http://localhost:3000"
