param(
  [switch]$CommitAndPush
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==== $message ====" -ForegroundColor Cyan
}

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  if (-not $isAdmin) {
    throw "Run this script from PowerShell as Administrator."
  }
}

function Invoke-Step($description, $scriptBlock) {
  Write-Step $description
  & $scriptBlock
}

function Get-Port3000Listeners {
  try {
    return Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop
  } catch {
    return @()
  }
}

function Show-Port3000 {
  $listeners = @(Get-Port3000Listeners)
  if ($listeners.Count -eq 0) {
    Write-Host "Port 3000 is not listening."
    return
  }

  foreach ($listener in $listeners) {
    $processId = $listener.OwningProcess
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      LocalPort   = $listener.LocalPort
      PID         = $processId
      ProcessName = $proc.ProcessName
      Path        = $proc.Path
    } | Format-List
  }
}

function Stop-Port3000Node {
  $listeners = @(Get-Port3000Listeners)
  if ($listeners.Count -eq 0) {
    Write-Host "No listener on port 3000."
    return
  }

  foreach ($listener in $listeners) {
    $processId = $listener.OwningProcess
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue

    if (-not $proc) {
      Write-Warning "Could not inspect PID $processId."
      continue
    }

    Write-Host "Port 3000 listener: PID=$processId Name=$($proc.ProcessName) Path=$($proc.Path)"

    if ($proc.ProcessName -ne "node") {
      throw "Port 3000 is not owned by node. Refusing to stop PID $processId automatically."
    }

    Write-Host "Stopping node PID $processId on port 3000..."
    Stop-Process -Id $processId -Force
  }
}

function Test-Url($url) {
  Write-Host "Testing $url"
  $response = Invoke-WebRequest $url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 20
  [PSCustomObject]@{
    Url = $url
    StatusCode = $response.StatusCode
    StatusDescription = $response.StatusDescription
  } | Format-Table -AutoSize
}

function Assert-NoSensitiveFilesStaged {
  $staged = @(git diff --cached --name-only)

  $blockedPatterns = @(
    '^\.env$',
    '^\.env\.local$',
    '^\.env\.development\.local$',
    '^\.env\.production\.local$',
    '\.db$',
    '^backups/',
    '^storage/',
    'cloudflared',
    'credentials',
    'token'
  )

  foreach ($file in $staged) {
    foreach ($pattern in $blockedPatterns) {
      if ($file -match $pattern) {
        throw "Refusing to commit sensitive/local artifact: $file"
      }
    }
  }

  Write-Host "No staged env/db/backups/storage/tunnel credential files detected."
}

Assert-Admin

Invoke-Step "Move to repo" {
  Set-Location "C:\Projects\adjusterdesk"
  Write-Host "Current directory: $(Get-Location)"
}

Invoke-Step "Show current git state" {
  git status --short
  git diff --stat
}

Invoke-Step "Run verification suite" {
  npm run prisma:generate
  npm run typecheck
  npm run test
  npm run lint
  npm run build
}

Invoke-Step "Run production backup" {
  npm run prod:backup:local
}

Invoke-Step "Show current port 3000 listener" {
  Show-Port3000
}

Invoke-Step "Stop scheduled task and port 3000 node listener" {
  npm run prod:task:stop -- -ConfirmStop
  Start-Sleep -Seconds 3

  $listeners = @(Get-Port3000Listeners)
  if ($listeners.Count -gt 0) {
    Stop-Port3000Node
    Start-Sleep -Seconds 3
  }

  Show-Port3000
}

Invoke-Step "Install production scheduled task" {
  npm run prod:task:install -- -ConfirmInstall
}

Invoke-Step "Start production scheduled task" {
  npm run prod:task:start
  Start-Sleep -Seconds 8
}

Invoke-Step "Check production task status" {
  npm run prod:task:status
}

Invoke-Step "Verify local and public URLs" {
  Test-Url "http://127.0.0.1:3000"
  Test-Url "https://adjusterdesk.xyz/system"
  Test-Url "https://www.adjusterdesk.xyz"
}

Invoke-Step "Verify latest production backup contains production DB/uploads" {
  npm run prod:backup:local

  $latestProd = Get-ChildItem -Path backups -Directory |
    Where-Object { $_.Name -like "adjusterdesk-production-*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestProd) {
    throw "No production backup folder found."
  }

  $prodDb = Join-Path $latestProd.FullName "prisma\production.db"
  $prodUploads = Join-Path $latestProd.FullName "storage\uploads-production"

  Write-Host "Latest production backup: $($latestProd.FullName)"
  Write-Host "Has production DB: $(Test-Path $prodDb)"
  Write-Host "Has production uploads: $(Test-Path $prodUploads)"

  if (-not (Test-Path $prodDb)) {
    throw "Production DB was not found in latest backup."
  }

  if (-not (Test-Path $prodUploads)) {
    throw "Production uploads folder was not found in latest backup."
  }
}

Invoke-Step "Verify demo reset guardrail refuses default run" {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "cmd.exe"
  $psi.Arguments = "/c npm run demo:reset:local"
  $psi.WorkingDirectory = "C:\Projects\adjusterdesk"
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false

  $process = [System.Diagnostics.Process]::Start($psi)
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($stdout) { Write-Host $stdout }
  if ($stderr) { Write-Host $stderr }

  if ($process.ExitCode -eq 0) {
    throw "demo:reset:local exited 0 without explicit confirmation. Expected it to refuse by default."
  }

  Write-Host "Demo reset refused by default as expected."
}
Invoke-Step "Final git safety check" {
  git status --short --ignored | Select-String ".env|production.db|dev.db|backups|storage" -SimpleMatch
  git status --short
  git diff --stat
}

if ($CommitAndPush) {
  Invoke-Step "Stage intended changes" {
    git add -A
    git diff --cached --name-only
    Assert-NoSensitiveFilesStaged
  }

  Invoke-Step "Commit and push" {
    git commit -m "Add local production task runner"
    git push origin main
  }
} else {
  Write-Step "Commit skipped"
  Write-Host "Run the script again with -CommitAndPush after reviewing output:"
  Write-Host ".\scripts\finish-local-production-runner.ps1 -CommitAndPush"
}

Write-Step "Done"
Write-Host "Local production task setup completed."
Write-Host "Daily commands:"
Write-Host "  npm run prod:deploy:local"
Write-Host "  npm run prod:task:start"
Write-Host "  npm run prod:task:status"
Write-Host "  npm run prod:backup:local"


