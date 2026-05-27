# DataBase Semantic Contracts

Runtime-validatable semantic graph contracts owned by DataBase.

This package defines the public shapes for semantic units, semantic tags,
semantic relations, and retrieval-oriented semantic API responses. Gateway
routes validate against these schemas before returning data, and OpenAPI/SDK
generation consumes the same schemas.

`StylePack` also exposes `revisionPairs`. These records are DataBase-owned
style/syntax learning evidence written by `/writes/record-style-revision-pair`.
They carry bad reason, rewrite actions, forbidden moves, target shape, original
generated text, and optional revised text. They are prompt/eval material, not
automatic text replacement rules and not a reusable copyrighted sentence store.
