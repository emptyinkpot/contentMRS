# Project Directory Table

This repository stores project manifests in MySQL as a queryable directory
layer.

## Purpose

Git files remain the human-readable source. MySQL keeps a normalized directory
view so projects can be listed, filtered, compared, and audited without reading
every repository by hand.

## Table Name

`project_directory`

## Record Scope

Each row represents one project manifest snapshot.

## Required Columns

- `project_id`
- `name`
- `project_name`
- `github_repo`
- `visibility`
- `project_type`
- `status`
- `canonical_doc`
- `machine_readable_entry`
- `source_of_truth`
- `runtime_location`
- `deployment_target`
- `manifest_json`
- `manifest_version`
- `updated_at`

## Recommended Indexes

- primary key on `project_id`
- unique key on `github_repo`
- secondary key on `project_type`
- secondary key on `status`
- secondary key on `visibility`

## Sync Rule

The table should be updated by a dedicated sync script from each repository's
`project.json`.

## Query Rule

External tools should query the directory table for overview and discovery,
then open the repository only when they need the full human-readable contract.

