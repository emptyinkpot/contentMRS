# Security Policy

DataBase records topology, contracts, inventories and credential surfaces. It must not become a secret dump.

## Do Not Commit

- MySQL dumps
- OpenList or Quark bulk files
- Browser cookies
- Private keys
- Provider API keys
- Sub2API client keys
- OAuth access, refresh or id tokens
- Screenshots or logs containing live credentials

## Allowed

- Secret surface names and paths
- Non-secret hostnames, ports and service roles
- Sanitized inventories
- Schema and contract descriptions
- Recovery procedures that use placeholders

## Exception Rule

If the operator explicitly requests plaintext secret storage in a named surface, follow that named surface exactly. Do not silently move the secret into this repository.

## Incident Response

If a secret is committed:

1. Rotate or revoke it at the owning system.
2. Remove it from Git history only under an explicit cleanup task.
3. Update `docs/storage/secrets-surfaces.md` if the storage surface changed.
4. Check consumers that may have copied the value.
