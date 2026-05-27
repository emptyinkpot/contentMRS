param(
  [int]$Limit = 20,
  [string]$Model = $env:DATA_CURATION_MODEL,
  [string]$BaseUrl = $env:DATA_CURATION_OPENAI_BASE_URL,
  [string]$ApiKey = $env:DATA_CURATION_OPENAI_API_KEY,
  [switch]$IncludeTiny,
  [switch]$Apply
)

$argsList = @(
  "$PSScriptRoot\curate_knowledge_items.py",
  "--limit", [string]$Limit
)
if ($Model) { $argsList += @("--model", $Model) }
if ($BaseUrl) { $argsList += @("--base-url", $BaseUrl) }
if ($ApiKey) { $argsList += @("--api-key", $ApiKey) }
if ($IncludeTiny) { $argsList += "--include-tiny" }
if ($Apply) { $argsList += "--apply" }

python @argsList
