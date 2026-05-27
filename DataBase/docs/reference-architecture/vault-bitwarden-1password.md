# Vault, Bitwarden, And 1Password

## Repositories

- https://github.com/hashicorp/vault
- https://github.com/bitwarden/server
- https://github.com/1Password

## Referenced Concepts

- Explicit secret surfaces
- Credential ownership
- Access boundary documentation
- Operator intent clarity

## Referenced Areas In DataBase

- `docs/storage/secrets-surfaces.md`
- `DATA_CLASSIFICATION.md`
- `personal_secret_entries` documentation

## NOT Copied

- Secret manager runtime
- Encryption model
- Access control implementation
- Browser extension model

## Differences

DataBase records where credentials live and how they are used. It follows the operator's explicit storage semantics, including plaintext when requested, rather than imposing a secret-manager-only model.

