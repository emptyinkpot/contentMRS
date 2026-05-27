# Flyway And Liquibase

## Repositories

- https://github.com/flyway/flyway
- https://github.com/liquibase/liquibase

## Referenced Concepts

- Versioned database migrations
- Schema history
- Repeatable migration discipline
- Database change review

## Referenced Areas In DataBase

- future `schemas/mysql/`
- future migration inventory
- schema-as-contract documentation

## NOT Copied

- Migration engine
- Checksum machinery
- Java runtime
- CLI behavior

## Differences

DataBase currently records live schema inventory and operating contracts. It can later add migration files or references to app-owned migrations without becoming the migration runner.

