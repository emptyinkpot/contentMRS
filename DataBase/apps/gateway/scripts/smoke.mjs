const baseUrl = process.env.DATABASE_GATEWAY_URL || "http://127.0.0.1:18090";
const apiKey = process.env.DATABASE_GATEWAY_API_KEY;
const expectedAuthRequiredRaw = String(process.env.DATABASE_GATEWAY_AUTH_REQUIRED || "").trim();
const expectedAuthRequired = expectedAuthRequiredRaw
  ? ["1", "true", "yes", "on"].includes(expectedAuthRequiredRaw.toLowerCase())
  : null;
const smokeContractId = "database-gateway-smoke.v1";

function headers(extra = {}) {
  return apiKey ? { "X-DataBase-Api-Key": apiKey, ...extra } : extra;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function write(path, idempotencyKey, payload) {
  return request(path, {
    method: "POST",
    headers: {
      ...headers(),
      "X-DataBase-Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requestId: "smoke",
      actor: "smoke",
      payload
    })
  });
}

const dependencies = await request("/health/dependencies");
assert(dependencies.response.ok, `/health/dependencies failed: ${dependencies.response.status}`);
assert(dependencies.body?.ok === true, "/health/dependencies did not return ok=true");
assert(dependencies.body?.mysql === "ok", "/health/dependencies mysql is not ok");
assert(dependencies.body?.schemaParseOk === true, "/health/dependencies schemaParseOk is not true");
assert(
  dependencies.body?.optionalDownstreams && typeof dependencies.body.optionalDownstreams.nocodb === "string",
  "/health/dependencies missing optionalDownstreams evidence"
);
assert(
  dependencies.body?.optionalDownstreams && typeof dependencies.body.optionalDownstreams.ragflow === "string",
  "/health/dependencies missing optionalDownstreams.ragflow evidence"
);

const health = await request("/health");
assert(health.response.ok, `/health failed: ${health.response.status}`);
assert(health.body?.ok === true, "/health did not return ok=true");
assert(health.body?.checks?.mysql === "ok", "/health mysql core check is not ok");
assert(
  health.body?.optionalDownstreams && typeof health.body.optionalDownstreams.nocodb === "string",
  "/health missing optionalDownstreams evidence"
);
assert(
  health.body?.optionalDownstreams && typeof health.body.optionalDownstreams.ragflow === "string",
  "/health missing optionalDownstreams.ragflow evidence"
);

const status = await request("/status");
assert(status.response.ok, `/status failed: ${status.response.status}`);
assert(status.body?.mode === "read-write-facade", "/status did not return read-write-facade mode");
const runtimeAuthRequired = Boolean(status.body?.auth?.required);
if (expectedAuthRequired !== null) {
  assert(
    runtimeAuthRequired === expectedAuthRequired,
    "/status auth.required does not match DATABASE_GATEWAY_AUTH_REQUIRED"
  );
}

const noKey = await request("/inventory/tables");
if (runtimeAuthRequired) {
  assert(noKey.response.status === 401, "expected /inventory/tables without key to return 401 when auth is required");
} else {
  assert(noKey.response.ok, "expected /inventory/tables without key to succeed when auth is disabled");
  assert(Array.isArray(noKey.body?.tables), "inventory response missing tables array");
}

const writeWithoutIdempotency = await request("/writes/create-work", {
  method: "POST",
  headers: {
    ...headers(),
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ requestId: "smoke", actor: "smoke", payload: {} })
});
assert(
  writeWithoutIdempotency.response.status === 400 || writeWithoutIdempotency.response.status === 401,
  "expected /writes/create-work without idempotency key to return 400 or auth boundary 401"
);

if (!apiKey) {
  console.log("database-gateway smoke ok: health and auth switch verified; keyed write checks skipped");
} else {
  const keyed = await request("/inventory/tables", {
    headers: headers()
  });
  assert(keyed.response.ok, `/inventory/tables with key failed: ${keyed.response.status}`);
  assert(Array.isArray(keyed.body?.tables), "inventory response missing tables array");

  const search = await request("/search?q=test&limit=1", {
    headers: headers()
  });
  assert(search.response.ok, `/search with key failed: ${search.response.status}`);
  assert(Array.isArray(search.body?.results), "search response missing results array");

  const invalidCreateWork = await request("/writes/create-work", {
    method: "POST",
    headers: {
      ...headers(),
      "X-DataBase-Idempotency-Key": `${smokeContractId}:invalid-create-work`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ requestId: "smoke", actor: "smoke", payload: {} })
  });
  assert(
    invalidCreateWork.response.status === 400 || invalidCreateWork.response.status === 409,
    "expected invalid create-work payload to return 400 or stable failure replay 409"
  );
  assert(
    invalidCreateWork.body?.error === "invalid_payload" || invalidCreateWork.body?.error === "mutation_failed",
    "invalid create-work response missing invalid_payload or mutation_failed error"
  );

  const invalidRecordGenerationOutput = await request("/writes/record-generation-output", {
    method: "POST",
    headers: {
      ...headers(),
      "X-DataBase-Idempotency-Key": `${smokeContractId}:invalid-record-generation-output`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requestId: "smoke",
      actor: "smoke",
      payload: {
        workId: 0,
        chapterNumber: 0,
        body: "",
        status: "invalid"
      }
    })
  });
  assert(
    invalidRecordGenerationOutput.response.status === 400 || invalidRecordGenerationOutput.response.status === 409,
    "expected invalid record-generation-output payload to return 400 or stable failure replay 409"
  );
  assert(
    invalidRecordGenerationOutput.body?.error === "invalid_payload" ||
      invalidRecordGenerationOutput.body?.error === "mutation_failed",
    "invalid record-generation-output response missing invalid_payload or mutation_failed error"
  );

const smokeTerm = "database-gateway-smoke-upsert";
const idempotencyKey = `${smokeContractId}:vocabulary:${smokeTerm}`;
const vocabularyPayload = {
  requestId: "smoke",
  actor: "smoke",
  payload: {
    content: smokeTerm,
    type: "system-smoke",
    category: "gateway",
    note: "Inserted by DataBase Gateway smoke test",
    tags: ["smoke", "gateway"]
  }
};

const vocabularyWrite = await request("/writes/upsert-vocabulary-item", {
  method: "POST",
  headers: {
    ...headers(),
    "X-DataBase-Idempotency-Key": idempotencyKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(vocabularyPayload)
});
assert(vocabularyWrite.response.ok, `/writes/upsert-vocabulary-item failed: ${vocabularyWrite.response.status}`);
assert(vocabularyWrite.body?.ok === true, "vocabulary write did not return ok=true");

const vocabularyReplay = await request("/writes/upsert-vocabulary-item", {
  method: "POST",
  headers: {
    ...headers(),
    "X-DataBase-Idempotency-Key": idempotencyKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(vocabularyPayload)
});
assert(vocabularyReplay.response.ok, "idempotent replay failed");
assert(
  vocabularyReplay.body?.item?.content === vocabularyWrite.body?.item?.content,
  "idempotent replay did not return the stored response"
);

const vocabularyConflict = await request("/writes/upsert-vocabulary-item", {
  method: "POST",
  headers: {
    ...headers(),
    "X-DataBase-Idempotency-Key": idempotencyKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    ...vocabularyPayload,
    payload: { ...vocabularyPayload.payload, note: "conflicting payload" }
  })
});
assert(vocabularyConflict.response.status === 409, "expected idempotency conflict to return 409");
assert(vocabularyConflict.body?.error === "idempotency_conflict", "conflict response missing idempotency_conflict");

const vocabularyReadback = await request(`/vocabulary/search?q=${encodeURIComponent(smokeTerm)}&limit=1`, {
  headers: headers()
});
assert(vocabularyReadback.response.ok, "vocabulary readback failed");
assert(vocabularyReadback.body?.items?.[0]?.content === smokeTerm, "vocabulary readback did not find smoke term");

const smokeRunId = smokeContractId;
const workTitle = "database-gateway-smoke-article-acceptance";

const workWrite = await write("/writes/create-work", `${smokeContractId}:article-acceptance-work`, {
  title: workTitle,
  description: "DataBase Gateway article acceptance smoke work",
  targetChapters: 1,
  currentChapters: 0,
  status: "outline",
  platform: "system-smoke"
});
assert(workWrite.response.ok, `/writes/create-work smoke work failed: ${workWrite.response.status}`);
assert(workWrite.body?.ok === true, "smoke work write did not return ok=true");
const workId = Number(workWrite.body?.item?.id || workWrite.body?.result?.insertId);
assert(Number.isFinite(workId) && workId > 0, "smoke work response missing work id");

const chapterWrite = await write("/writes/append-chapter", `${smokeContractId}:article-acceptance-chapter`, {
  workId,
  volumeNumber: 1,
  chapterNumber: 1,
  title: "Article acceptance smoke chapter",
  content: "placeholder",
  wordCount: 11,
  status: "first_draft",
  auditStatus: "pending"
});
assert(chapterWrite.response.ok, `/writes/append-chapter smoke chapter failed: ${chapterWrite.response.status}`);
assert(chapterWrite.body?.ok === true, "smoke chapter write did not return ok=true");
const chapterId = Number(chapterWrite.body?.item?.id || chapterWrite.body?.result?.insertId);
assert(Number.isFinite(chapterId) && chapterId > 0, "smoke chapter response missing chapter id");

const generatedBody = "统制与士绅并非空泛标签，黄杨钿甜事件作为入口，S-HYYTT 作为来源锚点。";
const generationWrite = await write(
  "/writes/record-generation-output",
  `${smokeContractId}:article-acceptance-generation`,
  {
    workId,
    chapterId,
    chapterNumber: 1,
    title: "Article acceptance smoke chapter",
    body: generatedBody,
    status: "first_draft",
    operator: "smoke",
    metadata: {
      smokeRunId,
      source: "database-gateway-smoke"
    }
  }
);
assert(
  generationWrite.response.ok,
  `/writes/record-generation-output smoke body failed: ${generationWrite.response.status}`
);
assert(generationWrite.body?.ok === true, "smoke generation write did not return ok=true");
const partId = generationWrite.body?.item?.partId;
assert(typeof partId === "string" && partId.length > 0, "smoke generation response missing partId");

const acceptanceReport = {
  version: "article-acceptance-report.v1",
  passed: true,
  contractId: "smoke.article-acceptance.v1",
  violations: [],
  metrics: {
    partCount: 1,
    totalNonWhitespaceChars: generatedBody.replace(/\s/g, "").length,
    wordCounts: [
      {
        partId: "body",
        nonWhitespaceChars: generatedBody.replace(/\s/g, "").length,
        minNonWhitespaceChars: 1
      }
    ],
    requiredCaseCoverage: {
      "黄杨钿甜": true
    },
    forbiddenCaseHits: [],
    requiredSourceCoverage: {
      "S-HYYTT": true
    },
    preferredTermHits: 2,
    bannedTermHits: [],
    creativeRuleBlockCount: 0,
    factBoundary: {
      strict: false,
      atomCount: 0,
      claimCount: 0,
      usedAtomIds: [],
      unauthorizedAtomIds: [],
      missingRequiredAtomIds: [],
      unboundClaimCount: 0
    }
  }
};

const acceptanceWrite = await write(
  "/writes/record-article-acceptance-report",
  `${smokeContractId}:article-acceptance-report`,
  {
    workId,
    chapterId,
    chapterNumber: 1,
    partId,
    reportId: "database-gateway-smoke-article-acceptance-report",
    report: acceptanceReport,
    operator: "smoke",
    metadata: {
      smokeRunId,
      source: "database-gateway-smoke"
    }
  }
);
assert(
  acceptanceWrite.response.ok,
  `/writes/record-article-acceptance-report failed: ${acceptanceWrite.response.status}`
);
assert(acceptanceWrite.body?.ok === true, "article acceptance report write did not return ok=true");
assert(
  acceptanceWrite.body?.item?.blockId === `legacy_chapter_${chapterId}_article_acceptance_report`,
  "article acceptance report response returned unexpected blockId"
);
assert(acceptanceWrite.body?.item?.passed === true, "article acceptance report response did not preserve passed=true");

const blocksReadback = await request(`/content/canonical/parts/${encodeURIComponent(partId)}/blocks`, {
  headers: headers()
});
assert(blocksReadback.response.ok, "article acceptance report block readback failed");
const acceptanceBlock = blocksReadback.body?.blocks?.find(
  (block) => block.id === acceptanceWrite.body?.item?.blockId
);
assert(acceptanceBlock, "article acceptance report block was not found in canonical part readback");
assert(acceptanceBlock.kind === "prompt_context", "article acceptance report block kind is not prompt_context");
assert(
  acceptanceBlock.payload?.report?.contractId === acceptanceReport.contractId,
  "article acceptance report readback did not preserve contractId"
);
assert(
  acceptanceBlock.payload?.report?.metrics?.requiredCaseCoverage?.["黄杨钿甜"] === true,
  "article acceptance report readback did not preserve required case coverage"
);

const referenceUsageReport = {
  version: "article-reference-usage-report.v1",
  articlePlanVersion: "article-plan.v1",
  topic: "Article acceptance smoke chapter",
  target: "draft",
  referenceWeaveVersion: "article-reference-weave.v1",
  anchors: [
    {
      kind: "document",
      name: "smoke source material",
      use: "prove reference usage write and readback",
      source: "sourcePassage",
      sourceId: "S-HYYTT",
      required: true
    }
  ],
  sectionUsage: [
    {
      sectionTitle: "smoke section",
      anchorNames: ["smoke source material"],
      instruction: "use smoke material"
    }
  ],
  actualUsage: {
    score: 100,
    threshold: 70,
    paragraphCount: 1,
    materialBackedParagraphCount: 1,
    materialBackedParagraphRatio: 100,
    kindCoverage: {
      document: 1
    },
    matchedAnchorNames: ["smoke source material"],
    paragraphs: [
      {
        index: 0,
        anchorNames: ["smoke source material"],
        kinds: ["document"],
        sourceIds: ["S-HYYTT"],
        excerpt: "smoke source material proves reference usage write and readback"
      }
    ]
  },
  contextSources: {
    creativeSourceMaterials: 0,
    semanticUnits: 0,
    memoryItems: 0,
    literatureItems: 0,
    learningEvents: 0
  },
  warnings: []
};

const referenceUsageWrite = await write(
  "/writes/record-article-reference-usage-report",
  `${smokeContractId}:article-reference-usage-report`,
  {
    workId,
    chapterId,
    chapterNumber: 1,
    partId,
    reportId: "database-gateway-smoke-article-reference-usage-report",
    report: referenceUsageReport,
    operator: "smoke",
    metadata: {
      smokeRunId,
      source: "database-gateway-smoke"
    }
  }
);
assert(
  referenceUsageWrite.response.ok,
  `/writes/record-article-reference-usage-report failed: ${referenceUsageWrite.response.status}`
);
assert(referenceUsageWrite.body?.ok === true, "article reference usage report write did not return ok=true");
assert(
  referenceUsageWrite.body?.item?.blockId === `legacy_chapter_${chapterId}_article_reference_usage_report`,
  "article reference usage report response returned unexpected blockId"
);
assert(referenceUsageWrite.body?.item?.anchorCount === 1, "article reference usage report response did not preserve anchor count");

const referenceBlocksReadback = await request(`/content/canonical/parts/${encodeURIComponent(partId)}/blocks`, {
  headers: headers()
});
assert(referenceBlocksReadback.response.ok, "article reference usage report block readback failed");
const referenceUsageBlock = referenceBlocksReadback.body?.blocks?.find(
  (block) => block.id === referenceUsageWrite.body?.item?.blockId
);
assert(referenceUsageBlock, "article reference usage report block was not found in canonical part readback");
assert(referenceUsageBlock.kind === "prompt_context", "article reference usage report block kind is not prompt_context");
assert(
  referenceUsageBlock.payload?.report?.anchors?.[0]?.name === "smoke source material",
  "article reference usage report readback did not preserve anchor"
);
assert(
  referenceUsageBlock.payload?.report?.actualUsage?.materialBackedParagraphRatio === 100,
  "article reference usage report readback did not preserve actual usage coverage"
);

const semanticMaterialIdempotencyKey = `${smokeContractId}:semantic-reference-material:source-smoke-reference-1`;
const semanticMaterialPayload = {
  sourceId: "source-smoke-reference-1",
  sourceTitle: "Smoke theory material",
  sourceAuthor: "smoke",
  sourceLocator: "smoke seed",
  excerpt: "公共名义下的组织控制权会转化为资源入口支配。",
  summary: "Smoke semantic reference material.",
  materialKind: "theory",
  status: "active",
  tags: [
    {
      layer: "concept",
      value: "新地主阶级",
      description: "smoke tag"
    }
  ]
};

const semanticMaterialWrite = await write(
  "/writes/record-semantic-reference-material",
  semanticMaterialIdempotencyKey,
  semanticMaterialPayload
);
assert(
  semanticMaterialWrite.response.ok,
  `/writes/record-semantic-reference-material failed: ${semanticMaterialWrite.response.status}`
);
assert(semanticMaterialWrite.body?.ok === true, "semantic reference material write did not return ok=true");
assert(semanticMaterialWrite.body?.item?.materialKind === "theory", "semantic reference material write did not preserve kind");

const semanticUnitsReadback = await request("/semantic/units?search=Smoke%20theory%20material&materialKind=theory&limit=1", {
  headers: headers()
});
assert(semanticUnitsReadback.response.ok, "semantic units readback failed");
assert(
  semanticUnitsReadback.body?.units?.[0]?.sourceTitle === "Smoke theory material",
  "semantic material readback did not find the written unit"
);
}

console.log("database-gateway smoke ok");
