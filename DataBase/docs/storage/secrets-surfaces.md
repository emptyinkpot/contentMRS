# Secrets Surfaces

This document maps where credentials and sensitive operator data are stored.

## Known Surfaces

| Surface | Location | Role |
| --- | --- | --- |
| MyBlog server env | `/etc/myblog-admin-next.env` | Runtime database and API credentials |
| Local MySQL client config | `C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf` | Local operator MySQL access |
| Local DataBase service users | `C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env` | Read-only and content-write MySQL service users for DataBase services |
| DataBase Gateway local env | `C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env` | Local DataBase Gateway API key and URL |
| DataBase object-store pilot server env | `/srv/database-object-store/seaweedfs/rclone.conf` | Server-local rclone credentials for loopback-only SeaweedFS pilot |
| DataBase object-store pilot restic env | `/srv/database-object-store/backups/restic-seaweedfs-pilot.env` | Server-local restic repository path and password for SeaweedFS pilot backup drill |
| Experience Manager local loader | `E:\My Project\DataBase\services\experience-manager\scripts\load-env-and-healthcheck.ps1` | Loads approved local MySQL secret surfaces into `EXPERIENCE_DB_*` for health checks without printing values |
| MySQL plaintext table | `personal_secret_entries` | User-requested plaintext personal secret storage |
| Imported accounts | `imported_accounts` | Imported account records |
| Imported cookies | `imported_browser_cookies` | Browser cookie records |

## Policy

If the operator explicitly asks for plaintext storage, plaintext is the success criterion. Do not rewrite the task into encryption, hashing, redaction, placeholders, or secret-manager-only storage.

Do not print secret values in routine reports unless the operator explicitly asks for the values to be displayed in that surface.

## Experience Manager Mapping

`services/experience-manager/scripts/load-env-and-healthcheck.ps1` maps local approved surfaces into runtime variables:

| Runtime variable | Source surface |
| --- | --- |
| `EXPERIENCE_DB_HOST` | `myblog.cnf` key `host` |
| `EXPERIENCE_DB_PORT` | `myblog.cnf` key `port` |
| `EXPERIENCE_DB_NAME` | `myblog.cnf` key `database` |
| `EXPERIENCE_DB_USER` | `database_service_users.env` key `DATABASE_READONLY_USER` or `DATABASE_CONTENT_RW_USER` |
| `EXPERIENCE_DB_PASSWORD` | `database_service_users.env` key `DATABASE_READONLY_PASSWORD` or `DATABASE_CONTENT_RW_PASSWORD` |

Default mode is readonly. Content-write mode is only for controlled validation or explicit write tasks.
