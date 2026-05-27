# Personal Notes Import

This document records the import path for local Notion data and exported Xiaomi
Notes backups into the MySQL structured data system.

## Sources

### Xiaomi Notes

- Export root:
  `E:\My Project\Atramenti box\tools\xiaomi-notes-sync-agent\output\markdown`
- Observed count on 2026-05-10: 1170 markdown files
- Import source label: `xiaomi-notes`

### Notion Local Cache

- Local database:
  `C:\Users\ASUS-KL\AppData\Roaming\Notion\notion.db`
- Import source label: `notion-local`
- Extraction method: read local SQLite `block` rows and reconstruct page text
  from page child blocks.

## Target Tables

Imports use dedicated staging/archive tables so personal note imports do not
pollute application-owned writing tables:

- `knowledge_import_runs`
- `knowledge_import_items`

The import is idempotent by `(source, source_id)`.

`knowledge_import_items` keeps both readable text and raw-source evidence:

- `content`: best-effort readable text
- `import_quality`: quality class for filtering and cleanup
- `raw_sha256`: source byte hash when available
- `raw_bytes`: source byte length when available
- `raw_base64`: original source bytes when available
- `raw_blob`: original source bytes as MySQL `LONGBLOB`

This matters for the Xiaomi export because many exported markdown files retain
their file names but contain null bytes in the file body.

## Script

```powershell
.\scripts\import-personal-notes.ps1
```

Default mode is dry-run. It reports item counts without writing to MySQL.

Apply mode:

```powershell
.\scripts\import-personal-notes.ps1 -Apply
```

Source-specific imports:

```powershell
.\scripts\import-personal-notes.ps1 -Source Xiaomi -Apply
.\scripts\import-personal-notes.ps1 -Source Notion -Apply
```

## Safety Rules

- Do not import into `notes` or `experience_notes_cloud` directly.
- Keep original source labels.
- Keep source path or block id in metadata.
- Preserve raw bytes for damaged local exports.
- Verify `raw_bytes = OCTET_LENGTH(raw_blob)`.
- Verify `raw_sha256 = SHA2(raw_blob, 256)`.
- Use idempotent upserts to avoid duplicate imports.
- Do not commit exported personal note content to Git.

## 2026-05-10 Import Result

Applied runs:

- `personal-notes-20260510-095432`: `xiaomi-notes`, 1170 items
- `personal-notes-20260510-095442`: `notion-local`, 742 items

Verification:

```sql
SELECT source, COUNT(*) AS item_count, SUM(CHAR_LENGTH(content)) AS chars,
       SUM(raw_bytes) AS raw_bytes, SUM(OCTET_LENGTH(raw_blob)) AS blob_bytes
FROM knowledge_import_items
GROUP BY source;
```

Observed result:

| Source | Items | Title chars | Readable chars | Raw bytes | Blob bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| `xiaomi-notes` | 1170 | 91716 | 75462 | 2698417 | 2698417 |
| `notion-local` | 742 | 6272 | 20708 | NULL | NULL |

Quality classes:

| Source | Quality | Count | Meaning |
| --- | --- | ---: | --- |
| `xiaomi-notes` | `title-only-null-body` | 1105 | File body is fully null bytes; preserve title, filename, raw bytes, and hash |
| `xiaomi-notes` | `readable-body` | 65 | File body has readable text |
| `notion-local` | `notion-tiny-page` | 734 | Local Notion page extraction produced very short text |
| `notion-local` | `notion-readable-page` | 8 | Local Notion page extraction produced useful page text |

Xiaomi damage note:

- 1105 Xiaomi files are fully null-byte bodies.
- Their file names were preserved as titles.
- Their full file names were preserved in `metadata_json.file_name`.
- Their original bytes were preserved in both `raw_base64` and `raw_blob`.
- `raw_bytes` and `OCTET_LENGTH(raw_blob)` match.
- `raw_sha256` and `SHA2(raw_blob, 256)` match.

Integrity checks:

```sql
SELECT COUNT(*) AS blob_size_mismatch
FROM knowledge_import_items
WHERE source = 'xiaomi-notes'
  AND raw_bytes <> OCTET_LENGTH(raw_blob);

SELECT COUNT(*) AS sha_mismatch
FROM knowledge_import_items
WHERE source = 'xiaomi-notes'
  AND raw_sha256 <> SHA2(raw_blob, 256);
```

Observed result:

- `blob_size_mismatch`: 0
- `sha_mismatch`: 0
