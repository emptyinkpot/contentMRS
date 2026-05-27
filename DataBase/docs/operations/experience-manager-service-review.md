# Experience Manager Service Review

Date: 2026-05-10

## Scope

Reviewed the imported `services/experience-manager/` service as an integrator,
without editing service source files.

## Source Lineage

Recorded by the service README:

```text
sourceRepository: https://github.com/emptyinkpot/Atramenti-Console
cleanstreamRoot: E:\My Project\Atramenti-Console-cleanstream
sourcePath: codex/mcps/experience
pairedSkill: codex/skills/experience-manager/SKILL.md
sourceBaselineCommit: d9f2700e59daefb6a352c5d563f6910d652ccd0a
status: sanitized-imported-minimal-runtime
```

## Checked Files

```text
services/experience-manager/package.json
services/experience-manager/README.md
services/experience-manager/RUNBOOK.md
services/experience-manager/.env.example
services/experience-manager/mcp/experience-manager-mcp.mjs
services/experience-manager/mcp/server.mjs
services/experience-manager/scripts/sync-to-qmd.mjs
services/experience-manager/skill/SKILL.md
```

## Verification

```bash
npm run smoke
node --check ./mcp/server.mjs
```

Result:

```text
passed
```

## Current Capability

The service provides a DataBase-owned memory layer for:

- durable experience records
- durable notes and corrections
- MCP recall/write tools
- QMD mirror refresh
- Codex/Mortis/future-agent shared memory integration

Declared MCP tools include:

```text
cloud_health
memory_status
list_experiences
search_experiences
memory_recall
memory_get
get_experience
record_experience
delete_experience
list_notes
search_notes
get_note
record_note
delete_note
refresh_mirrors
plugin_overview
```

## Positive Findings

- The import is scoped to the minimal service surface, not the whole Atramenti
  frontend/history bundle.
- Environment variables use `EXPERIENCE_DB_*` names and keep real secrets out of
  Git.
- QMD mirror paths are explicit in `.env.example`.
- `npm run smoke` checks the main MCP and QMD sync scripts for syntax validity.
- The paired skill documents how Codex should use shared memory.

## Integration Risks

1. Smoke checks syntax only; they do not prove MySQL connectivity, MCP tool
   behavior, or QMD mirror writes.
2. Startup depends on `EXPERIENCE_DB_PASSWORD` and related secrets being loaded
   from the approved secret surface.
3. QMD paths in `.env.example` must exist before `sync:qmd` is treated as
   production-ready.
4. The service should not become a second source of truth for topology already
   owned by DataBase.
5. Before making this the default Codex memory path, the MCP server should be
   registered in the local MCP config and validated through real tool calls.

## Recommended Next Step

Do not enable this as the default memory runtime yet.

Next smallest integration:

```text
1. verify secret surface exists
2. run cloud_health against the real MySQL-backed service
3. run search_experiences / record_note on a harmless test record
4. run sync:qmd against a test QMD collection
5. then register the MCP server as an active memory provider
```
