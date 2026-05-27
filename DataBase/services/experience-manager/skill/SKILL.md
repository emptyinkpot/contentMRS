---
name: experience-manager
description: Use when working with the cloud-backed experience manager data through Codex. This skill should be used for searching, reading, recording, updating, deleting, or summarizing experience records and notes stored in the experience-manager MCP server, especially when the user wants Codex to consult or extend the shared experience memory.
---

# Experience Manager

## Overview

Use the `experience-manager` MCP server as the source of truth for shared experience records and notes.

## Workflow

1. Check `cloud_health` only when connectivity is uncertain.
2. Search first with `search_experiences` or `search_notes`.
3. Read full items only when needed.
4. Record with `record_experience` or `record_note`.
5. Delete only on explicit request.

## Daily Use

- Treat the shared memory as the default first stop for any reusable answer.
- For any reusable problem, default to searching QMD first.
- If the question is about long-term memory behavior, stay on the active `experience-manager` + QMD chain unless the user explicitly asks to inspect retired implementations.
- Ask one question at a time.
- Search first, then read the best match.
- If the search reveals a prior mistake, correction, or preferred pattern, apply it before answering.
- Record a new experience if the result changes future work or fixes a repeated failure.
- Keep the entry short, concrete, and actionable.
- If the question could plausibly benefit from prior experience, do not answer from memory alone.
- Query the experience store first even when the user does not explicitly ask for it.

## Self-Correction Loop

Before answering, look for the closest prior experience or note that could change the response.

After answering, if the result is a new correction, recurring mistake, or durable preference, record it immediately.

For any reusable problem, complete the loop: search QMD first, answer from the stored result, then record a durable correction if one was found.

If the correction is durable, let the mirror refresh flow update QMD.

When a user asks for a remembered rule, prefer the stored rule over ad hoc reasoning.

If a response is likely to be repeated later, treat it as memory-worthy and save it.

## User Prompts

- Query memory: `先查经验再答`
- Record experience: `把这次记进经验`
- Strong record request: `这条请直接存成经验`

When the user uses one of these prompts, do not ask for extra confirmation unless the input is ambiguous.

## Rules

- Prefer the MCP server over local files when the goal is shared experience memory.
- Keep writes small and explicit.
- If the user asks for a summary, read first, then summarize from the returned records.
- If the tool output is ambiguous, inspect `plugin_overview` before making assumptions.

## MCP Tools

- `cloud_health`
- `list_experiences`
- `search_experiences`
- `get_experience`
- `record_experience`
- `delete_experience`
- `list_notes`
- `search_notes`
- `get_note`
- `record_note`
- `delete_note`
- `plugin_overview`
