# Gateway Client Adapters Product Guide

This layer is treated as a product surface, not a throwaway helper.

## Design Goals

- one adapter contract per consumer
- one shared client core
- one base adapter for option wiring
- no duplicate HTTP plumbing
- stable method names across repos

## Naming

- `DataBaseGatewayAdapter` for shared base behavior
- `MortisDataBaseAdapter` for Mortis-specific calls
- `MyBlogDataBaseAdapter` for MyBlog-specific calls

## Extending The Layer

When a consumer needs a new capability:

1. add the method to `DataBaseGatewayClient`
2. add a typed wrapper to the relevant adapter
3. document the method in `USAGE.md`
4. keep the method name stable if other consumers may reuse it

## What To Copy From Mature Projects

Prefer copying structure, not implementation details:

- stable adapter boundaries from SDKs
- explicit options objects
- error/request id propagation
- method-level responsibility names

Do not copy:

- consumer-specific UI assumptions
- hard-coded runtime paths
- unrelated framework dependencies

## Acceptance Bar

A consumer adapter is acceptable when:

- it hides the Gateway base URL and auth handling from the consumer UI
- it exposes predictable methods
- it can be tested with a mock `fetchImpl`
- it can be reused by another consumer with minimal rename work
