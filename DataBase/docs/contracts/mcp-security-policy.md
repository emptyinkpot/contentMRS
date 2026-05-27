# MCP Security Policy

MCP servers are capability surfaces. Treat them as privileged integration code,
not as harmless plugins.

## Source Of Truth

- MCP registration for Codex lives in `C:\Users\ASUS-KL\.codex\config.toml`.
- cc-switch may manage and sync MCP entries, but it must not become a second
  hidden truth for server paths.
- DataBase records topology, policy, and ownership; it must not store raw
  secrets or copied browser credentials.

## Allowed MCP Classes

Prefer mature, narrow tools:

```text
filesystem     restricted paths only
git/github     repository status, PR, Actions, scoped delivery
database       readonly or API-mediated access
browser/fetch  page reading and verification
workspace      repository and environment inspection
quality        contract, lint, and policy gates
```

## Required Controls

- Use allowlisted roots for filesystem and repository tools.
- Prefer readonly database credentials.
- Route database writes through a reviewed HTTP API or explicit mutation
  endpoint, not arbitrary SQL tools.
- Keep secrets in registered secret surfaces, never in MCP config text.
- Do not give third-party MCPs broad filesystem write access.
- Do not register a server whose command path points at a retired checkout,
  backup directory, cache directory, or unverified clone.
- Remove or disable MCPs that duplicate a more canonical tool unless the
  duplicate has a documented compatibility reason.

## Browser Automation

Prefer official browser control routes:

```text
Chromium/Edge remote debugging port
Playwright connectOverCDP
browser-use or equivalent agent wrapper
```

Do not build cookie extraction, SQLite cookie reads, or DPAPI decryption paths
as the normal automation route.

## Review Checklist

Before adding or enabling an MCP:

- What exact task does it enable?
- What paths, network endpoints, or credentials can it touch?
- Is the command path under a canonical root?
- Is there a narrower existing MCP that already covers the need?
- Does it need to be enabled for Codex, Claude, Gemini, OpenCode, Hermes, or
  only one app?
- Can it be disabled without breaking the repository contract?
