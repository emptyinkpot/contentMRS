---
name: markitdown
description: Use when converting PDFs, Office files, webpages, YouTube URLs, or local documents into Markdown with Microsoft's MarkItDown through the repo-managed codex root.
---

# MarkItDown

## Overview

Use `markitdown-mcp` first when the job is "turn this file or URL into Markdown". Only drop to the CLI or source tree when the MCP wrapper is not enough.

## Canonical Local Roots

- MCP wrapper: `C:\Users\ASUS-KL\.codex\mcps\markitdown-mcp`
- Upstream source: `C:\Users\ASUS-KL\.codex\mcps\integrations\documents\markitdown`

## Workflow

1. Prefer the `markitdown-mcp` server for one-off conversions from agents.
2. If you need package behavior or debugging, inspect `packages\markitdown` and `packages\markitdown-mcp` inside the local upstream source.
3. Keep converted output as Markdown in the active workspace instead of scattering temp copies.
4. If conversion quality depends on optional format support, check the upstream README for the needed extras before changing the wrapper.

## Good Fits

- PDF to Markdown
- Word / PowerPoint / Excel to Markdown
- HTML or webpage to Markdown
- YouTube URL to Markdown transcript or extraction
- Bulk file-to-Markdown preparation for downstream LLM use

## Local Pointers

- Wrapper entry: `C:\Users\ASUS-KL\.codex\mcps\markitdown-mcp\start.cmd`
- Upstream README: `C:\Users\ASUS-KL\.codex\mcps\integrations\documents\markitdown\README.md`

## Rules

- Prefer the repo-managed wrapper over ad-hoc temp scripts.
- Prefer Markdown output over custom intermediate formats unless the task explicitly needs raw extraction data.
- If the user only needs content extraction, do not add a new parser first; use MarkItDown.
