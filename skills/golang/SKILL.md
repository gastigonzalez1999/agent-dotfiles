---
name: golang
description: >-
  Write or review Go services, CLIs, and libraries — modules, interfaces, concurrency, error handling, performance. Use when working in a Go codebase.
targets: [cursor]
---

# Go

## When to use

- Writing or reviewing Go services, CLIs, or libraries: modules, concurrency, and performance.
- Debugging `go test`, race detector, or build/tag issues.

## Steps

1. Keep **modules** tidy: `go mod tidy`; pin versions intentionally; avoid replace hacks in shared libs.
2. Use **interfaces** at boundaries; accept small interfaces; avoid interface pollution.
3. Handle **errors** explicitly; wrap with `%w` for context; map errors to stable domain types at edges.
4. Use **goroutines** with clear ownership; prefer channels or errgroup for bounded work; always cancel via `context`.
5. Run **`go test -race`** for concurrent code; fix data races before optimizing.
6. Prefer **explicit dependencies** in constructors; avoid global mutable state.
7. Use **fmt**, **log/slog**, or structured logging consistently; avoid logging secrets.
8. Profile with **pprof** under realistic load; optimize allocation hot paths only when measured.
