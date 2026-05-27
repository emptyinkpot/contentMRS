# Project Contract Pipeline

This repository should enforce project rules through a single validation and
projection pipeline.

## Why This Exists

Manual discipline is not a durable contract. The same checks should run on
every change.

## Pipeline Order

1. validate `project.json` against schema
2. check project standard
3. export Backstage entity
4. export Backstage catalog
5. sync MySQL project directory

## Mature Reference Pattern

This matches the common pattern used by catalog and portal systems:

- a canonical manifest
- generated projections
- CI validation before merge
- a central catalog for discovery

## Rule

If a change breaks any projection or the manifest schema, it must fail before
merge.

