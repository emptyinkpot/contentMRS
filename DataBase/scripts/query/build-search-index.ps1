param(
  [int]$Limit = 20,
  [int]$ChunkChars = 1800,
  [switch]$Apply
)

$argsList = @(
  "$PSScriptRoot\build_search_index.py",
  "--limit", [string]$Limit,
  "--chunk-chars", [string]$ChunkChars
)

if ($Apply) { $argsList += "--apply" }

python @argsList
