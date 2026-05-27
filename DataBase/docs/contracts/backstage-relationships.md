# Backstage Relationships

This repository can project its ecosystem registry into Backstage relationship
entities.

## Relationship Shape

- `Group` represents the human or organizational owner
- `System` represents a bounded runtime or product surface
- `Component` represents an individual repository or service

## Minimal Relationship Model

```text
Group
  -> owns
System
  -> contains
Component
```

## Current Projection

- `emptyinkpot` becomes the owning `Group`
- `DataBase Ecosystem` becomes the umbrella `System`
- each repository in `catalog/ecosystem/repos.json` becomes a `Component`

## Rule

Keep relationship entities generated from the registry, not hand-maintained in
multiple places.

