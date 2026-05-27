# Data Cleaning and Labeling Runtime

This repository should not become an index-only catalog.

The database is allowed to store real data, including personal notes, documents,
and password/account data. The requirement is not "avoid sensitive data"; the
requirement is "store each data class in the right domain with the right access
rules".

## Core Principle

Store data by domain:

| Domain | Stores real data | Example tables |
| --- | --- | --- |
| Knowledge | Yes | `knowledge_import_items` |
| Secrets | Yes | `personal_secret_entries`, `imported_accounts` |
| Artifacts | Yes, when useful | future `file_artifacts` / object store-backed records |
| Indexes | Optional | search metadata, hashes, classification, embeddings |

Indexes are not a substitute for data. Indexes are projections over stored data.

## Password and Secret Data

Password data belongs in the database when the operator explicitly wants this.

Existing secret surfaces:

- `personal_secret_entries`
- `imported_accounts`
- `imported_browser_cookies`

Rules:

- Do not mix passwords into `knowledge_import_items`.
- Do not expose secret tables through public gateway views.
- Do not print plaintext secrets in routine agent reports.
- Store enough metadata to make the secret usable:
  - namespace
  - label
  - account / username
  - URL
  - secret value
  - tags
  - source path / import run
  - last-used / updated timestamps

Plaintext storage is allowed when explicitly requested by the operator. That is
different from casually leaking plaintext in logs, Git, or public UI surfaces.

## Cleaning Model Policy

Bulk cleaning and labeling should use a cheap LLM through `sub2api`, not Codex.

Recommended model route:

```text
DataBase cleaning worker
  -> OpenAI-compatible client
  -> sub2api
  -> GLM channel/model
```

Codex role:

- define schemas
- write import scripts
- write validation checks
- inspect failures
- maintain repository docs

GLM role:

- classify note/document type
- summarize content
- infer tags
- detect duplicates
- detect low-value/garbage records
- propose title normalization
- mark secret-like content for secret-domain routing

## Required Module

Yes, this database needs a dedicated cleaning and labeling module.

Recommended module name:

```text
data-curation-runtime
```

Suggested local structure:

```text
scripts/
  import-personal-notes.ps1
  curate-knowledge-items.ps1
  import-secret-csv.ps1
schemas/
  data-curation/
    knowledge-label.schema.json
    secret-import.schema.json
docs/
  operations/
    data-cleaning-and-labeling-runtime.md
```

Suggested MySQL additions:

```text
data_curation_runs
data_curation_labels
data_curation_decisions
file_artifacts
```

Keep raw imported data immutable where possible. Store cleaning decisions as
separate labels/annotations rather than overwriting source records.

## Mature Projects To Borrow From

### OpenRefine

Repository:

https://github.com/OpenRefine/OpenRefine

Borrow:

- project-based data cleaning
- reversible transformations
- clustering / duplicate cleanup mindset
- human-review-first cleaning workflow

Do not copy:

- full UI
- Java service architecture

### Argilla

Repository:

https://github.com/argilla-io/argilla

Borrow:

- human + AI data curation workflow
- labels as separate records
- review queues
- feedback suggestions
- dataset-centric UI concepts

Do not copy:

- full hosted annotation platform
- training/fine-tuning assumptions

### Label Studio

Repository:

https://github.com/HumanSignal/label-studio

Borrow:

- annotation task model
- review state
- labeling schema
- queue-based manual validation

Do not copy:

- heavy frontend/backend stack unless needed later

### cleanlab

Repository:

https://github.com/cleanlab/cleanlab

Borrow:

- data quality scoring
- noisy-label detection idea
- ranking suspicious records for review

Do not copy:

- ML-specific assumptions as the first version

### Great Expectations

Repository:

https://github.com/great-expectations/great_expectations

Borrow:

- validation expectations
- data quality checks as executable contracts
- repeatable reports

Do not copy:

- full enterprise data-quality framework

### Dagster

Repository:

https://github.com/dagster-io/dagster

Borrow:

- data assets
- lineage
- run records
- observable pipeline executions

Do not copy:

- full orchestrator unless the import/curation pipeline grows large

### DataHub / OpenMetadata

Repositories:

- https://github.com/datahub-project/datahub
- https://github.com/open-metadata/OpenMetadata

Borrow:

- dataset catalog vocabulary
- lineage and ownership metadata
- schema/documentation as first-class objects

Do not copy:

- full metadata platform for this personal database.

## MVP Flow

```text
1. Import real data into the correct raw table
2. Preserve raw bytes/text and hash
3. Queue records for curation
4. GLM labels records through sub2api
5. Store labels separately
6. Run deterministic validation checks
7. Promote useful records into default views
8. Keep weak/damaged records archived but hidden from default views
```

## First Curation Labels

For `knowledge_import_items`:

```text
content_kind:
  note
  story
  prompt
  account_secret_candidate
  project_doc
  school_doc
  trash

value_level:
  high
  medium
  low
  archive_only

privacy_level:
  public
  private
  sensitive
  secret

action:
  keep_searchable
  keep_archived
  route_to_secret_table
  deduplicate
  review_manually
```

## Non-Negotiable Checks

- Raw data must not be destroyed by cleaning.
- Cleaning output must be reproducible by run id.
- GLM outputs are labels, not truth.
- Secret-like records must not enter public views.
- Codex should not be used for bulk semantic labeling.
