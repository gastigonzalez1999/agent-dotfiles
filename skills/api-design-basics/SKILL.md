---
name: api-design-basics
description: >-
  Design or change HTTP/JSON APIs, webhooks, and client-server contracts — resource naming, error shapes, pagination, versioning, idempotency. Use when adding or changing an endpoint, or debating an API contract.
targets: [claude, cursor, codex]
---

# API design basics

## When to use

- Designing or changing HTTP/JSON (or similar) APIs, webhooks, or client-server contracts.
- Debating resource naming, errors, pagination, or versioning.

## Steps

1. Name resources with nouns and stable identifiers; use HTTP methods for actions, not extra verbs in paths unless RPC is intentional.
2. Return consistent error shapes: machine-readable code, human message, optional details; use correct status codes.
3. Version intentionally: URL prefix (`/v1`), header, or package version—pick one strategy per surface and document it.
4. Paginate list endpoints with a clear cursor or offset/limit contract; cap page size.
5. Make idempotency explicit for mutating operations that retries may hit (keys, headers).
6. Document request/response schemas where the team expects contracts (OpenAPI, types, or README).
7. Consider backward compatibility: additive fields preferred; breaking renames need migration notes.
8. For auth, be explicit about scopes, audience, and what anonymous callers may do.
