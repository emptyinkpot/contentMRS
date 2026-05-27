param(
  [string]$ContentBaseRoot = "E:\My Project\ContentBase",
  [string[]]$GuardedTables = @(
    "works",
    "chapters",
    "characters",
    "story_backgrounds",
    "outlines",
    "volume_outlines",
    "chapter_outlines",
    "world_settings",
    "story_events",
    "character_growth",
    "important_items",
    "notes",
    "experience_records",
    "content_works",
    "content_parts",
    "content_blocks",
    "content_assets",
    "content_relations",
    "publication_targets",
    "publication_records",
    "author_profiles",
    "semantic_units",
    "semantic_tag_taxonomy",
    "semantic_unit_tags",
    "semantic_relations",
    "vocabulary",
    "banned_words"
  ),
  [switch]$ReportAll
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path -LiteralPath $ContentBaseRoot
$novelRoot = Join-Path $root "product\novel"

if (-not (Test-Path -LiteralPath $novelRoot)) {
  Write-Host "ContentBase novel product not found: $novelRoot"
  exit 1
}

$rg = Get-Command rg -ErrorAction SilentlyContinue
if (-not $rg) {
  Write-Host "ripgrep is required for canonical SQL boundary check"
  exit 1
}

$guardedPattern = [string]::Join("|", ($GuardedTables | ForEach-Object { [regex]::Escape($_) }))
$guardPattern = '\b(FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+[`"]?(' + $guardedPattern + ')[`"]?\b|COUNT\s*\(\s*\*\s*\).*?\bFROM\s+[`"]?(' + $guardedPattern + ')[`"]?\b'
$allPattern = '\b(FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+[`"''"]?([a-zA-Z_][a-zA-Z0-9_]*)[`"''"]?\b'
$sourceFilePattern = '\.(ts|tsx|js|jsx|mjs|cjs)$'
$knownLegacyDebt = @()

function Invoke-Ripgrep {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Pattern
  )

  $results = & $rg.Source `
    --line-number `
    --ignore-case `
    --hidden `
    --glob "!dist/**" `
    --glob "!node_modules/**" `
    --glob "!coverage/**" `
    --glob "!*.map" `
    --glob "!*.md" `
    --glob "!*.json" `
    $Pattern `
    $novelRoot

  $code = $LASTEXITCODE
  if ($code -eq 1) {
    return @()
  }
  if ($code -ne 0) {
    Write-Host "ripgrep failed while checking ContentBase canonical SQL boundary"
    exit $code
  }
  return @($results)
}

function ConvertTo-SqlReference {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Line
  )

  if ($Line -notmatch '^(?<path>[A-Za-z]:\\.*?):(?<line>\d+):(?<text>.*)$') {
    return $null
  }

  $path = $Matches["path"]
  $lineNumber = [int]$Matches["line"]
  $text = $Matches["text"]
  if ($path -notmatch $sourceFilePattern) {
    return $null
  }
  if ($text -match '^\s*(import|export)\b') {
    return $null
  }
  if ($text -match '^\s*}\s+from\s+[''"]') {
    return $null
  }
  if ($text -match '\bfrom\s+[''"][^''"]+[''"]') {
    return $null
  }
  if ($text -match '^\s*(it|test|describe)\s*\(') {
    return $null
  }
  if ($text -match '^\s*throw\s+new\s+Error\(') {
    return $null
  }
  if ($text -match '^\s*jsonRes\(') {
    return $null
  }
  if ($text -match '^\s*description\s*:') {
    return $null
  }
  if ($text -match '^\s*["''][^"'']*\bfrom\b[^"'']*["'']\s*,?\s*$') {
    return $null
  }
  if ($text -match '^\s*//') {
    return $null
  }
  if ($text -notmatch $allPattern) {
    return $null
  }
  $verb = ($Matches[1] -replace '\s+', ' ').ToUpperInvariant()
  $table = $Matches[2].ToLowerInvariant()
  if ($verb -eq "UPDATE" -and $table -eq "current_timestamp") {
    return $null
  }
  if ($table -eq "information_schema") {
    return $null
  }

  [pscustomobject]@{
    Path = $path
    Line = $lineNumber
    Verb = $verb
    Table = $table
    Text = $text.Trim()
  }
}

$guardReferences = @(Invoke-Ripgrep -Pattern $guardPattern | ForEach-Object { ConvertTo-SqlReference -Line $_ } | Where-Object { $_ })
$newGuardViolations = @($guardReferences | Where-Object {
  $relativePath = $_.Path.Substring($root.Path.Length).TrimStart("\", "/")
  $key = ("{0}|{1}" -f $relativePath, $_.Table)
  $knownLegacyDebt -notcontains $key
})

if ($ReportAll) {
  $allMatches = Invoke-Ripgrep -Pattern $allPattern
  $references = @($allMatches | ForEach-Object { ConvertTo-SqlReference -Line $_ } | Where-Object { $_ })

  if ($references.Count -eq 0) {
    Write-Host "contentbase direct SQL radar: no table references found"
  } else {
    Write-Host "contentbase direct SQL radar:"
    $references |
      Group-Object Table |
      Sort-Object Name |
      ForEach-Object {
        Write-Host ("- {0}: {1}" -f $_.Name, $_.Count)
      }
    Write-Host ""
    Write-Host "details:"
    $references |
      Sort-Object Table, Path, Line |
      ForEach-Object {
        Write-Host ("{0}:{1}: {2} {3} :: {4}" -f $_.Path, $_.Line, $_.Verb, $_.Table, $_.Text)
      }
  }
  if ($guardReferences.Count -gt 0) {
    Write-Host ""
    Write-Host "guarded canonical table references:"
    $guardReferences |
      Sort-Object Table, Path, Line |
      ForEach-Object {
        $relativePath = $_.Path.Substring($root.Path.Length).TrimStart("\", "/")
        $key = ("{0}|{1}" -f $relativePath, $_.Table)
        $status = if ($knownLegacyDebt -contains $key) { "known-migration-debt" } else { "unregistered-boundary-violation" }
        Write-Host ("{0}:{1}: {2} {3} [{4}] :: {5}" -f $_.Path, $_.Line, $_.Verb, $_.Table, $status, $_.Text)
      }
  }
  Write-Host ""
}

if ($newGuardViolations.Count -eq 0) {
  Write-Host ("contentbase canonical SQL boundary ok; guarded tables: {0}" -f ($GuardedTables -join ", "))
  if ($guardReferences.Count -gt 0) {
    Write-Host ("known migration debt remains: {0}" -f $guardReferences.Count)
  }
  exit 0
}

Write-Host "contentbase canonical SQL boundary failed"
Write-Host ("Direct SQL against guarded canonical tables was found under: {0}" -f $novelRoot)
Write-Host ("Guarded tables: {0}" -f ($GuardedTables -join ", "))
Write-Host ""
$newGuardViolations | ForEach-Object {
  Write-Host ("{0}:{1}: {2} {3} :: {4}" -f $_.Path, $_.Line, $_.Verb, $_.Table, $_.Text)
}
Write-Host ""
Write-Host "Use the generated DataBase Gateway SDK instead of direct SQL for guarded canonical tables, or register existing legacy debt in the migration matrix before tightening this gate."
exit 1
