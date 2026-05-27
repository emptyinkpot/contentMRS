param(
  [Parameter(Mandatory=$true)]
  [string]$Query,
  [int]$Limit = 10
)

python "$PSScriptRoot\search_database.py" $Query --limit $Limit
