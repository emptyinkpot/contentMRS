# Backstage Relation Mapping

This repository only emits Backstage dependency relations when a registry value
can be resolved to a real repository name.

## Rule

- string references that look like repository names are resolved directly
- GitHub URLs are normalized to repository names
- unresolved concepts are kept as annotations, not fake relations

## Why This Exists

Relations are stronger than labels. If they are wrong, the catalog lies.
The export must prefer omission over invention.

## Current Sources

- `consumes`
- `consumedBy`

## Current Behavior

- `consumes` can emit `dependsOn` when the target repository exists in the
  registry
- `consumedBy` is treated the same way when it resolves to a registered repo

## Future Extension

Add an explicit relation vocabulary only after the registry owns stable entity
references.

