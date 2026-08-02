---
name: performance-analysis
description: >-
  Investigate latency, throughput, CPU, memory, or cost regressions. Use when something is slow and you need to find out why before optimizing.
targets: [cursor]
---

# Performance analysis

## When to use

- Latency, throughput, CPU, memory, or cost regressions; “why is this slow?” investigations.
- Before scaling out: confirm the bottleneck is not fixable locally.

## Steps

1. Define **SLOs**: which metric, which percentile, over which window, under which load profile.
2. Reproduce under **realistic** data size and concurrency; avoid toy datasets that hide issues.
3. Separate **client**, **network**, **app**, **database**, and **external services**—measure each layer.
4. Use **profilers** and tracing (CPU, heap, async waterfalls) appropriate to the stack.
5. Check **N+1** queries, missing indexes, lock contention, and serialization overhead first.
6. Apply **one change** at a time; re-measure; keep a baseline for comparison.
7. Cache only with **correctness** and **invalidation** strategy; avoid stale or thundering herds.
8. Document **before/after** numbers when shipping optimizations.
