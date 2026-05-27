param(
  [string]$Repository,
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$planPath = Join-Path $repoRoot "ecosystem\repository-consolidation.json"
$ecosystemPath = Join-Path $repoRoot "ecosystem\repos.json"

if (-not (Test-Path $planPath)) {
  throw "Missing consolidation inventory: $planPath"
}

$plan = Get-Content -Raw -Path $planPath | ConvertFrom-Json
$ecosystem = if (Test-Path $ecosystemPath) {
  Get-Content -Raw -Path $ecosystemPath | ConvertFrom-Json
} else {
  $null
}

function To-Array($value) {
  if ($null -eq $value) { return @() }
  return @($value)
}

function Contains-Repo($list, $name) {
  return (To-Array $list) -contains $name
}

function Get-RepoStatus($name) {
  $statuses = @()
  foreach ($property in $plan.statuses.PSObject.Properties) {
    if (Contains-Repo $property.Value $name) {
      $statuses += $property.Name
    }
  }
  return $statuses
}

function Get-EcosystemRecord($name) {
  if ($null -eq $ecosystem -or $null -eq $ecosystem.repositories) {
    return $null
  }
  return @($ecosystem.repositories | Where-Object { $_.name -eq $name }) | Select-Object -First 1
}

function New-AuditResult($name) {
  $statuses = Get-RepoStatus $name
  $record = Get-EcosystemRecord $name
  $doNotTouch = Contains-Repo $plan.doNotTouchWithoutExplicitApproval $name
  $mergePlan = @($plan.mergePlans | Where-Object {
    $_.target -eq $name -or (To-Array $_.sources) -contains $name
  } | ForEach-Object { $_.id })

  $recommendedAction = "inspect"
  $archiveAllowed = $false
  $deleteAllowed = $false
  $mergeRequired = $false
  $blockers = @()

  if ($doNotTouch -or $statuses -contains "keep-active") {
    $recommendedAction = "keep-active"
    $blockers += "do-not-touch-or-active-source"
  } elseif ($statuses -contains "merge-source") {
    $recommendedAction = "merge-before-archive"
    $mergeRequired = $true
    $blockers += "requires-merge-target-validation"
  } elseif ($statuses -contains "delete-after-backup") {
    $recommendedAction = "delete-only-after-backup-review"
    $archiveAllowed = $true
    $deleteAllowed = $false
    $blockers += "backup-and-reference-scan-required"
  } elseif ($statuses -contains "archive-candidate") {
    $recommendedAction = "archive-candidate"
    $archiveAllowed = $true
    $blockers += "reference-scan-required"
  }

  [pscustomobject]@{
    repository = $name
    statuses = $statuses
    ecosystemStatus = if ($record) { $record.status } else { $null }
    role = if ($record) { $record.repositoryRole } else { $null }
    preferredSource = if ($record) { $record.preferredSource } else { $null }
    doNotTouchWithoutExplicitApproval = $doNotTouch
    mergePlans = $mergePlan
    recommendedAction = $recommendedAction
    archiveAllowedAfterChecks = $archiveAllowed
    deleteAllowedNow = $deleteAllowed
    mergeRequiredBeforeArchive = $mergeRequired
    blockers = $blockers
  }
}

$names = if ($Repository) {
  @($Repository)
} else {
  $all = @()
  foreach ($property in $plan.statuses.PSObject.Properties) {
    $all += To-Array $property.Value
  }
  $all | Sort-Object -Unique
}

$results = @($names | ForEach-Object { New-AuditResult $_ })

if ($Json) {
  $results | ConvertTo-Json -Depth 8
} else {
  $results |
    Sort-Object recommendedAction, repository |
    Select-Object repository, recommendedAction, archiveAllowedAfterChecks, deleteAllowedNow, mergeRequiredBeforeArchive, statuses, blockers |
    Format-Table -AutoSize
}
