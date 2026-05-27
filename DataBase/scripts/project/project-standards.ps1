param(
  [Parameter(Mandatory=$true, Position=0)]
  [ValidateSet("init", "upsert", "show")]
  [string]$Command
)

$ErrorActionPreference = "Stop"

$mysql = Join-Path $HOME ".codex-runtime\bin\mysql-myblog.cmd"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Invoke-MySqlSql {
  param([Parameter(Mandatory=$true)][string]$Sql)

  $tmp = New-TemporaryFile
  try {
    Set-Content -Path $tmp -Value $Sql -Encoding UTF8
    Get-Content -Raw -Path $tmp | & $mysql --batch --raw --default-character-set=utf8mb4 --binary-mode=1
  } finally {
    Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
  }
}

function SqlString {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) {
    return "NULL"
  }
  $escaped = $Value.Replace("\", "\\").Replace("'", "''")
  return "'" + $escaped + "'"
}

$standardJson = @{
  schemaVersion = 1
  name = "project-creation-standard"
  purpose = "Define the minimum contract for creating reusable projects in the operator ecosystem."
  status = "active"
  requiredFiles = @(
    "README.md",
    "project.json",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "SUPPORT.md",
    "docs/",
    "schemas/",
    "services/",
    "scripts/"
  )
  requiredBoundaries = @(
    "source",
    "runtime",
    "deployment",
    "consumer",
    "configuration",
    "secret",
    "verification"
  )
  productizationLadder = @(
    @{ stage = "script"; shape = "one command works"; nextStep = "add docs and env example" },
    @{ stage = "module"; shape = "functions are reusable"; nextStep = "add typed inputs and outputs" },
    @{ stage = "client"; shape = "remote API wrapper exists"; nextStep = "add errors and request id" },
    @{ stage = "adapter"; shape = "consumer-specific wrapper exists"; nextStep = "add verification" },
    @{ stage = "package"; shape = "stable exports exist"; nextStep = "add versioning and changelog" },
    @{ stage = "service"; shape = "runtime deployed"; nextStep = "add health logs and operations docs" }
  )
  acceptanceChecklist = @(
    "README explains what the project is",
    "project.json records machine-readable identity",
    "docs say where to edit and where to deploy",
    "secrets are not guessed",
    "a smoke or verify command exists",
    "external consumers use a client adapter or API",
    "package boundaries exist when code is reused by more than one consumer"
  )
  scaffoldCommand = '.\scripts\project\init-project.ps1 -Name MyProject -Root "E:\My Project\MyProject"'
  validationCommand = '.\scripts\project\check-project-standard.ps1 -Root "E:\My Project\MyProject"'
} | ConvertTo-Json -Depth 8 -Compress

$standardMarkdown = Get-Content -Raw -LiteralPath (Join-Path $repoRoot "docs\contracts\project-creation-standard.md")

switch ($Command) {
  "init" {
    Invoke-MySqlSql @"
CREATE TABLE IF NOT EXISTS project_creation_standards (
  id varchar(128) NOT NULL PRIMARY KEY,
  name varchar(160) NOT NULL,
  status varchar(32) NOT NULL,
  standard_json json NOT NULL,
  standard_markdown mediumtext NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"@
    break
  }
  "upsert" {
    & $PSCommandPath init | Out-Null
    $sql = @"
INSERT INTO project_creation_standards
(id, name, status, standard_json, standard_markdown)
VALUES (
  'project-creation-standard-v1',
  'project-creation-standard',
  'active',
  CAST($(SqlString $standardJson) AS JSON),
  $(SqlString $standardMarkdown)
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  standard_json = VALUES(standard_json),
  standard_markdown = VALUES(standard_markdown);
"@
    Invoke-MySqlSql $sql
    break
  }
  "show" {
    Invoke-MySqlSql @"
SELECT JSON_OBJECT(
  'id', id,
  'name', name,
  'status', status,
  'updatedAt', updated_at
) AS standard
FROM project_creation_standards
ORDER BY updated_at DESC;
"@
    break
  }
}
