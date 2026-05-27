# database-claims-integration

Source root: E:\My Project\ContentMRS\DataBase
This file is a clean Markdown bundle for Bailian knowledge retrieval. Original path headings are preserved.



---

# evidence\claims\article-acceptance-contract-2026-05-14.json

{
  "task_id": "article-acceptance-contract-2026-05-14",
  "title": "Add DataBase-owned article acceptance contract consumed by ContentBase",
  "agent_id": "codex",
  "status": "completed",
  "branch": "refactor/codex/canonical-database-consumer",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/",
    "gateway/src/routes/creative.ts",
    "generated/clients/database-gateway/",
    "E:/My Project/ContentBase/product/novel/app/article-runtime.ts",
    "E:/My Project/ContentBase/product/novel/app/api-content-runtime.ts",
    "E:/My Project/ContentBase/product/novel/tests/content-runtime-api.test.ts"
  ],
  "started_at": "2026-05-14T05:34:24.3837920Z",
  "updated_at": "2026-05-14T05:48:18.5407050Z",
  "handoff": null,
  "notes": "Completed v1 package contract and documentation. DataBase owns author/style/policy truth; ContentBase may only execute imported contract gates. Gateway durable persistence for acceptance reports remains next evolution."
}



---

# evidence\claims\article-acceptance-report-write-contract-2026-05-14.json

{
  "task_id": "article-acceptance-report-write-contract-2026-05-14",
  "title": "Persist article acceptance reports through DataBase Gateway",
  "agent_id": "codex",
  "status": "completed",
  "branch": "refactor/codex/canonical-database-consumer",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/article-acceptance-contract.ts",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/claims/article-acceptance-report-write-contract-2026-05-14.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-14T08:20:00.0000000Z",
  "updated_at": "2026-05-14T08:30:00.0000000Z",
  "handoff": null,
  "notes": "Completed v1 Gateway write path. Article acceptance reports persist as canonical content prompt_context blocks attached to existing chapter content parts; style and policy truth remain DataBase creative contracts."
}



---

# evidence\claims\article-inline-source-citation-policy-2026-05-14.json

{
  "task_id": "article-inline-source-citation-policy-2026-05-14",
  "title": "Forbid visible inline source anchors in article body acceptance",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/article-acceptance-contract.ts",
    "schemas/creative/README.md",
    "scripts/export-contentbase-database-artifacts.ps1",
    "E:/My Project/ContentBase/product/novel/app/api-content-runtime.ts",
    "E:/My Project/ContentBase/product/novel/app/runtime-capabilities.ts",
    "E:/My Project/ContentBase/product/novel/tests/content-runtime-api.test.ts"
  ],
  "started_at": "2026-05-14T15:25:34Z",
  "updated_at": "2026-05-14T15:40:00Z",
  "handoff": null,
  "notes": "Completed. ArticleAcceptancePolicy now defaults forbidInlineSourceCitations=true and runArticleAcceptance emits ARTICLE-INLINE-SOURCE-CITATION-001 for visible [Sxx] body anchors. Required source coverage still accepts structured sourcePassages, so reference usage remains in DataBase reports/final source projection."
}



---

# evidence\claims\article-reference-usage-report-2026-05-14.json

{
  "task_id": "article-reference-usage-report-2026-05-14",
  "title": "Add DataBase article reference usage report write contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/article-reference-usage-report.ts",
    "schemas/creative/index.ts",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    "gateway/scripts/smoke.mjs",
    "E:/My Project/ContentBase/product/novel/app/api-content-runtime.ts",
    "E:/My Project/ContentBase/product/novel/app/article-runtime.ts",
    "E:/My Project/ContentBase/product/novel/tests/content-runtime-api.test.ts"
  ],
  "started_at": "2026-05-14T14:24:59.5661570Z",
  "updated_at": "2026-05-14T15:20:00.0000000Z",
  "handoff": null,
  "notes": "Added DataBase-owned article-reference-usage-report.v1 contract, Gateway write facade route, generated OpenAPI/client method, Gateway smoke readback coverage, and ContentBase consumer integration behind explicit recordReferenceUsageReport. Live keyed Gateway smoke passed on local 127.0.0.1:18090 after restarting the canonical node dist/index.js runtime with existing DataBase secrets; smoke wrote and read back the article reference usage prompt_context block from canonical content_blocks."
}



---

# evidence\claims\asset-anchor-contracts-2026-05-13.json

{
  "task_id": "asset-anchor-contracts-2026-05-13",
  "title": "Define asset graph and anchor location contracts",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/asset-anchor-contracts",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/asset-graph-contract.md",
    "schemas/document/asset-graph.schema.json",
    "examples/document/minimal-asset-graph.json",
    "docs/contracts/anchor-location-contract.md",
    "schemas/document/anchor-location.schema.json",
    "examples/document/minimal-anchor-location.json",
    "docs/contracts/canonical-content-graph.md",
    "docs/contracts/raw-artifact-store-contract.md",
    "docs/contracts/annotation-graph-contract.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/asset-anchor-contracts-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T15:10:00Z",
  "updated_at": "2026-05-13T15:10:00Z",
  "handoff": null,
  "notes": "Doc/schema-only asset and anchor contracts. Scope excludes storage moves, image processing, reader UI, anchor resolver, and pagination engine."
}



---

# evidence\claims\atramenti-console-local-retirement-2026-05-11.json

{
  "schema_version": 1,
  "task_id": "atramenti-console-local-retirement-2026-05-11",
  "title": "Retire local Atramenti-Console checkout after capability ownership alignment",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "ecosystem/repos.json",
    "ecosystem/runtime-surfaces.json",
    "ecosystem/supply-relationships.json",
    "ecosystem/atramenti-capability-inventory.json",
    "docs/operations/atramenti-cleanstream-sync-plan.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-11T01:59:35Z",
  "updated_at": "2026-05-11T02:02:00Z",
  "handoff": null,
  "notes": "User requested Atramenti-Console cleanup, remote alignment, and local checkout deletion. This avoids README.md, project.json, and ecosystem/repository-consolidation.json, which are claimed by repository-consolidation-audit-2026-05-10."
}



---

# evidence\claims\audit-repository-read-content-rpc-convergence-2026-05-13.json

{
  "task_id": "audit-repository-read-content-rpc-convergence-2026-05-13",
  "title": "Complete audit repository RPC convergence",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/src/routes/content.ts",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/"
  ],
  "started_at": "2026-05-13T04:45:00Z",
  "updated_at": "2026-05-13T05:20:00Z",
  "handoff": null,
  "notes": "Completed: Gateway chapter read contract exposes audit_issues, suggested_action, and published_at; generated SDK rebuilt and ContentBase audit repository consumes those fields without direct chapter SQL."
}



---

# evidence\claims\audit-result-write-contract-2026-05-13.json

{
  "task_id": "audit-result-write-contract-2026-05-13",
  "title": "Add DataBase audit result write contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/content/",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "generated/clients/database-gateway/"
  ],
  "started_at": "2026-05-13T04:20:00Z",
  "updated_at": "2026-05-13T04:40:00Z",
  "handoff": null,
  "notes": "Added schema-enforced record-audit-result write RPC, OpenAPI path, and generated SDK surface."
}



---

# evidence\claims\canonical-content-gateway-client-2026-05-12.json

{
  "task_id": "canonical-content-gateway-client-2026-05-12",
  "title": "Expose canonical content gateway routes and generated client",
  "agent_id": "codex",
  "status": "completed",
  "branch": "refactor/codex/canonical-content-gateway-client",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/src/routes/content.ts",
    "gateway/src/routes/creative.ts",
    "gateway/src/routes/semantic.ts",
    "gateway/src/routes.ts",
    "gateway/openapi.yaml",
    "gateway/API.md",
    "gateway/sql/005_canonical_content_schema.sql",
    "gateway/sql/006_promote_legacy_content.sql",
    "schemas/content/",
    "generated/clients/database-gateway/",
    "docs/architecture/canonical-content-system.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-12T13:09:06Z",
  "updated_at": "2026-05-12T13:09:06Z",
  "completed_at": "2026-05-12T13:09:06Z",
  "handoff": null,
  "notes": "ContentBase canonical consumer depends on these DataBase Gateway routes and generated TypeScript client methods."
}



---

# evidence\claims\canonical-content-graph-2026-05-13.json

{
  "task_id": "canonical-content-graph-2026-05-13",
  "title": "Define DataBase-owned Canonical Content Graph",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/canonical-content-graph",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/canonical-content-graph.md",
    "schemas/document/canonical-content-graph.schema.json",
    "examples/document/minimal-content-graph.json",
    "docs/contracts/canonical-document-model.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/canonical-content-graph-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T13:45:00Z",
  "updated_at": "2026-05-13T13:45:00Z",
  "handoff": null,
  "notes": "Doc/schema-only graph model. Scope excludes graph storage, importer, projection runtime, reader runtime, and gates."
}



---

# evidence\claims\canonical-document-model-2026-05-13.json

{
  "task_id": "canonical-document-model-2026-05-13",
  "title": "Define DataBase-owned Canonical Document Model",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/canonical-document-model",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/canonical-document-model.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/canonical-document-model-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T12:45:00Z",
  "updated_at": "2026-05-13T12:45:00Z",
  "handoff": null,
  "notes": "Doc-only canonical publishing AST model. Scope excludes EPUB/PDF implementation, MyBlog migration, and ContractGuard enforcement."
}



---

# evidence\claims\cdm-machine-schema-2026-05-13.json

{
  "task_id": "cdm-machine-schema-2026-05-13",
  "title": "Add machine-readable Canonical Document Model schema",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/cdm-machine-schema",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/document/canonical-document.schema.json",
    "examples/document/minimal-cdm-document.json",
    "docs/contracts/canonical-document-model.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    ".runtime/claims/cdm-machine-schema-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T13:05:00Z",
  "updated_at": "2026-05-13T13:05:00Z",
  "handoff": null,
  "notes": "Doc/schema-only CDM machine contract. Scope excludes storage migration, importer, projection engine, and gates."
}



---

# evidence\claims\cdm-section-tree-2026-05-13.json

{
  "task_id": "cdm-section-tree-2026-05-13",
  "title": "Make CDM hierarchy-first and define TOC as section tree projection",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/cdm-section-tree",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/canonical-document-model.md",
    "schemas/document/canonical-document.schema.json",
    "examples/document/minimal-cdm-document.json",
    ".runtime/claims/cdm-section-tree-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T13:25:00Z",
  "updated_at": "2026-05-13T13:25:00Z",
  "handoff": null,
  "notes": "Doc/schema correction: CDM is structure-first; TOC/nav/outline are projections from recursive Section tree."
}



---

# evidence\claims\chapter-transition-write-contract-2026-05-13.json

{
  "task_id": "chapter-transition-write-contract-2026-05-13",
  "title": "Add DataBase Gateway chapter transition write contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/content/",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T04:00:00Z",
  "updated_at": "2026-05-13T04:08:00Z",
  "handoff": null,
  "notes": "Added idempotent record-chapter-transition write path, generated OpenAPI/SDK, and validated Gateway plus generated client builds."
}



---

# evidence\claims\content-ingestion-constitution-2026-05-13.json

{
  "task_id": "content-ingestion-constitution-2026-05-13",
  "title": "Define no-silent-loss content ingestion constitution",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/content-ingestion-constitution",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/content-ingestion-constitution.md",
    "schemas/document/content-import-manifest.schema.json",
    "examples/document/minimal-content-import-manifest.json",
    "docs/contracts/canonical-content-graph.md",
    "docs/contracts/epub-ingestion-contract.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/content-ingestion-constitution-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T14:25:00Z",
  "updated_at": "2026-05-13T14:25:00Z",
  "handoff": null,
  "notes": "Doc/schema-only ingestion constitution. Scope excludes file moves, import workers, raw artifact store implementation, normalizer implementation, and gates."
}



---

# evidence\claims\contentbase-boundary-script-entrypoints-2026-05-16.json

{
  "task_id": "contentbase-boundary-script-entrypoints-2026-05-16",
  "title": "Restore ContentBase boundary script entrypoints",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "scripts/export-contentbase-database-artifacts.ps1",
    "scripts/check-contentbase-canonical-sql-boundary.ps1",
    "evidence/claims/contentbase-boundary-script-entrypoints-2026-05-16.json",
    "evidence/timeline/events.jsonl"
  ],
  "started_at": "2026-05-16T01:16:17Z",
  "updated_at": "2026-05-16T01:27:00Z",
  "handoff": null,
  "notes": "Added root-level entrypoints that delegate to the canonical scripts/boundary implementations required by ContentBase structure checks. Verified via ContentBase scripts/check-product-structure.ps1."
}



---

# evidence\claims\contentbase-sql-boundary-radar-2026-05-13.json

{
  "task_id": "contentbase-sql-boundary-radar-2026-05-13",
  "title": "Add ContentBase SQL boundary migration radar",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "scripts/check-contentbase-canonical-sql-boundary.ps1",
    "docs/gateway/api-surface-governance.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T15:20:00+08:00",
  "updated_at": "2026-05-13T15:30:00+08:00",
  "handoff": null,
  "notes": "Completed: existing ContentBase boundary guard now has ReportAll mode that inventories direct SQL table references for the next SDK/RPC migration batch without failing non-guarded runtime-owned tables.",
  "checks": [
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot \"E:\\My Project\\ContentBase\"",
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot \"E:\\My Project\\ContentBase\" -ReportAll",
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\check-project-standard.ps1 -Root \"E:\\My Project\\DataBase\""
  ]
}



---

# evidence\claims\creative-context-legacy-chapter-material-2026-05-13.json

{
  "task_id": "creative-context-legacy-chapter-material-2026-05-13",
  "title": "Expose legacy chapter generation material through DataBase creative context",
  "agent_id": "codex",
  "status": "active",
  "branch": "refactor/codex/canonical-database-consumer",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/src/routes/creative.ts",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T07:34:24Z",
  "updated_at": "2026-05-13T07:34:24Z",
  "handoff": null,
  "notes": "Real ContentBase generation is blocked because creative context canonical parts generated from legacy chapters expose chapterNumber/wordCount but not plot summary/body material required by generation contracts."
}



---

# evidence\claims\creative-context-v1-freeze-2026-05-13.json

{
  "task_id": "creative-context-v1-freeze-2026-05-13",
  "title": "Freeze CreativeContext v1 aggregate",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/creative-context-contract.ts",
    "gateway/src/routes/creative.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T16:20:00+08:00",
  "updated_at": "2026-05-13T16:21:00+08:00",
  "handoff": null,
  "checks": [
    "npm run typecheck in schemas/creative",
    "npm run build in schemas/creative",
    "npm run typecheck/build in schemas/content and schemas/semantic",
    "npm run typecheck in gateway",
    "npm run build in gateway",
    "npm run generate:openapi in gateway",
    "npm run generate:client in gateway",
    "npm run build in generated/clients/database-gateway",
    "pnpm install in ContentBase",
    "pnpm --filter novel-product run build",
    "pnpm --filter novel-product run test",
    "check-contentbase-canonical-sql-boundary ok",
    "check-project-standard ok",
    "git diff --check"
  ],
  "notes": "CreativeContext v1 aggregate fields are contract-defined, Gateway-populated, OpenAPI/SDK-generated, documented as stable v1, and compatible with existing ContentBase build/test consumers."
}



---

# evidence\claims\creative-fiction-preferences-2026-05-12.json

{
  "task_id": "creative-fiction-preferences-2026-05-12",
  "title": "Record creative fiction blueprint and user preferences",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/sql/003_creative_style_registry.sql",
    "gateway/src/routes/creative.ts",
    "gateway/src/routes.ts",
    "gateway/src/clients/database-gateway-client.ts",
    "services/gateway-mcp/mcp/server.mjs",
    "gateway/API.md",
    "gateway/openapi.yaml",
    "README.md",
    "project.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-12T01:20:00Z",
  "updated_at": "2026-05-12T08:58:00Z",
  "handoff": null,
  "notes": "Completed MySQL-backed creative style truth: lexical records merged into vocabulary/banned_words, creative_style_* tables added for protocols/modules/editing steps/rules/source materials, sidecar JSON removed, Gateway and MCP contract entrypoint added. Weak lexical categories are warning signals only; structural rules remain primary gates."
}



---

# evidence\claims\creative-rule-as-code-2026-05-13.json

{
  "task_id": "creative-rule-as-code-2026-05-13",
  "title": "Make creative writing rules executable contract truth",
  "agent_id": "codex",
  "status": "completed",
  "branch": null,
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/",
    "gateway/src/routes/creative.ts",
    "E:/My Project/ContentBase/product/novel/core/manuscript/content-craft/src/generation-pipeline.ts",
    "E:/My Project/ContentBase/product/novel/core/manuscript/content-craft/src/generation-types.ts",
    "E:/My Project/ContentBase/product/novel/tests/generation-context.test.ts"
  ],
  "started_at": "2026-05-13T00:00:00Z",
  "updated_at": "2026-05-13T00:00:00Z",
  "handoff": null,
  "notes": "Completed Rule-as-Code convergence. DataBase schemas/creative owns executable rules and inventory; Gateway exposes generated inventory from the executable source; ContentBase quality gates run runCreativeRules() and hard-fail punctuation/ascii/euro/corpus block violations. Checks: schemas/creative typecheck/build, gateway typecheck/build/openapi/client build, ContentBase pnpm run ci."
}



---

# evidence\claims\creative-rule-context-enforcement-2026-05-13.json

{
  "task_id": "creative-rule-context-enforcement-2026-05-13",
  "title": "Make creative rules context-aware and remove prompt punctuation drift",
  "agent_id": "codex",
  "status": "completed",
  "branch": null,
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/creative-rules.ts",
    "gateway/src/routes/creative.ts",
    "E:/My Project/ContentBase/product/novel/core/manuscript/content-craft/src/generation-pipeline.ts",
    "E:/My Project/ContentBase/product/novel/tests/generation-context.test.ts"
  ],
  "started_at": "2026-05-13T00:00:00Z",
  "updated_at": "2026-05-13T00:00:00Z",
  "handoff": null,
  "notes": "Completed. Removed prompt punctuation contradictions, changed Gateway corpus punctuation guidance to avoid colons/dashes, extended executable rules with narrative context, and wired ContentBase quality gates to pass chapter outline, key events, scene plan, and must-advance beats. Checks: schemas/creative typecheck/build, gateway typecheck/build, ContentBase pnpm run ci."
}



---

# evidence\claims\creative-rule-repair-loop-2026-05-13.json

{
  "task_id": "creative-rule-repair-loop-2026-05-13",
  "title": "Add structured creative rule repair plans",
  "agent_id": "codex",
  "status": "completed",
  "branch": null,
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/creative-rules.ts",
    "E:/My Project/ContentBase/product/novel/core/manuscript/content-craft/src/generation-pipeline.ts",
    "E:/My Project/ContentBase/product/novel/core/manuscript/content-craft/src/generation-types.ts",
    "E:/My Project/ContentBase/product/novel/tests/generation-context.test.ts"
  ],
  "started_at": "2026-05-13T00:00:00Z",
  "updated_at": "2026-05-13T00:00:00Z",
  "handoff": null,
  "notes": "Completed. CreativeRuleViolation now carries fixAction/fixInstruction. ContentBase reports ruleViolations and fixPlan, and revision prompts include structured repair actions. Checks: schemas/creative typecheck/build, gateway typecheck/build, ContentBase pnpm run ci."
}



---

# evidence\claims\cross-repo-artifact-contracts-2026-05-13.json

{
  "task_id": "cross-repo-artifact-contracts-2026-05-13",
  "title": "Define cross-repo artifact contracts for DataBase ContentBase MyBlog",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/cross-repo-artifact-contracts",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/cross-repo-artifact-contracts.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/cross-repo-artifact-contracts-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T11:55:00Z",
  "updated_at": "2026-05-13T11:55:00Z",
  "handoff": null,
  "notes": "Doc-only artifact grammar. Scope excludes ContractGuard gates and implementation changes."
}



---

# evidence\claims\cross-repo-artifact-inventory-2026-05-13.json

{
  "task_id": "cross-repo-artifact-inventory-2026-05-13",
  "title": "Inventory cross-repo artifact contract implementation gaps",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/cross-repo-artifact-inventory",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/cross-repo-artifact-inventory-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T12:15:00Z",
  "updated_at": "2026-05-13T12:15:00Z",
  "handoff": null,
  "notes": "Doc-only current-state inventory. Scope excludes ContractGuard gates and implementation changes."
}



---

# evidence\claims\database-gateway-p0.json

{
  "schema_version": 1,
  "task_id": "database-gateway-p0",
  "title": "Implement DataBase Gateway P0",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/",
    "docs/gateway/database-gateway-p0.md",
    "docs/gateway/database-api-service-plan.md",
    "docs/gateway/README.md",
    "project.json"
  ],
  "started_at": "2026-05-10T00:00:00Z",
  "updated_at": "2026-05-10T20:40:00+08:00",
  "completed_at": "2026-05-10T20:40:00+08:00",
  "handoff": null,
  "commit": "a1d2860",
  "notes": "Gateway P0 is implemented and deployed. Public host is https://database.tengokukk.com. Auth is configurable through DATABASE_GATEWAY_AUTH_REQUIRED and defaults to false. Read APIs and five write facade APIs have been verified; write facade uses database_gateway_mutations for idempotency."
}



---

# evidence\claims\database-gateway-write-client-boundary-2026-05-12.json

{
  "task_id": "database-gateway-write-client-boundary-2026-05-12",
  "title": "Expose explicit DataBase Gateway write client contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-12T02:26:19Z",
  "updated_at": "2026-05-12T02:39:09Z",
  "completed_at": "2026-05-12T02:39:09Z",
  "handoff": null,
  "notes": "Existing DataBase Gateway /writes endpoints are now represented in gateway/openapi.yaml and generated TypeScript client methods. Gateway status mode now reports read-write-facade instead of read-only."
}



---

# evidence\claims\database-infrastructure-boundary-2026-05-12.json

{
  "task_id": "database-infrastructure-boundary-2026-05-12",
  "title": "Tighten DataBase gateway boundary for creative contract consumption",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/README.md",
    "docs/gateway/external-integration-contract.md",
    "gateway/src/clients/database-gateway-client.ts",
    "gateway/package.json",
    "gateway/package-lock.json",
    "gateway/README.md",
    "gateway/openapitools.json",
    "generated/clients/database-gateway/",
    "services/gateway-client-adapters/myblog-adapter.ts",
    "services/gateway-client-adapters/myblog-adapter.js",
    "services/gateway-client-adapters/README.md",
    "services/gateway-client-adapters/USAGE.md",
    "README.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-12T02:00:12Z",
  "updated_at": "2026-05-12T02:21:51Z",
  "completed_at": "2026-05-12T02:21:51Z",
  "handoff": null,
  "notes": "Creative contract consumer boundary is documented as Gateway-only. DataBase now generates a TypeScript fetch client from gateway/openapi.yaml at generated/clients/database-gateway; ContentBase consumes that generated client by file dependency."
}



---

# evidence\claims\database-rpc-completion-2026-05-13.json

{
  "task_id": "database-rpc-completion-2026-05-13",
  "title": "Complete DataBase RPC boundary through deployment and ContentBase migration",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/",
    "schemas/",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl",
    "E:/My Project/ContentBase/"
  ],
  "started_at": "2026-05-13T02:37:46Z",
  "updated_at": "2026-05-13T02:54:51Z",
  "handoff": null,
  "notes": "Completed practical RPC boundary: production Gateway deployed and active, story-memory SQL already present, public story-memory/context routes verified, Gateway/gateway-mcp smoke passed, generated SDK builds, and ContentBase StoryStateManager now consumes story-memory through the generated SDK. README.md/project.json were not touched due active repository consolidation claim."
}



---

# evidence\claims\domain-contract-authority-2026-05-13.json

{
  "task_id": "domain-contract-authority-2026-05-13",
  "title": "Document DataBase as unique domain schema authority",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/architecture/author-operating-database.md",
    "docs/architecture/civilization-semantic-writing-system.md",
    "schemas/README.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-12T23:57:23Z",
  "updated_at": "2026-05-13T00:05:00Z",
  "handoff": null,
  "notes": "Record the architecture rule that DataBase owns domain contracts and consumers only consume generated contracts; encode creative semantic graph direction."
}



---

# evidence\claims\epub-ingestion-contract-2026-05-13.json

{
  "task_id": "epub-ingestion-contract-2026-05-13",
  "title": "Define EPUB to CDM/CCG ingestion contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/epub-ingestion-contract",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/epub-ingestion-contract.md",
    "schemas/document/epub-ingestion-manifest.schema.json",
    "examples/document/minimal-epub-ingestion-manifest.json",
    "docs/contracts/canonical-content-graph.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/epub-ingestion-contract-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T14:05:00Z",
  "updated_at": "2026-05-13T14:05:00Z",
  "handoff": null,
  "notes": "Doc/schema-only EPUB import boundary. Scope excludes importer implementation and EPUB-to-Markdown conversion."
}



---

# evidence\claims\evidence-fact-atom-contract-2026-05-14.json

{
  "task_id": "evidence-fact-atom-contract-2026-05-14",
  "title": "Expose DataBase-owned evidence fact atoms from canonical content blocks",
  "agent_id": "codex",
  "status": "active",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/content/canonical-content-contract.ts",
    "schemas/creative/article-acceptance-contract.ts",
    "schemas/creative/package.json",
    "gateway/src/routes/content.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/claims/evidence-fact-atom-contract-2026-05-14.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-14T10:50:00Z",
  "updated_at": "2026-05-14T10:50:00Z",
  "handoff": null,
  "notes": "Move strict article fact atoms toward DataBase evidence ownership by deriving typed atoms from canonical evidence_citation blocks instead of ContentBase request payloads."
}



---

# evidence\claims\evidence-pack-retrieval-quality-2026-05-18.json

{
  "task_id": "evidence-pack-retrieval-quality-2026-05-18",
  "title": "Strengthen EvidencePack retrieval quality and ContentBase article consumption",
  "agent_id": "codex",
  "status": "completed",
  "branch": null,
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "apps/gateway/src/routes/evidence.ts",
    "apps/gateway/scripts/generate-openapi.mjs",
    "packages/schemas/content/canonical-content-contract.ts",
    "packages/database-client/",
    "E:/My Project/ContentBase/product/novel/app/article/",
    "E:/My Project/ContentBase/product/novel/tools/generate-article-mvp.mjs",
    "E:/My Project/ContentBase/README.md",
    "E:/My Project/ContentBase/product/novel/README.md"
  ],
  "started_at": "2026-05-18T00:00:00Z",
  "updated_at": "2026-05-19T06:55:00Z",
  "handoff": null,
  "notes": "EvidencePack now supports sourceIds filtering, source filter screening evidence, body/locator-first ranking, and ContentBase SDK/CLI passthrough. Verified book_xingwang_world_history_21 readback on temporary Gateway 18206 with locator and metadata sourceId preserved."
}



---

# evidence\claims\experience-manager-service.json

{
  "schema_version": 1,
  "task_id": "experience-manager-service",
  "title": "Import sanitized experience manager service",
  "agent_id": "external-builder-or-active-agent",
  "status": "active",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "services/experience-manager/",
    "docs/operations/ai-memory-ingestion-roadmap.md",
    "ecosystem/atramenti-capability-inventory.json",
    "ecosystem/repos.json",
    "ecosystem/supply-relationships.json",
    "ecosystem/upstreams.json"
  ],
  "started_at": "2026-05-10T00:00:00Z",
  "updated_at": "2026-05-10T00:00:00Z",
  "handoff": null,
  "notes": "Sanitized experience-manager service has been imported. Other agents may work in parallel on separate branches, but overlapping changes should be recorded and reviewed."
}



---

# evidence\claims\gateway-api-surface-governance-2026-05-13.json

{
  "task_id": "gateway-api-surface-governance-2026-05-13",
  "title": "Stabilize DataBase Gateway API surface governance",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/gateway/api-surface-governance.md",
    "scripts/check-contentbase-canonical-sql-boundary.ps1",
    "project.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T15:00:00+08:00",
  "updated_at": "2026-05-13T15:05:00+08:00",
  "handoff": null,
  "notes": "Consolidation task completed: defined Gateway stable API surface rules and added a boundary guard for ContentBase novel canonical works/chapters SQL regression.",
  "checks": [
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot \"E:\\My Project\\ContentBase\"",
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\check-project-standard.ps1 -Root \"E:\\My Project\\DataBase\""
  ]
}



---

# evidence\claims\gateway-contract-validation-2026-05-13.json

{
  "task_id": "gateway-contract-validation-2026-05-13",
  "title": "Enforce DataBase schema contracts in Gateway responses",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/package.json",
    "gateway/package-lock.json",
    "gateway/tsconfig.json",
    "gateway/src/http.ts",
    "gateway/src/routes/content.ts",
    "gateway/src/routes/creative.ts",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T00:16:11Z",
  "updated_at": "2026-05-13T00:27:00Z",
  "handoff": null,
  "notes": "P0 contract-enforced Gateway: map canonical DB rows to domain contract shape and parse through DataBase Zod schemas before returning."
}



---

# evidence\claims\gateway-core-health-optional-downstreams-2026-05-14.json

{
  "task_id": "gateway-core-health-optional-downstreams-2026-05-14",
  "title": "Separate DataBase Gateway core health from optional downstream health",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/src/routes/health.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    "gateway/scripts/smoke.mjs",
    "gateway/README.md",
    "docs/gateway/database-gateway-operations.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-14T15:20:00Z",
  "updated_at": "2026-05-14T15:45:00Z",
  "handoff": null,
  "notes": "/health now represents required Gateway core readiness: MySQL must pass, while NocoDB/OpenList are exposed under optionalDownstreams and do not decide core readiness. /health/dependencies still reports MySQL/schema as required and optional downstream status as evidence. Verified with gateway typecheck, gateway build, OpenAPI generation, generated client build, live /health 200 with optionalDownstreams.nocodb=error, and npm run smoke. Residual risk: NocoDB itself remains unhealthy and must be fixed by its owning runtime, not by weakening Gateway readiness."
}



---

# evidence\claims\gateway-production-stability-2026-05-13.json

{
  "task_id": "gateway-production-stability-2026-05-13",
  "title": "Diagnose production DataBase Gateway malformed packet failures",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/gateway/database-gateway-operations.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T00:28:30Z",
  "updated_at": "2026-05-13T01:03:50Z",
  "handoff": null,
  "notes": "Diagnosed intermittent public /inventory/tables 500 as transient MySQL read-pool connection errors; implemented one-shot retry for read helper and added /health/runtime plus /health/dependencies. Deployed to /srv/database-gateway on server-124, installed schema package dependencies under /srv/schemas/*, restarted database-gateway.service, and verified public health plus services/gateway-mcp smoke."
}



---

# evidence\claims\generation-output-write-contract-2026-05-13.json

{
  "task_id": "generation-output-write-contract-2026-05-13",
  "title": "Add DataBase Gateway generation output write contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/content/",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T03:34:16Z",
  "updated_at": "2026-05-13T03:45:24Z",
  "handoff": null,
  "notes": "Added the idempotent record-generation-output write path, generated OpenAPI/SDK, and kept legacy chapter status transitions owned by ContentBase state machine."
}



---

# evidence\claims\graph-versioning-edit-2026-05-13.json

{
  "task_id": "graph-versioning-edit-2026-05-13",
  "title": "Define graph versioning and edit operation contracts",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/graph-versioning-edit-contract",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/graph-versioning-edit-contract.md",
    "schemas/document/graph-edit-operation.schema.json",
    "schemas/document/graph-version-manifest.schema.json",
    "examples/document/minimal-graph-edit-operation.json",
    "examples/document/minimal-graph-version-manifest.json",
    "docs/contracts/canonical-content-graph.md",
    "docs/contracts/annotation-graph-contract.md",
    "docs/contracts/asset-graph-contract.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/graph-versioning-edit-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T15:35:00Z",
  "updated_at": "2026-05-13T15:35:00Z",
  "handoff": null,
  "notes": "Doc/schema-only graph version/edit contract. Scope excludes graph storage, editor implementation, conflict resolution, and projection rebuild triggers."
}



---

# evidence\claims\import-semantic-structure-rpc-migration-2026-05-13.json

{
  "task_id": "import-semantic-structure-rpc-migration-2026-05-13",
  "title": "Migrate ContentBase import semantic structure writes to DataBase Gateway",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/content/canonical-content-contract.ts",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    "E:/My Project/ContentBase/product/novel/tools/import-txt-works.mjs",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T15:40:00+08:00",
  "updated_at": "2026-05-13T16:05:00+08:00",
  "handoff": null,
  "notes": "Completed: ContentBase import/backfill writes for volume/chapter outlines, characters, world settings, and seeded story memory now go through DataBase Gateway replaceWorkStructure RPC.",
  "checks": [
    "npm run typecheck in schemas/content",
    "npm run build in schemas/content",
    "npm run typecheck in gateway",
    "npm run build in gateway",
    "npm run generate:openapi in gateway",
    "npm run generate:client in gateway",
    "npm run build in generated/clients/database-gateway",
    "node --check E:\\My Project\\ContentBase\\product\\novel\\tools\\import-txt-works.mjs",
    "pnpm --filter novel-product run build",
    "pnpm --filter novel-product run test",
    "check-contentbase-canonical-sql-boundary -ReportAll",
    "check-project-standard"
  ]
}



---

# evidence\claims\kinkakuji-style-reference-import-2026-05-19.json

{
  "task_id": "kinkakuji-style-reference-import-2026-05-19",
  "title": "Import Kinkakuji as restricted style reference corpus",
  "agent_id": "codex",
  "status": "completed",
  "branch": "refactor/codex/canonical-content-gateway-client",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "apps/gateway/scripts/import-local-book-corpus.mjs",
    "apps/gateway/package.json",
    "apps/gateway/package-lock.json",
    "docs/runtime/search-and-classification-runtime.md",
    "README.md",
    "literature",
    "search_documents",
    "search_chunks",
    "semantic_units"
  ],
  "started_at": "2026-05-19T09:50:00Z",
  "updated_at": "2026-05-19T10:05:00Z",
  "handoff": null,
  "notes": "Imported C:\\Users\\ASUS-KL\\Downloads\\金阁寺.epub as sourceId book_kinkakuji_restricted_style. Stored restricted style/syntax profiles only; no reusable sentence-copy library or ContentBase shadow registry."
}



---

# evidence\claims\literature-source-originals-import-2026-05-15.json

{
  "schema_version": 1,
  "task_id": "literature-source-originals-import-2026-05-15",
  "title": "Import lawful theory source originals into DataBase literature",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/sql/",
    "docs/storage/mysql-current-state.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-15T07:39:00+08:00",
  "updated_at": "2026-05-15T09:05:00+08:00",
  "completed_at": "2026-05-15T07:50:00+08:00",
  "handoff": null,
  "commit": null,
  "notes": "DataBase remains canonical owner for literature originals. Import uses existing literature table after schema convergence with Gateway read contract; no ContentBase or Obsidian shadow truth. Reopened for expansion: added canonical importer and imported 10 more theory/historical-document records, including 9 text originals and 1 metadata-only newspaper source."
}



---

# evidence\claims\myblog-edit-surface-reference-2026-05-13.json

{
  "task_id": "myblog-edit-surface-reference-2026-05-13",
  "title": "Define MyBlog edit surface reference architecture",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/myblog-edit-surface-reference-architecture",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/reference-architecture/myblog-edit-surface.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/myblog-edit-surface-reference-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T17:10:00Z",
  "updated_at": "2026-05-13T17:10:00Z",
  "handoff": null,
  "notes": "Doc-only reference architecture for clone-first MyBlog edit surface. Scope excludes MyBlog implementation, dependency installation, and DataBase runtime routes."
}


---

# evidence\claims\obsidian-canonical-projection-2026-05-13.json

{
  "claimed_paths": [
    "gateway/src/routes/writes.ts",
    "gateway/API.md",
    "gateway/openapi.yaml",
    "docs/architecture/canonical-content-system.md",
    "docs/operations/obsidian-canonical-projection.md",
    "project.json"
  ],
  "title": "Add canonical Obsidian Markdown projection write path",
  "agent_id": "codex",
  "updated_at": "2026-05-13T00:03:27Z",
  "branch": "refactor/codex/canonical-content-gateway-client",
  "started_at": "2026-05-12T23:52:59Z",
  "status": "completed",
  "conflict_policy": "coordinate-on-overlap",
  "notes": "DataBase owns structured canonical projection of Obsidian Markdown; Vault remains human editable file truth.",
  "handoff": null,
  "task_id": "obsidian-canonical-projection-2026-05-13"
}



---

# evidence\claims\openlist-myblog-gateway-2026-05-16.json

{
  "task_id": "openlist-myblog-gateway-2026-05-16",
  "title": "Expose OpenList-backed MyBlog book runtime through DataBase Gateway",
  "agent_id": "codex",
  "status": "review",
  "branch": "agent/codex/openlist-myblog-gateway",
  "conflict_policy": "review-before-merge",
  "claimed_paths": [
    "gateway/src/routes/openlist.ts",
    "gateway/src/routes/myblog.ts",
    "gateway/sql/010_openlist_storage_topology.sql",
    "gateway/sql/011_myblog_runtime.sql",
    "services/openlist-adapter/"
  ],
  "started_at": "2026-05-16T00:00:00Z",
  "updated_at": "2026-05-16T00:00:00Z",
  "handoff": null,
  "notes": "OpenList is the access projection. DataBase owns target ids and MyBlog reader runtime tables."
}



---

# evidence\claims\public-surface-edit-intake-2026-05-13.json

{
  "task_id": "public-surface-edit-intake-2026-05-13",
  "title": "Define MyBlog public surface edit intake contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/myblog-public-edit-intake-contract",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/public-surface-edit-intake-contract.md",
    "schemas/document/public-edit-intake.schema.json",
    "examples/document/minimal-public-edit-intake.json",
    "docs/contracts/three-repo-topology-constitution.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "docs/contracts/reader-runtime-projection-contract.md",
    "docs/contracts/graph-versioning-edit-contract.md",
    "docs/contracts/annotation-graph-contract.md",
    "docs/contracts/canonical-content-graph.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/public-surface-edit-intake-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T16:30:00Z",
  "updated_at": "2026-05-13T16:45:00Z",
  "handoff": null,
  "notes": "Doc/schema-only MyBlog public surface write intake contract. Scope excludes MyBlog implementation, auth, moderation storage, and DataBase runtime routes."
}


---

# evidence\claims\publication-result-write-contract-2026-05-15.json

{
  "task_id": "publication-result-write-contract-2026-05-15",
  "title": "Add DataBase-owned publication result write contract",
  "agent_id": "codex",
  "status": "active",
  "branch": "refactor/codex/canonical-content-gateway-client",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "packages/schemas/content/canonical-content-contract.ts",
    "apps/gateway/src/routes/writes.ts",
    "apps/gateway/scripts/generate-openapi.mjs",
    "apps/gateway/openapi.yaml",
    "packages/database-client/",
    "evidence/claims/publication-result-write-contract-2026-05-15.json",
    "evidence/timeline/events.jsonl"
  ],
  "started_at": "2026-05-15T12:20:00Z",
  "updated_at": "2026-05-15T12:20:00Z",
  "handoff": null,
  "notes": "Define the canonical Gateway write API for publication_records and chapter/content_part publication state. fanqie-service must call this endpoint instead of keeping local publication truth."
}



---

# evidence\claims\raw-artifact-annotation-2026-05-13.json

{
  "task_id": "raw-artifact-annotation-2026-05-13",
  "title": "Define raw artifact store and annotation graph contracts",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/raw-artifact-annotation",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/raw-artifact-store-contract.md",
    "schemas/document/raw-artifact.schema.json",
    "examples/document/minimal-raw-artifact.json",
    "docs/contracts/annotation-graph-contract.md",
    "schemas/document/annotation-graph.schema.json",
    "examples/document/minimal-annotation-graph.json",
    "docs/contracts/content-ingestion-constitution.md",
    "docs/contracts/canonical-content-graph.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/raw-artifact-annotation-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T14:50:00Z",
  "updated_at": "2026-05-13T14:50:00Z",
  "handoff": null,
  "notes": "Doc/schema-only raw artifact and annotation contracts. Scope excludes OpenList moves, file cleanup, registry implementation, reader UI, and gates."
}



---

# evidence\claims\reader-runtime-projection-2026-05-13.json

{
  "task_id": "reader-runtime-projection-2026-05-13",
  "title": "Define reader runtime and projection package contracts",
  "agent_id": "codex",
  "status": "completed",
  "branch": "docs/reader-runtime-projection-contract",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "docs/contracts/reader-runtime-projection-contract.md",
    "schemas/document/projection-package.schema.json",
    "schemas/document/reader-runtime-state.schema.json",
    "examples/document/minimal-projection-package.json",
    "examples/document/minimal-reader-runtime-state.json",
    "docs/contracts/canonical-content-graph.md",
    "docs/contracts/anchor-location-contract.md",
    "docs/contracts/annotation-graph-contract.md",
    "docs/contracts/cross-repo-artifact-contracts.md",
    "docs/contracts/cross-repo-artifact-inventory.md",
    "ECOSYSTEM_MAP.md",
    ".runtime/claims/reader-runtime-projection-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T16:00:00Z",
  "updated_at": "2026-05-13T16:00:00Z",
  "handoff": null,
  "notes": "Doc/schema-only reader runtime and projection package contract. Scope excludes MyBlog implementation, reader UI, pagination engine, and projection builder."
}



---

# evidence\claims\readme-led-normalization-2026-05-15.json

{
  "task_id": "readme-led-normalization-2026-05-15",
  "title": "README-led owner map and closed-loop normalization",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "README.md",
    "project.json",
    ".runtime/claims/creative-context-legacy-chapter-material-2026-05-13.json",
    ".runtime/timeline/events.jsonl",
    "C:/Users/ASUS-KL/.codex/policy/defaults.md",
    "C:/Users/ASUS-KL/.codex/policy/structural-laws.md",
    "C:/Users/ASUS-KL/.codex/policy/annotated.md",
    "C:/Users/ASUS-KL/.codex/policy/gate-registry.json"
  ],
  "started_at": "2026-05-15T03:38:14Z",
  "updated_at": "2026-05-15T03:38:14Z",
  "handoff": null,
  "notes": "README is now explicitly an operating map and owner index, not a corpus store, failure database, learning memory, schema owner, or plan ledger. DataBase project manifest schema validation was restored by using the existing data-infrastructure-map type."
}



---

# evidence\claims\repository-consolidation-audit-2026-05-10.json

{
  "schema_version": 1,
  "task_id": "repository-consolidation-audit-2026-05-10",
  "title": "Audit archive readiness for candidate repositories",
  "agent_id": "codex",
  "status": "active",
  "branch": "main",
  "conflict_policy": "review-before-merge",
  "claimed_paths": [
    "docs/github/archive-readiness-scan-2026-05-10.md",
    "docs/github/repository-consolidation-plan.md",
    "docs/github/archive-candidates-2026-05-10.md",
    "ecosystem/repository-consolidation.json",
    "README.md",
    "project.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-10T00:00:00Z",
  "updated_at": "2026-05-10T00:00:00Z",
  "handoff": null,
  "notes": "Reference-only audit of archive readiness. No repository deletion or GitHub state change is authorized by this task."
}



---

# evidence\claims\schema-driven-openapi-2026-05-13.json

{
  "task_id": "schema-driven-openapi-2026-05-13",
  "title": "Make Gateway OpenAPI consumable from DataBase Zod contract schemas",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/openapi.yaml",
    "gateway/package.json",
    "gateway/package-lock.json",
    "gateway/scripts/",
    "schemas/content/",
    "schemas/creative/",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T01:10:00Z",
  "updated_at": "2026-05-13T01:37:05Z",
  "handoff": null,
  "notes": "Added Gateway generate:openapi script that derives canonical content and creative style response schemas from DataBase Zod contracts, updates OpenAPI refs for runtime-enforced routes, and regenerates the TypeScript SDK. Added generated client whitespace cleanup as a repeatable post-generation step. Active repository-consolidation paths README.md/project.json were not touched."
}



---

# evidence\claims\schema-first-contracts-2026-05-13.json

{
  "task_id": "schema-first-contracts-2026-05-13",
  "title": "Make core DataBase contracts runtime-validatable",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/creative/creative-style-contract.ts",
    "schemas/creative/package.json",
    "schemas/creative/package-lock.json",
    "schemas/creative/tsconfig.json",
    "schemas/creative/dist/",
    "schemas/creative/README.md",
    "schemas/content/canonical-content-contract.ts",
    "schemas/content/package.json",
    "schemas/content/package-lock.json",
    "schemas/content/tsconfig.json",
    "schemas/content/dist/",
    "schemas/content/README.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T00:04:36Z",
  "updated_at": "2026-05-13T00:12:00Z",
  "handoff": null,
  "notes": "Promote creative/content contract files from type-only declarations to Zod-first runtime validation schemas with inferred TypeScript types."
}



---

# evidence\claims\search-query-entrypoint.json

{
  "schema_version": 1,
  "task_id": "search-query-entrypoint",
  "title": "Add unified database query entrypoint and search policy",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "review-before-merge",
  "claimed_paths": [
    "scripts/database-query.ps1",
    "scripts/mysql-status.ps1",
    "schemas/search/index-policy.json",
    "docs/runtime/search-and-classification-runtime.md",
    "docs/runtime/service-addresses.md"
  ],
  "started_at": "2026-05-10T00:00:00Z",
  "updated_at": "2026-05-10T00:00:00Z",
  "handoff": null,
  "commit": "ef6494c",
  "notes": "Completed P1 local query entrypoint. Future gateway work should call this boundary or reimplement it deliberately behind a stable API."
}



---

# evidence\claims\semantic-creative-context-contracts-2026-05-13.json

{
  "task_id": "semantic-creative-context-contracts-2026-05-13",
  "title": "Enforce semantic and creative context Gateway contracts",
  "agent_id": "codex",
  "status": "completed",
  "branch": "local",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/src/routes/semantic.ts",
    "gateway/src/routes/creative.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T01:45:00Z",
  "updated_at": "2026-05-13T02:17:55Z",
  "handoff": null,
  "notes": "Added semantic Zod contracts, creative context Zod contract, Gateway response validation for /semantic/* and /creative/context, schema-derived OpenAPI components, regenerated TypeScript SDK, and removed retired CreativeContextResponse generated models. Overlaps story-memory active claim on OpenAPI/generated client paths were limited to generation output and recorded in timeline. Not deployed."
}



---

# evidence\claims\semantic-reference-material-import-2026-05-15.json

{
  "task_id": "semantic-reference-material-import-2026-05-15",
  "title": "Import new-landlord semantic reference materials into DataBase",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/scripts/import-new-landlord-reference-materials.mjs",
    "gateway/package.json",
    "docs/storage/mysql-current-state.md",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-15T00:00:00Z",
  "updated_at": "2026-05-15T00:00:00Z",
  "handoff": null,
  "notes": "Imported the Obsidian new-landlord aggregate into semantic_units through the canonical Gateway write facade so theory, observer, comparison, document, and literary material becomes queryable and reusable in DataBase. 26 units were written and smoke passed."
}



---

# evidence\claims\semantic-reference-material-write-contract-2026-05-15.json

{
  "task_id": "semantic-reference-material-write-contract-2026-05-15",
  "title": "Add DataBase-owned reusable reference material write contract",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "schemas/semantic/semantic-contract.ts",
    "gateway/src/routes/semantic.ts",
    "gateway/src/routes/writes.ts",
    "gateway/scripts/generate-openapi.mjs",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/",
    "gateway/scripts/smoke.mjs",
    "docs/contracts/evidence-contract.md",
    "gateway/sql/002_write_facade_permissions.sql",
    "docs/gateway/service-accounts.md"
  ],
  "started_at": "2026-05-15T00:00:00Z",
  "updated_at": "2026-05-15T00:00:00Z",
  "handoff": null,
  "notes": "Completed the 25-question gap for reusable theory/news/literature/observer material: DataBase stores material as semantic units with material-kind tags; ContentBase consumes via Gateway semantic contracts. Live gateway smoke passed after applying semantic table grants to database_content_rw."
}



---

# evidence\claims\story-memory-gateway-contract-2026-05-13.json

{
  "task_id": "story-memory-gateway-contract-2026-05-13",
  "title": "Expose canonical story memory through DataBase Gateway",
  "agent_id": "codex",
  "status": "completed",
  "branch": "refactor/codex/canonical-content-gateway-client",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "gateway/sql/007_story_memory.sql",
    "gateway/src/routes/story-memory.ts",
    "gateway/src/routes/writes.ts",
    "gateway/src/routes.ts",
    "gateway/openapi.yaml",
    "generated/clients/database-gateway/"
  ],
  "started_at": "2026-05-13T01:14:00Z",
  "updated_at": "2026-05-13T02:29:08Z",
  "handoff": null,
  "notes": "Moved story_events, character_growth, and important_items behind DataBase Gateway read/write contracts. Added creative story-memory Zod schemas, runtime response validation for /creative/story-memory and /creative/story-memory/context, validated record_story_memory mutation response, schema-derived OpenAPI paths, and regenerated SDK methods getStoryMemory/getStoryMemoryContext/recordStoryMemory. Not deployed; SQL migration remains prepared in gateway/sql/007_story_memory.sql."
}



---

# evidence\claims\style-pack-gateway-contract-2026-05-19.json

{
  "task_id": "style-pack-gateway-contract-2026-05-19",
  "title": "Expose DataBase-owned StylePack for ContentBase writing runtime",
  "agent_id": "codex",
  "status": "completed",
  "branch": "refactor/codex/canonical-content-gateway-client",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "apps/gateway/src/routes/style.ts",
    "apps/gateway/src/routes.ts",
    "apps/gateway/scripts/generate-openapi.mjs",
    "packages/schemas/semantic/semantic-contract.ts",
    "packages/database-client/",
    "docs/runtime/search-and-classification-runtime.md",
    "README.md",
    "E:/My Project/ContentBase/product/novel/app/article/",
    "E:/My Project/ContentBase/product/novel/tools/generate-article-mvp.mjs",
    "E:/My Project/ContentBase/product/novel/README.md",
    "E:/My Project/ContentBase/vendor/database-artifacts/"
  ],
  "started_at": "2026-05-19T10:26:46.523146Z",
  "updated_at": "2026-05-19T11:08:00.0000000Z",
  "handoff": null,
  "notes": "Completed /style/pack Gateway route, StylePack schema, OpenAPI/SDK generation, ContentBase runtime consumption, docs, and live readback on port 18090."
}



---

# evidence\claims\three-repo-topology-constitution-2026-05-13.json

{
  "task_id": "three-repo-topology-constitution-2026-05-13",
  "title": "Define DataBase ContentBase MyBlog topology constitution",
  "agent_id": "codex",
  "status": "completed",
  "branch": "main",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "SYSTEM_IDENTITY.md",
    "ECOSYSTEM_MAP.md",
    "docs/contracts/three-repo-topology-constitution.md",
    ".runtime/claims/three-repo-topology-constitution-2026-05-13.json",
    ".runtime/timeline/events.jsonl"
  ],
  "started_at": "2026-05-13T11:24:22Z",
  "updated_at": "2026-05-13T11:33:00Z",
  "handoff": null,
  "notes": "Doc-only topology constitution. Scope excludes ContractGuard gate/runtime enforcement."
}



---

# evidence\claims\xingwang-world-history-corpus-import-2026-05-19.json

{
  "task_id": "xingwang-world-history-corpus-import-2026-05-19",
  "title": "Import Xingwang World History as maintainable DataBase corpus",
  "agent_id": "codex",
  "status": "completed",
  "branch": null,
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "apps/gateway/scripts/import-local-book-corpus.mjs",
    "apps/gateway/package.json",
    "apps/gateway/src/routes/evidence.ts",
    "docs/runtime/search-and-classification-runtime.md",
    "README.md",
    "evidence/claims/xingwang-world-history-corpus-import-2026-05-19.json",
    "evidence/timeline/events.jsonl"
  ],
  "started_at": "2026-05-19T00:00:00Z",
  "updated_at": "2026-05-19T06:35:00Z",
  "handoff": null,
  "notes": "Added DataBase-owned local book corpus importer. Imported 兴亡的世界史全21卷 into literature id 72, search document sd_39c2c9980c3f294a8d808aaf44ec868cf9c8cbd5, 4041 search chunks, and 120 semantic_units. Temporary Gateway 18091 verified EvidencePack locator readback."
}



---

# evidence\integration-queue\database-gateway-p0.json

{
  "schema_version": 1,
  "task_id": "database-gateway-p0",
  "agent_id": "codex",
  "branch": "main",
  "status": "integrated",
  "base": "main",
  "commit": "a1d2860",
  "claimed_paths": [
    "gateway/",
    "docs/gateway/database-gateway-p0.md",
    "docs/gateway/database-api-service-plan.md",
    "docs/gateway/README.md",
    "project.json"
  ],
  "checks": [
    "npm run typecheck",
    "npm run build",
    "npm run smoke",
    "public API write check"
  ],
  "updated_at": "2026-05-10T20:40:00+08:00",
  "integration_notes": "Gateway source has been synced into the DataBase repository under gateway/. Production runs from server-124:/srv/database-gateway. Public API docs are available at /docs/api and /openapi.yaml. Auth key validation is optional and disabled by default. Five write facade routes are implemented and verified."
}



---

# evidence\integration-queue\experience-manager-service.json

{
  "schema_version": 1,
  "task_id": "experience-manager-service",
  "agent_id": "external-builder-or-active-agent",
  "branch": "main",
  "status": "ready-for-review",
  "base": "main",
  "commit": "2779cb0",
  "claimed_paths": [
    "services/experience-manager/",
    "docs/operations/ai-memory-ingestion-roadmap.md",
    "ecosystem/atramenti-capability-inventory.json",
    "ecosystem/repos.json",
    "ecosystem/supply-relationships.json",
    "ecosystem/upstreams.json"
  ],
  "checks": [
    "npm run smoke",
    "node --check ./mcp/server.mjs"
  ],
  "updated_at": "2026-05-10T00:00:00Z",
  "integration_notes": "Sanitized experience-manager import exists at services/experience-manager and smoke syntax checks pass. Review focus: secret loading, MCP startup wiring, QMD path existence, and alignment with DataBase/Mortis memory policy before enabling as default memory runtime."
}

