# Project Type README Templates

This document defines the default README sections generated for each project
type.

## Common Sections

Every generated project README should include:

- identity card
- purpose
- source of truth
- runtime / deployment boundary
- read order
- verification commands
- ownership
- configuration surfaces
- secret surfaces

## script

Use for glue code and one-off automation.

Suggested sections:

- what it automates
- inputs and outputs
- run command
- verification command

## package

Use for reusable libraries or shared modules.

Suggested sections:

- exported surface
- install or import usage
- local development
- tests

## client

Use for API wrappers and remote service access.

Suggested sections:

- target API
- authentication surface
- example calls
- error handling

## adapter

Use for consumer-specific compatibility layers.

Suggested sections:

- target consumer
- adapted behavior
- mapping rules
- fallback behavior

## service

Use for deployed runtimes.

Suggested sections:

- runtime location
- health endpoint
- restart procedure
- log location
- operational notes

## Recommended Default Blocks

### Identity Card

Keep project identity and type on the first screen.

### Boundary Summary

Explain what the project owns, what it consumes, and what it never stores.

### Verification

List the commands used to confirm the project still matches its contract.
