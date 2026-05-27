# MySQL Current State

## Connection Surface

- Provider: Tencent Cloud CynosDB MySQL
- Version observed: `8.0.30-cynos-3.1.16.003`
- Host: `124.220.245.121`
- Port: `22295`
- Database: `cloudbase-4glvyyq9f61b19cd`
- User: `openclaw`

Credential locations:

- Server runtime env: `/etc/myblog-admin-next.env`
- Local operator config: `C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf`
- Local command: `mysql-myblog`

## Observed Inventory

Last checked: 2026-05-10

- Tables: 50
- Total rows: 10346

Major data families:

- Novel production: `works`, `chapters`, `chapter_outlines`, `volume_outlines`
- Writing knowledge: `characters`, `world_settings`, `story_events`, `literature`, `notes`
- Vocabulary: `vocabulary`, `banned_words`
- Creative writing style contracts: `creative_style_protocols`, `creative_style_modules`, `creative_editing_steps`, `creative_quality_rules`, `creative_source_materials`
- Fanqie sync: `fanqie_works`, `fanqie_remote_chapter_snapshots`, `fanqie_remote_chapter_detail_snapshots`
- Runtime logs: `state_transition_logs`, `daily_plan_operation_logs`, `database_api_audit_logs`
- Reader memory: `reader_memory`, `reader_highlights`
- Visual curation: `visual_sources`, `visual_pins`, `visual_sync_runs`
- Credentials and imported accounts: `personal_secret_entries`, `imported_accounts`, `imported_browser_cookies`

## Inspection Commands

```powershell
mysql-myblog -e "SHOW TABLES;"
mysql-myblog -e "SELECT COUNT(*) FROM chapters;"
mysql-myblog -e "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();"
mysql-myblog -e "DESCRIBE vocabulary;"
mysql-myblog -e "SELECT id, name, domain FROM creative_style_protocols;"
```

## Rule

MySQL is the structured data truth. Application repos may contain migrations, schema docs, and typed access code, but they do not own the live records.

