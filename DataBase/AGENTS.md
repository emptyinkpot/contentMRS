# Repository Agent Rules

## Repository Hygiene

- This is a personal-development repository with one integration truth and two environment debug lanes.
- Keep `main` as the only durable integration branch.
- `local` is the local Windows debugging lane.
- `remote-ide` is the remote IDE / code-server debugging lane.
- Do not merge `local` or `remote-ide` wholesale into `main`; promote only scoped patches through a task branch or pull request.
- Do not merge historical snapshot, backup, upstream experiment, or unrelated feature branches into `main` just to make the repository look clean.
- Before deleting or merging any branch, tag, config, directory, worktree, or old checkout, verify:
  - default branch
  - local and remote branches
  - whether the branch is already merged
  - unique commits that may contain working functionality
  - CI, deployment, script, README, and `project.json` references
  - tag or commit coverage for rollback
- If safety cannot be proven, stop and report the risk instead of cleaning.
- Read `docs/contracts/git-workflow.md`, `docs/contracts/remote-workspace-boundary.md`, and `docs/contracts/environment-branch-runbook.md` before non-trivial Git work.

## Coupling And Configuration

- Prefer one canonical source of truth for each runtime fact.
- Do not create duplicate config roots, duplicate runtime owners, fallback paths, or compatibility layers.
- New capability should be visible and callable through a small entrypoint, with model/provider/storage selection exposed through `project.json` or documented environment variables.
- Keep data storage, model routing, import scripts, validation, and documentation as separate boundaries.

## Data Curation Runtime

- DataBase owns the stored personal data and curation tables.
- `sub2api` owns the replaceable model gateway.
- Codex maintains scripts, schemas, checks, and failure analysis.
- Bulk semantic cleaning should use a replaceable model through `sub2api`, not Codex.

## MCP Policy

- MCP registration for Codex lives in `C:\Users\ASUS-KL\.codex\config.toml`.
- cc-switch may manage MCP entries, but it must not become a hidden second source of server paths.
- Follow `docs/contracts/mcp-security-policy.md` before adding, enabling, or broadening an MCP.
