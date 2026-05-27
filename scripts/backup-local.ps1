param(
  [ValidateSet("development", "production")]
  [string]$Profile = "development",
  [string]$BackupRoot = "backups"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$helperPath = Join-Path $PSScriptRoot "local-runtime.ps1"
. $helperPath

$config = Get-LocalRuntimeConfig -Profile $Profile -RepoRoot $repoRoot
Set-LocalRuntimeEnvironment -Config $config | Out-Null
Assert-LocalRuntimeSafety -Config $config

$backupBase = Join-Path $repoRoot $BackupRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupBase "adjusterdesk-$Profile-$timestamp"

$databasePath = $config.DatabaseUrl.Substring(5)
$databaseFiles = @(
  $databasePath,
  "$databasePath-wal",
  "$databasePath-shm",
  "$databasePath-journal"
)

$uploadsPath = Join-Path $repoRoot $config.UploadsDir
$profileEnvPath = $config.ProfileEnvPath
$sharedEnvPath = $config.SharedEnvPath

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

foreach ($relativePath in $databaseFiles) {
  $sourcePath = Join-Path $repoRoot $relativePath
  if (Test-Path $sourcePath) {
    $targetPath = Join-Path $backupDir $relativePath
    $targetParent = Split-Path $targetPath -Parent
    New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    Copy-Item $sourcePath $targetPath -Force
  }
}

if (Test-Path $uploadsPath) {
  $uploadsTargetRoot = Split-Path -Parent (Join-Path $backupDir $config.UploadsDir)
  New-Item -ItemType Directory -Path $uploadsTargetRoot -Force | Out-Null
  Copy-Item $uploadsPath (Join-Path $backupDir $config.UploadsDir) -Recurse -Force
}

foreach ($envPath in @($profileEnvPath, $sharedEnvPath)) {
  if (Test-Path $envPath -PathType Leaf) {
    $targetEnvPath = Join-Path $backupDir (Split-Path $envPath -Leaf)
    Copy-Item $envPath $targetEnvPath -Force
  }
}

$manifestPath = Join-Path $backupDir "backup-manifest.txt"
$manifest = @(
  "AdjusterDesk local backup ($Profile)",
  "Created: $(Get-Date -Format s)",
  "Computer: $env:COMPUTERNAME",
  "Repo root: $repoRoot",
  "Profile env file: $profileEnvPath",
  "Shared env file: $sharedEnvPath",
  "Database path: $databasePath",
  "Uploads path: $($config.UploadsDir)",
  "Included profile env: $(Test-Path $profileEnvPath)",
  "Included shared env: $(Test-Path $sharedEnvPath)"
)
$manifest | Set-Content -Path $manifestPath

Write-Output "Created local backup at: $backupDir"
