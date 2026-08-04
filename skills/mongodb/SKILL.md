---
name: mongodb
description: >-
  Design documents, indexes, and aggregation pipelines in MongoDB. Use when modeling collections, writing aggregations, or fixing slow Mongo queries.
targets: [cursor]
---

# MongoDB

## When to use

- Designing documents, indexes, or aggregation pipelines in MongoDB.
- Tuning performance, consistency, or replication concerns.

## Steps

1. Model **access patterns** first: read/write ratio, hot queries, growth of documents and arrays.
2. Prefer **stable shard keys** and bounded arrays; avoid unbounded embedded arrays for high churn.
3. Create **indexes** that match filter + sort; use compound indexes with equality-before-range order.
4. Use **aggregation** for analytics; `$match` early to reduce working set; avoid huge `$lookup` without indexes.
5. Choose **write concern** and **read concern** for the business case; understand defaults.
6. For migrations, plan **background index builds** and dual-write/dual-read phases when needed.
7. Monitor **slow queries**, **collisions**, and **disk**; explain plans before micro-optimizing.
8. Validate **schema** at the app boundary (e.g. Mongoose/Zod) when flexibility invites bugs.
