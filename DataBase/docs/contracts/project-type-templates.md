# Project Type Templates

This document defines the default project templates used by the shared project
initializer.

## Purpose

Project creation should not start from an empty folder. Each type should begin
with a predictable surface so the project can move from script to package
without reinvention.

## Supported Types

### script

Use for one-off utilities, maintenance commands, and automation glue.

Baseline additions:

- `scripts/`
- `docs/`
- `schemas/`
- `README.md`
- `project.json`

### package

Use for reusable libraries or shared modules.

Baseline additions:

- `src/`
- `tests/`
- `docs/`
- `schemas/`
- `README.md`
- `project.json`

### client

Use for API wrappers, SDKs, and remote service clients.

Baseline additions:

- `src/`
- `examples/`
- `docs/`
- `README.md`
- `project.json`

### adapter

Use for consumer-specific compatibility layers.

Baseline additions:

- `src/`
- `docs/`
- `README.md`
- `project.json`

### service

Use for deployable runtimes with health and operations concerns.

Baseline additions:

- `src/`
- `ops/`
- `docs/`
- `schemas/`
- `README.md`
- `project.json`

## Template Selection Rule

Choose the smallest type that reflects the current truth.

- if the project only automates tasks, use `script`
- if the project exports reusable code, use `package`
- if the project wraps a remote API, use `client`
- if the project customizes a consumer boundary, use `adapter`
- if the project runs as a service, use `service`

## Required Metadata

Each generated project should store the selected type in `project.json` and in
the identity card inside `README.md`.

