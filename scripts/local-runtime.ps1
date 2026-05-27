function Read-LocalEnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $values = [ordered]@{}

  if (-not (Test-Path $Path -PathType Leaf)) {
    return $values
  }

  foreach ($line in Get-Content -Path $Path) {
    $trimmedLine = $line.Trim()
    if (-not $trimmedLine -or $trimmedLine.StartsWith("#")) {
      continue
    }

    $separatorIndex = $trimmedLine.IndexOf("=")
    if ($separatorIndex -le 0) {
      continue
    }

    $key = $trimmedLine.Substring(0, $separatorIndex).Trim()
    $value = $trimmedLine.Substring($separatorIndex + 1).Trim()

    if ((($value.StartsWith('"')) -and ($value.EndsWith('"'))) -or (($value.StartsWith("'")) -and ($value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $values[$key] = $value
  }

  return $values
}

function Merge-EnvValues {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$BaseValues,
    [Parameter(Mandatory = $true)]
    [hashtable]$OverrideValues
  )

  $mergedValues = [ordered]@{}

  foreach ($pair in $BaseValues.GetEnumerator()) {
    $mergedValues[$pair.Key] = $pair.Value
  }

  foreach ($pair in $OverrideValues.GetEnumerator()) {
    $mergedValues[$pair.Key] = $pair.Value
  }

  return $mergedValues
}

function Normalize-UploadsDir {
  param(
    [Parameter(Mandatory = $true)]
    [string]$UploadsDir
  )

  return $UploadsDir.Trim().Replace("\\", "/").TrimEnd("/")
}

function Normalize-AppBaseUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AppBaseUrl
  )

  return $AppBaseUrl.Trim().TrimEnd("/")
}

function Get-LocalRuntimeConfig {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "production")]
    [string]$Profile,
    [Parameter(Mandatory = $false)]
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  )

  $profileEnvPath = Join-Path $RepoRoot ".env.$Profile.local"
  if (-not (Test-Path $profileEnvPath -PathType Leaf)) {
    throw "Missing $profileEnvPath. Copy .env.$Profile.example to .env.$Profile.local first."
  }

  $sharedEnvPath = Join-Path $RepoRoot ".env"
  $profileValues = Read-LocalEnvFile -Path $profileEnvPath
  $sharedValues = Read-LocalEnvFile -Path $sharedEnvPath
  $values = Merge-EnvValues -BaseValues $sharedValues -OverrideValues $profileValues

  $configuredAppEnv = $values["APP_ENV"]
  if ($configuredAppEnv -and $configuredAppEnv -ne $Profile) {
    throw "Expected APP_ENV=$Profile in $profileEnvPath, but found APP_ENV=$configuredAppEnv."
  }

  $databaseUrl = $values["DATABASE_URL"]
  if (-not $databaseUrl) {
    $databaseUrl = if ($Profile -eq "production") { "file:./prisma/production.db" } else { "file:./prisma/dev.db" }
  }

  $uploadsDir = $values["UPLOADS_DIR"]
  if (-not $uploadsDir) {
    $uploadsDir = if ($Profile -eq "production") { "storage/uploads-production" } else { "storage/uploads-development" }
  }

  $appBaseUrl = $values["APP_BASE_URL"]
  if (-not $appBaseUrl) {
    $appBaseUrl = if ($Profile -eq "production") { "https://adjusterdesk.xyz" } else { "http://localhost:3000" }
  }

  $normalizedUploadsDir = Normalize-UploadsDir -UploadsDir $uploadsDir
  $normalizedAppBaseUrl = Normalize-AppBaseUrl -AppBaseUrl $appBaseUrl
  $expectedDatabaseFragment = if ($Profile -eq "production") { "production.db" } else { "dev.db" }
  $expectedUploadsFragment = if ($Profile -eq "production") { "uploads-production" } else { "uploads-development" }
  $expectedAppBaseUrl = if ($Profile -eq "production") { "https://adjusterdesk.xyz" } else { "http://localhost:3000" }

  return [pscustomobject]@{
    Profile = $Profile
    RepoRoot = $RepoRoot
    ProfileEnvPath = $profileEnvPath
    SharedEnvPath = $sharedEnvPath
    Values = $values
    AppEnv = $Profile
    DatabaseUrl = $databaseUrl.Trim()
    UploadsDir = $normalizedUploadsDir
    AppBaseUrl = $normalizedAppBaseUrl
    ExpectedDatabaseFragment = $expectedDatabaseFragment
    ExpectedUploadsFragment = $expectedUploadsFragment
    ExpectedAppBaseUrl = $expectedAppBaseUrl
  }
}

function Set-LocalRuntimeEnvironment {
  param(
    [Parameter(Mandatory = $true)]
    $Config
  )

  foreach ($pair in $Config.Values.GetEnumerator()) {
    Set-Item -Path "Env:$($pair.Key)" -Value $pair.Value
  }

  $env:APP_ENV = $Config.AppEnv
  $env:DATABASE_URL = $Config.DatabaseUrl
  $env:UPLOADS_DIR = $Config.UploadsDir
  $env:APP_BASE_URL = $Config.AppBaseUrl
  $env:NODE_ENV = if ($Config.Profile -eq "production") { "production" } else { "development" }

  return $Config
}

function Test-LocalDatabaseUrlMatchesProfile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "production")]
    [string]$Profile
  )

  return $DatabaseUrl -match ($(if ($Profile -eq "production") { "production\.db" } else { "dev\.db" }))
}

function Test-LocalUploadsDirMatchesProfile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$UploadsDir,
    [Parameter(Mandatory = $true)]
    [ValidateSet("development", "production")]
    [string]$Profile
  )

  return $UploadsDir -match ($(if ($Profile -eq "production") { "uploads-production" } else { "uploads-development" }))
}

function Write-LocalRuntimeSummary {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $true)]
    [string]$Heading
  )

  Write-Output $Heading
  Write-Output "Profile: $($Config.Profile)"
  Write-Output "Env file: $($Config.ProfileEnvPath)"
  Write-Output "Shared env fallback: $($Config.SharedEnvPath)"
  Write-Output "APP_ENV=$($Config.AppEnv)"
  Write-Output "DATABASE_URL=$($Config.DatabaseUrl)"
  Write-Output "UPLOADS_DIR=$($Config.UploadsDir)"
  Write-Output "APP_BASE_URL=$($Config.AppBaseUrl)"
  Write-Output ""
}

function Assert-LocalRuntimeSafety {
  param(
    [Parameter(Mandatory = $true)]
    $Config,
    [Parameter(Mandatory = $false)]
    [switch]$AllowProductionDatabase
  )

  $databaseMatchesProfile = Test-LocalDatabaseUrlMatchesProfile -DatabaseUrl $Config.DatabaseUrl -Profile $Config.Profile
  if (-not $databaseMatchesProfile) {
    if ($Config.Profile -eq "development" -and $Config.DatabaseUrl -match "production\.db") {
      if (-not $AllowProductionDatabase) {
        throw "Development runtime is pointed at the production database. Re-run with -AllowProductionDatabase only if you are intentionally debugging against production data."
      }
    }
    else {
      throw "Runtime database does not match the selected $($Config.Profile) profile: $($Config.DatabaseUrl)"
    }
  }

  $uploadsMatchesProfile = Test-LocalUploadsDirMatchesProfile -UploadsDir $Config.UploadsDir -Profile $Config.Profile
  if (-not $uploadsMatchesProfile) {
    throw "Runtime uploads directory does not match the selected $($Config.Profile) profile: $($Config.UploadsDir)"
  }

  if ($Config.AppBaseUrl -ne $Config.ExpectedAppBaseUrl) {
    throw "Runtime APP_BASE_URL does not match the selected $($Config.Profile) profile: $($Config.AppBaseUrl)"
  }
}