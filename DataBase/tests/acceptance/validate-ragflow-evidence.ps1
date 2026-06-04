param(
  [string]$GatewayRoot = "",
  [string]$EnvFile = "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env",
  [string]$Query = "",
  [string]$RemoteSsh = $env:DATABASE_RAGFLOW_EVIDENCE_REMOTE_SSH,
  [string]$RemoteContainer = $env:DATABASE_RAGFLOW_EVIDENCE_REMOTE_CONTAINER,
  [string]$ExpectedRagflowUrl = $env:DATABASE_RAGFLOW_EVIDENCE_EXPECTED_URL
)

$ErrorActionPreference = "Stop"

if (-not $Query) {
  $Query = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("5paw5Zyw5Li76Zi25bGCIOmAmumBk+ennQ=="))
}
if (-not $RemoteContainer) {
  $RemoteContainer = "contentmrs-docker-database-gateway-1"
}

function Invoke-RemoteRagflowEvidence {
  $payload = [ordered]@{
    query = $Query
    expectedRagflowUrl = $ExpectedRagflowUrl
  } | ConvertTo-Json -Compress
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))
  $nodeSource = @'
const query = String(process.env.QUERY || "").trim();
const baseUrl = `http://127.0.0.1:${process.env.DATABASE_GATEWAY_PORT || "18090"}`;
const url = `${baseUrl}/evidence/search?q=${encodeURIComponent(query)}&includeRagflow=true&limit=10`;
const headers = {};
if (process.env.DATABASE_GATEWAY_API_KEY) {
  headers["X-DataBase-Api-Key"] = process.env.DATABASE_GATEWAY_API_KEY;
}
const response = await fetch(url, { headers });
const text = await response.text();
let body = {};
try {
  body = text ? JSON.parse(text) : {};
} catch {
  throw new Error(`DataBase Gateway returned non-JSON: HTTP ${response.status}`);
}
if (!response.ok) {
  throw new Error(`DataBase Gateway /evidence/search failed: HTTP ${response.status} ${body.error || body.message || text}`);
}
const pack = body.data || body;
const chunks = Array.isArray(pack.chunks) ? pack.chunks : [];
const serialized = JSON.stringify(pack);
if (!/ragflow\.retrieval/.test(serialized)) {
  throw new Error("EvidencePack is missing ragflow.retrieval evidence");
}
const textBearingChunks = chunks.filter((item) => String(item.text || item.content || "").trim().length >= 20);
if (textBearingChunks.length < 1) {
  throw new Error("EvidencePack is missing text-bearing chunks");
}
console.log(JSON.stringify({
  ok: true,
  baseUrl,
  query,
  provider: pack.queryRun?.provider || null,
  mode: pack.mode || null,
  chunks: chunks.length,
  textBearingChunks: textBearingChunks.length,
  ragflowUrl: process.env.DATABASE_EVIDENCE_RAGFLOW_URL || null
}, null, 2));
'@
  $nodeEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($nodeSource))
  $script = @'
set -eu
PAYLOAD_JSON=$(printf "%s" "$DATABASE_RAGFLOW_EVIDENCE_PAYLOAD" | base64 -d)
export PAYLOAD_JSON
QUERY=$(node -e "const p=JSON.parse(process.env.PAYLOAD_JSON); console.log(p.query)")
EXPECTED_URL=$(node -e "const p=JSON.parse(process.env.PAYLOAD_JSON); console.log(p.expectedRagflowUrl || '')")
if [ -n "$EXPECTED_URL" ] && [ "${DATABASE_EVIDENCE_RAGFLOW_URL:-}" != "$EXPECTED_URL" ]; then
  echo "{\"ok\":false,\"status\":\"ragflow_url_mismatch\",\"expected\":\"$EXPECTED_URL\",\"actual\":\"${DATABASE_EVIDENCE_RAGFLOW_URL:-}\"}" >&2
  exit 18
fi
export QUERY
NODE_SCRIPT=$(printf "%s" "$DATABASE_RAGFLOW_EVIDENCE_NODE" | base64 -d)
node -e "$NODE_SCRIPT"
'@
  $remoteCommand = "sudo -n docker exec -i -e DATABASE_RAGFLOW_EVIDENCE_PAYLOAD='$encoded' -e DATABASE_RAGFLOW_EVIDENCE_NODE='$nodeEncoded' $RemoteContainer sh"
  $output = $script | ssh $RemoteSsh $remoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "remote smoke:ragflow-evidence failed with exit code $LASTEXITCODE"
  }
  return $output
}

if ($RemoteSsh) {
  Invoke-RemoteRagflowEvidence
  exit 0
}

if (-not $GatewayRoot) {
  $GatewayRoot = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "apps\gateway"
}

if (-not (Test-Path -LiteralPath $GatewayRoot)) {
  throw "GatewayRoot does not exist: $GatewayRoot"
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "EnvFile does not exist: $EnvFile"
}

Push-Location $GatewayRoot
try {
  if ($ExpectedRagflowUrl) {
    $actualUrl = $null
    foreach ($line in Get-Content -LiteralPath $EnvFile) {
      if ($line -match "^DATABASE_EVIDENCE_RAGFLOW_URL=(.*)$") {
        $actualUrl = $Matches[1].Trim()
      }
    }
    if ($actualUrl -ne $ExpectedRagflowUrl) {
      throw "DATABASE_EVIDENCE_RAGFLOW_URL mismatch: expected $ExpectedRagflowUrl, got $actualUrl"
    }
  }
  npm run smoke:ragflow-evidence -- --envFile $EnvFile --query $Query
  if ($LASTEXITCODE -ne 0) {
    throw "smoke:ragflow-evidence failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
