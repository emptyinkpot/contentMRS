# Clone or pull ContentMRS parallel repos from GitHub
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$repos = @{
  DataBase = 'https://github.com/emptyinkpot/DataBase.git'
  ContentBase = 'https://github.com/emptyinkpot/ContentBase.git'
  'fanqie-service' = 'https://github.com/emptyinkpot/fanqie-service.git'
  ContentAdmin = 'https://github.com/emptyinkpot/ContentAdmin.git'
  OpenList = 'https://github.com/emptyinkpot/OpenList.git'
}
foreach ($entry in $repos.GetEnumerator()) {
  $dest = Join-Path $root $entry.Key
  if (Test-Path (Join-Path $dest '.git')) {
    Write-Host "pull $($entry.Key)"
    git -C $dest pull --ff-only
  } else {
    Write-Host "clone $($entry.Key)"
    git clone -- $entry.Value $dest
  }
}
