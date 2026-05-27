# Sub2API Data Curation Consumer

DataBase uses Sub2API as the replaceable OpenAI-compatible model gateway for
data cleaning and labeling.

## Runtime Relationship

```text
DataBase
  scripts/curation/curate-knowledge-items.ps1
    -> OpenAI-compatible /v1/chat/completions
    -> Sub2API
    -> GLM or another configured model/provider
```

Codex is not the bulk cleaning model. Codex maintains scripts, schemas, checks,
and failure analysis. The model worker is selected through Sub2API.

## Environment

```powershell
$env:DATA_CURATION_OPENAI_BASE_URL = "https://sub2api.tengokukk.com/v1"
$env:DATA_CURATION_OPENAI_API_KEY = "<sub2api-issued-key>"
$env:DATA_CURATION_MODEL = "glm-4-flash"
```

The model is replaceable. Any model exposed by Sub2API through
`/v1/chat/completions` can be used.

## Dry Run

```powershell
.\scripts\curation\curate-knowledge-items.ps1 -Limit 10
```

Dry-run creates the curation tables if needed and shows candidate item ids.

## Apply

```powershell
.\scripts\curation\curate-knowledge-items.ps1 -Limit 10 -Apply
```

Labels are stored in:

- `data_curation_runs`
- `data_curation_labels`
- `data_curation_decisions`

## Visibility

Useful query:

```sql
SELECT k.source, k.title, l.content_kind, l.value_level, l.privacy_level, l.action
FROM knowledge_import_items k
JOIN data_curation_labels l
  ON l.source_table = 'knowledge_import_items'
 AND l.source_id = k.id
ORDER BY l.created_at DESC;
```

Secret candidate query:

```sql
SELECT k.source, k.title, l.action, l.privacy_level
FROM knowledge_import_items k
JOIN data_curation_labels l
  ON l.source_table = 'knowledge_import_items'
 AND l.source_id = k.id
WHERE l.action = 'route_to_secret_table'
   OR l.privacy_level = 'secret';
```

## Rule

GLM labels are annotations, not truth. Human/operator decisions go into
`data_curation_decisions`.
