param(
  [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

$mysql = Join-Path $HOME ".codex-runtime\bin\mysql-myblog.cmd"
if (-not (Test-Path -LiteralPath $mysql)) {
  throw "mysql-myblog command not found: $mysql"
}

$projectJsonPath = Join-Path $ProjectRoot "project.json"
if (-not (Test-Path -LiteralPath $projectJsonPath)) {
  throw "project.json not found: $projectJsonPath"
}

$project = Get-Content -Raw -LiteralPath $projectJsonPath | ConvertFrom-Json
$manifestJson = Get-Content -Raw -LiteralPath $projectJsonPath

function SqlString {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return "NULL" }
  $escaped = $Value.Replace("\", "\\").Replace("'", "''")
  return "'" + $escaped + "'"
}

$projectId = if ($project.githubRepo) { $project.githubRepo } else { $project.name }
$sql = @"
CREATE TABLE IF NOT EXISTS project_directory (
  project_id varchar(255) NOT NULL PRIMARY KEY,
  name varchar(160) NOT NULL,
  project_name varchar(160) NOT NULL,
  github_repo varchar(512) NOT NULL,
  visibility varchar(32) NOT NULL,
  project_type varchar(64) NOT NULL,
  status varchar(32) NOT NULL,
  canonical_doc varchar(128) NOT NULL,
  machine_readable_entry varchar(128) NOT NULL,
  source_of_truth varchar(255) NULL,
  runtime_location varchar(255) NULL,
  deployment_target varchar(255) NULL,
  manifest_version int NOT NULL DEFAULT 1,
  manifest_json json NOT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_directory_github_repo (github_repo),
  KEY idx_project_directory_type (project_type),
  KEY idx_project_directory_status (status),
  KEY idx_project_directory_visibility (visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO project_directory
(project_id, name, project_name, github_repo, visibility, project_type, status, canonical_doc, machine_readable_entry, source_of_truth, runtime_location, deployment_target, manifest_version, manifest_json)
VALUES
(
  $(SqlString $projectId),
  $(SqlString $project.name),
  $(SqlString $project.projectName),
  $(SqlString $project.githubRepo),
  $(SqlString $project.visibility),
  $(SqlString $project.type),
  $(SqlString $project.status),
  $(SqlString $project.canonicalDoc),
  $(SqlString $project.machineReadableEntry),
  $(SqlString $project.sourceOfTruth),
  $(SqlString $project.runtimeLocation),
  $(SqlString $project.deploymentTarget),
  1,
  CAST($(SqlString $manifestJson) AS JSON)
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  project_name = VALUES(project_name),
  visibility = VALUES(visibility),
  project_type = VALUES(project_type),
  status = VALUES(status),
  canonical_doc = VALUES(canonical_doc),
  machine_readable_entry = VALUES(machine_readable_entry),
  source_of_truth = VALUES(source_of_truth),
  runtime_location = VALUES(runtime_location),
  deployment_target = VALUES(deployment_target),
  manifest_version = VALUES(manifest_version),
  manifest_json = VALUES(manifest_json);
"@

$tmp = New-TemporaryFile
try {
  Set-Content -Path $tmp -Value $sql -Encoding UTF8
  Get-Content -Raw -Path $tmp | & $mysql --batch --raw --default-character-set=utf8mb4 --binary-mode=1
  Write-Host "project directory sync ok"
} finally {
  Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
}
