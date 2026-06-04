param(
  [string]$BaseUrl = $env:CONTENTBASE_BASE_URL,
  [string]$ExpectedModel = "claude-sonnet-4-6",
  [string]$Topic = "",
  [int]$TargetWordCount = 900,
  [int]$MinBodyLength = 600,
  [string]$RemoteSsh = $env:CONTENTBASE_ACCEPTANCE_REMOTE_SSH,
  [string]$RemoteContainer = $env:CONTENTBASE_ACCEPTANCE_REMOTE_CONTAINER,
  [string]$RemoteRoot = $env:CONTENTBASE_ACCEPTANCE_REMOTE_ROOT
)

$ErrorActionPreference = "Stop"

if (-not $Topic) {
  $Topic = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("576O5Zu95paH5piO55qE56m66Ze056eR5bqP5aaC5L2V5aGR6YCg5Zu95a625oCn5qC8"))
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $BaseUrl) {
  $BaseUrl = if ($RemoteSsh) { "http://127.0.0.1:5111" } else { "http://127.0.0.1:5101" }
}
if (-not $RemoteContainer) {
  $RemoteContainer = "contentmrs-docker-contentbase-1"
}
if (-not $RemoteRoot) {
  $RemoteRoot = "/srv/contentbase/current"
}

$nodeSource = @'
const payload = JSON.parse(Buffer.from(process.env.CONTENTBASE_ACCEPTANCE_PAYLOAD, "base64").toString("utf8"));
const baseUrl = String(payload.baseUrl || "http://127.0.0.1:5111").replace(/\/+$/, "");
const headers = {
  "content-type": "application/json",
  accept: "application/json"
};
if (process.env.CONTENTBASE_API_KEY) {
  headers.authorization = `Bearer ${process.env.CONTENTBASE_API_KEY}`;
}
const response = await fetch(`${baseUrl}/api/content/runtime/generate/article`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    topic: payload.topic,
    target: "article",
    structure: {
      targetWordCount: Number(payload.targetWordCount || 900)
    },
    evidenceQuery: {
      query: payload.topic,
      sourceIds: [],
      includeRagflow: true,
      requireCorpus: true
    },
    settings: {}
  })
});
const text = await response.text();
let body = {};
try {
  body = text ? JSON.parse(text) : {};
} catch {
  throw new Error(`non-JSON ContentBase response: HTTP ${response.status}`);
}
if (!response.ok || body.success === false) {
  throw new Error(`article runtime failed: HTTP ${response.status} ${body.error || text}`);
}
const result = body.data || body;
const article = String(result?.draft?.body || result?.body || result?.article?.body || result?.finalBody || "").trim();
const invocation = result?.trace?.modelInvocation || result?.draft?.modelInvocation || {};
const pack = result?.context?.evidence?.pack || null;
const diagnostics = result?.context?.diagnostics || result?.trace?.context?.diagnostics || {};
if (!article) {
  throw new Error("article runtime returned no body");
}
if (article.length < Number(payload.minBodyLength || 0)) {
  throw new Error(`article body too short: ${article.length}`);
}
if (!invocation.provider || !invocation.model) {
  throw new Error("article runtime did not report modelInvocation provider/model");
}
if (String(invocation.model) !== payload.expectedModel) {
  throw new Error(`Writer model drift: expected ${payload.expectedModel}, got ${invocation.model}`);
}
const serializedEvidence = JSON.stringify(pack || {});
if (!pack || !/ragflow\.retrieval/.test(serializedEvidence)) {
  throw new Error("article runtime response is missing RAGFlow EvidencePack evidence");
}
const chunks = Array.isArray(pack.chunks) ? pack.chunks : [];
const textBearingChunks = chunks.filter((item) => String(item.text || item.content || "").trim().length >= 20);
if (textBearingChunks.length < 1) {
  throw new Error("article runtime EvidencePack has no text-bearing chunks");
}
const packedReality = Number(diagnostics?.packedCounts?.reality || 0);
const packedRealityChars = Number(diagnostics?.charsByChannel?.reality || 0);
if (packedReality < 1) {
  throw new Error("article runtime EvidencePack existed but zero Reality items survived context packing");
}
if (packedRealityChars < 200) {
  throw new Error(`article runtime packed Reality text is too thin: ${packedRealityChars} chars`);
}
console.log(JSON.stringify({
  ok: true,
  baseUrl,
  expectedModel: payload.expectedModel,
  actualModel: invocation.model,
  provider: invocation.provider,
  bodyLength: article.length,
  evidenceProvider: pack.queryRun?.provider || null,
  evidenceChunks: chunks.length,
  textBearingChunks: textBearingChunks.length,
  packedReality,
  packedRealityChars
}, null, 2));
'@

function Build-Payload {
  return [ordered]@{
    baseUrl = $BaseUrl
    topic = $Topic
    targetWordCount = $TargetWordCount
    expectedModel = $ExpectedModel
    minBodyLength = $MinBodyLength
    remoteRoot = $RemoteRoot
  } | ConvertTo-Json -Compress
}

function Invoke-ArticleSmokeRemote {
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Build-Payload)))
  $nodeEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($nodeSource))
  $script = @'
set -eu
PAYLOAD_JSON=$(printf "%s" "$CONTENTBASE_ACCEPTANCE_PAYLOAD" | base64 -d)
export PAYLOAD_JSON
REMOTE_ROOT=$(node -e "const p=JSON.parse(process.env.PAYLOAD_JSON); console.log(p.remoteRoot)")
cd "$REMOTE_ROOT"
NODE_SCRIPT=$(printf "%s" "$CONTENTBASE_ACCEPTANCE_NODE" | base64 -d)
node --input-type=module -e "$NODE_SCRIPT"
'@
  $remoteCommand = "sudo -n docker exec -i -e CONTENTBASE_ACCEPTANCE_PAYLOAD='$encoded' -e CONTENTBASE_ACCEPTANCE_NODE='$nodeEncoded' $RemoteContainer sh"
  $output = $script | ssh $RemoteSsh $remoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "remote article runtime acceptance failed with exit code $LASTEXITCODE"
  }
  return $output
}

if ($RemoteSsh) {
  Invoke-ArticleSmokeRemote
  exit 0
}

Push-Location $repoRoot
try {
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Build-Payload)))
  $env:CONTENTBASE_ACCEPTANCE_PAYLOAD = $encoded
  $output = node --input-type=module -e $nodeSource
  if ($LASTEXITCODE -ne 0) {
    throw "article runtime acceptance failed with exit code $LASTEXITCODE"
  }
  $output
} finally {
  Remove-Item Env:\CONTENTBASE_ACCEPTANCE_PAYLOAD -ErrorAction SilentlyContinue
  Pop-Location
}
