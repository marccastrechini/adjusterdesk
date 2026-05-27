param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,

  [Parameter(Mandatory = $false)]
  [ValidateSet("development", "production")]
  [string]$Profile = "development",

  [Parameter(Mandatory = $false)]
  [string]$TargetRoot,

  [Parameter(Mandatory = $false)]
  [switch]$ConfirmRestore,

  [Parameter(Mandatory = $false)]
  [switch]$RestoreEnv
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmRestore) {
  Write-Error "Restore aborted. Re-run with -ConfirmRestore after you confirm the app is stopped."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$helperPath = Join-Path $scriptDir "local-runtime.ps1"
. $helperPath
$config = Get-LocalRuntimeConfig -Profile $Profile -RepoRoot $repoRoot.Path
$env:APP_ENV = $config.AppEnv
$resolvedBackupPath = Resolve-Path $BackupPath -ErrorAction Stop

if (-not $TargetRoot) {
  $TargetRoot = $repoRoot.Path
}

$resolvedTargetRoot = Resolve-Path $TargetRoot -ErrorAction Stop

$backupPrismaDir = Join-Path $resolvedBackupPath.Path "prisma"
$backupStorageDir = Join-Path $resolvedBackupPath.Path $config.UploadsDir
$backupEnvPath = Join-Path $resolvedBackupPath.Path (Split-Path $config.ProfileEnvPath -Leaf)
$backupSharedEnvPath = Join-Path $resolvedBackupPath.Path ".env"

if (-not (Test-Path $backupPrismaDir -PathType Container)) {
  Write-Error "Backup is missing prisma folder: $backupPrismaDir"
}

$targetPrismaDir = Join-Path $resolvedTargetRoot.Path "prisma"
$targetStorageRoot = Join-Path $resolvedTargetRoot.Path "storage"
$targetUploadsDir = Join-Path $targetStorageRoot $config.UploadsDir
$targetEnvPath = Join-Path $resolvedTargetRoot.Path ".env"
$targetProfileEnvPath = Join-Path $resolvedTargetRoot.Path (Split-Path $config.ProfileEnvPath -Leaf)

if (-not (Test-Path $targetPrismaDir -PathType Container)) {
  New-Item -ItemType Directory -Path $targetPrismaDir -Force | Out-Null
}

if (-not (Test-Path $targetUploadsDir -PathType Container)) {
  New-Item -ItemType Directory -Path $targetUploadsDir -Force | Out-Null
}

Write-Output "Restoring database files from $($resolvedBackupPath.Path) to $($resolvedTargetRoot.Path)..."

Get-ChildItem -Path $targetPrismaDir -Filter "*$($config.ExpectedDatabaseFragment)*" -File -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item $_.FullName -Force
}

Get-ChildItem -Path $backupPrismaDir -Filter "*$($config.ExpectedDatabaseFragment)*" -File | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination (Join-Path $targetPrismaDir $_.Name) -Force
}

Write-Output "Restoring uploads folder..."
if (Test-Path $targetUploadsDir -PathType Container) {
  Remove-Item -Path $targetUploadsDir -Recurse -Force
}
if (Test-Path $backupStorageDir -PathType Container) {
  Copy-Item -Path $backupStorageDir -Destination $targetStorageRoot -Recurse -Force
}
else {
  New-Item -ItemType Directory -Path $targetUploadsDir -Force | Out-Null
  Write-Warning "Backup has no storage/uploads folder. Restored uploads as an empty folder."
}

if ($RestoreEnv) {
  if (Test-Path $backupEnvPath -PathType Leaf) {
    Copy-Item -Path $backupEnvPath -Destination $targetProfileEnvPath -Force
    Write-Output "Restored profile env file."
  }
  else {
    Write-Warning "-RestoreEnv was used but backup has no profile env file."
  }

  if (Test-Path $backupSharedEnvPath -PathType Leaf) {
    Copy-Item -Path $backupSharedEnvPath -Destination $targetEnvPath -Force
    Write-Output "Restored shared .env file."
  }
  else {
    Write-Warning "-RestoreEnv was used but backup has no shared .env file."
  }
}

Write-Output "Restore complete."
Write-Output "If Next.js is running, restart the app before continuing."
