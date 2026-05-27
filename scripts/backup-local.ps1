param(
  [string]$BackupRoot = "backups"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupBase = Join-Path $repoRoot $BackupRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupBase "adjusterdesk-$timestamp"

$databaseFiles = @(
  "prisma\dev.db",
  "prisma\dev.db-wal",
  "prisma\dev.db-shm",
  "prisma\dev.db-journal"
)

$uploadsPath = Join-Path $repoRoot "storage\uploads"
$envPath = Join-Path $repoRoot ".env"

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
  Copy-Item $uploadsPath (Join-Path $backupDir "storage") -Recurse -Force
}

if (Test-Path $envPath) {
  Copy-Item $envPath (Join-Path $backupDir ".env") -Force
}

$manifestPath = Join-Path $backupDir "backup-manifest.txt"
$manifest = @(
  "AdjusterDesk local backup",
  "Created: $(Get-Date -Format s)",
  "Computer: $env:COMPUTERNAME",
  "Repo root: $repoRoot",
  "Database default: prisma/dev.db",
  "Uploads default: storage/uploads",
  "Included .env: $(Test-Path $envPath)"
)
$manifest | Set-Content -Path $manifestPath

Write-Output "Created local backup at: $backupDir"
