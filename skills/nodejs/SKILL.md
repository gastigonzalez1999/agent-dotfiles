---
name: nodejs
description: >-
  Server-side JavaScript/TypeScript on Node — HTTP APIs, workers, CLIs, background jobs, async patterns. Use when building or debugging a Node service.
targets: [cursor]
---

# Node.js

## When to use

- Server-side JavaScript/TypeScript: HTTP APIs, workers, CLIs, or background jobs on Node.
- Debugging event loop, streams, or package/dependency issues.

## Steps

1. Pin **Node major** and engine fields in `package.json`; align with native addons and CI.
2. Structure **async** code: explicit `async/await`, avoid unhandled rejections; use `AbortSignal` for cancellation where supported.
3. Handle **errors** at boundaries: map HTTP status, log with correlation IDs, never leak stack internals to clients.
4. Use **env** for config; validate required vars at startup; separate dev/test/prod defaults explicitly.
5. For I/O, prefer **streams** for large payloads; set timeouts on outbound HTTP and DB clients.
6. Keep **dependencies** scoped; audit regularly; avoid unnecessary polyfills on modern Node.
7. Profile **CPU and memory** (e.g. clinic, heap snapshots) before optimizing hot paths.
8. Use **cluster** or horizontal scaling patterns for CPU-bound work; avoid blocking the event loop.
