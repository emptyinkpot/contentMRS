param(
  [Parameter(Mandatory=$true, Position=0)]
  [ValidateSet("status", "search", "rebuild-index", "curate")]
  [string]$Command,

  [string]$Query,
  [int]$Limit = 10,
  [int]$ChunkChars = 1800,
  [switch]$Apply,
  [switch]$IncludeTiny
)

$ErrorActionPreference = "Stop"

switch ($Command) {
  "status" {
    & "$PSScriptRoot\mysql-status.ps1"
    break
  }
  "search" {
    if (-not $Query) {
      throw "database-query search requires -Query"
    }
    & "$PSScriptRoot\search-database.ps1" -Query $Query -Limit $Limit
    break
  }
  "rebuild-index" {
    if ($Apply) {
      & "$PSScriptRoot\build-search-index.ps1" -Limit $Limit -ChunkChars $ChunkChars -Apply
    } else {
      & "$PSScriptRoot\build-search-index.ps1" -Limit $Limit -ChunkChars $ChunkChars
    }
    break
  }
  "curate" {
    $curationScript = Join-Path (Split-Path -Parent $PSScriptRoot) "curation\curate-knowledge-items.ps1"
    if ($Apply -and $IncludeTiny) {
      & $curationScript -Limit $Limit -Apply -IncludeTiny
    } elseif ($Apply) {
      & $curationScript -Limit $Limit -Apply
    } elseif ($IncludeTiny) {
      & $curationScript -Limit $Limit -IncludeTiny
    } else {
      & $curationScript -Limit $Limit
    }
    break
  }
}
