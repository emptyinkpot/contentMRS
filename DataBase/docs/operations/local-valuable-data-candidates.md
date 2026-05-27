# Local Valuable Data Candidates

This inventory lists local data surfaces that may be worth importing, indexing,
or archiving. It is a decision aid only. It does not copy file contents into Git.

Machine-readable inventory:

- `inventories/local-valuable-data-candidates.json`

## Current Recommendation

Do not bulk-import everything into MySQL.

Use three lanes:

| Lane | Meaning | Storage |
| --- | --- | --- |
| Knowledge import | Searchable text and user-authored notes | MySQL `knowledge_import_items` or a later dedicated table |
| Artifact archive | Files that must not lose bytes but do not need row-level querying | Object storage / OpenList / backup volume |
| Ignore / dependency | Generated files, dependencies, caches, duplicate archives | Do not import |

## High-Value Candidates

| Path | Count | Size | Recommendation |
| --- | ---: | ---: | --- |
| `C:\Users\ASUS-KL\OneDrive` | 298 | 884.70 MB | Review first; likely contains school/work documents and office files |
| `C:\Users\ASUS-KL\Desktop` | 168 | 772.71 MB | Review first; mixed documents, images, archives, hardware资料 |
| `E:\My Project\Atramenti box` | 3967 | 241.58 MB | High priority; contains Xiaomi Notes export and knowledge/runtime assets |
| `C:\Users\ASUS-KL\Documents` | 269 | 1.97 MB | Good text candidate; mostly markdown/json |
| `E:\My Project\OpenClaw` | 430 | 8.37 MB | Project knowledge; import docs only, not runtime/db files |
| `E:\My Project\code-server-workspace-infra` | (see repo) | thin docs | Remote IDE truth; replaced duplicate `private-workspace-runtime` checkout |

## Sensitive Candidates

Some discovered files appear to contain account or credential exports, for
example CSV files with `账号密码` in the path.

These must not be imported into the normal knowledge table.

Recommended handling:

- store only path, size, hash, and classification in DataBase
- move actual secret content to a dedicated vault workflow
- do not expose through NocoDB/Directus public views
- do not include plaintext secrets in Git or generic search indexes

## Archive-Only Candidates

| Path | Reason |
| --- | --- |
| `E:\My Project\archive` | Historical source snapshots; useful for recovery but noisy for knowledge DB |
| Hardware资料 under Desktop | Good to preserve as files, but poor fit for MySQL rows |
| Screenshots and image-heavy folders | Store as files with metadata, not as database text |

## Personal Notes Import Quality

Current personal-note import is classified with `import_quality`:

| Quality | Meaning |
| --- | --- |
| `readable-body` | Xiaomi file has readable body text |
| `title-only-null-body` | Xiaomi body is null bytes; title/file name is preserved |
| `notion-readable-page` | Notion local extraction produced useful text |
| `notion-tiny-page` | Notion local extraction produced very short text |

Default query for useful text:

```sql
SELECT source, title, content
FROM knowledge_import_items
WHERE import_quality IN ('readable-body', 'notion-readable-page');
```

Default query for Xiaomi title-only records:

```sql
SELECT title, JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.file_name')) AS file_name
FROM knowledge_import_items
WHERE import_quality = 'title-only-null-body';
```

## Next Decision

Before importing more local data, choose one of:

1. Import only text notes and markdown from `Documents` and `Atramenti box`.
2. Build an object-archive table for binary files and office documents.
3. Keep large files outside MySQL and only store path, hash, size, and tags.
