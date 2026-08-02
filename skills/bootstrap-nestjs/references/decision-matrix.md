# Architecture Decision Matrix

Reference guide for Phase 2 technical decisions. Use this to provide informed recommendations based on Phase 1 context.

## Database Selection

| Criteria | PostgreSQL | MySQL | MongoDB | SQLite |
|----------|-----------|-------|---------|--------|
| Complex queries/joins | Best | Good | Poor | Good |
| Schema flexibility | Moderate | Low | Best | Low |
| JSON support | Excellent | Good | Native | Limited |
| Full-text search | Built-in | Built-in | Built-in | Extension |
| Horizontal scaling | With Citus | With Vitess | Native | No |
| Best for | Most APIs, financial, relational data | Legacy compat, simple CRUD | Document-heavy, flexible schema | Dev/testing, embedded |

**Default recommendation**: PostgreSQL (most versatile for API services)

## ORM Selection

| Criteria | TypeORM | Prisma | MikroORM | Mongoose |
|----------|---------|--------|----------|----------|
| TypeScript support | Good | Excellent | Excellent | Good |
| Migration tooling | Built-in | Built-in | Built-in | N/A |
| Query builder | Yes | Limited | Yes | N/A |
| Active Record pattern | Yes | No | Yes | Yes |
| Data Mapper pattern | Yes | Yes | Yes | No |
| Learning curve | Moderate | Low | Moderate | Low |
| NestJS integration | Official | Community | Official | Official |
| Best for | General purpose | Rapid development | DDD projects | MongoDB |

**Default recommendation**: TypeORM for PostgreSQL/MySQL, Mongoose for MongoDB

## Authentication Strategy

| Criteria | JWT + Passport | OAuth2 | API Keys | None (gateway) |
|----------|---------------|--------|----------|----------------|
| Stateless | Yes | Depends | Yes | N/A |
| Token refresh | Manual | Built-in | N/A | N/A |
| Third-party login | No | Yes | No | N/A |
| Service-to-service | Good | Complex | Best | N/A |
| User-facing | Best | Best | Poor | N/A |
| Complexity | Moderate | High | Low | None |

**Decision guide**:
- Frontend SPA consumers → JWT
- Third-party integrations → OAuth2 or API keys
- Internal microservices only → API keys or none (gateway handles auth)
- PII/financial data → JWT or OAuth2 (never API keys alone)

## Caching Strategy

| Criteria | Redis | In-memory | None |
|----------|-------|-----------|------|
| Multi-instance safe | Yes | No | N/A |
| Persistence | Optional | No | N/A |
| Pub/sub support | Yes | No | N/A |
| Session storage | Yes | Risk | N/A |
| Best for | Production, >100 rps | Single instance, dev | Low traffic, simple CRUD |

**Decision guide**:
- Expected load > 100 rps → Redis
- Multiple app instances → Redis (required for cache consistency)
- Single instance, low traffic → In-memory is fine
- Using Bull queues → Redis already required

## Message Queue Selection

| Criteria | None | Bull (Redis) | RabbitMQ | Kafka |
|----------|------|-------------|----------|-------|
| Background jobs | No | Best | Good | Overkill |
| Event streaming | No | Limited | Good | Best |
| Message ordering | N/A | FIFO | Configurable | Partition-ordered |
| Replay/rewind | N/A | No | No | Yes |
| Complexity | None | Low | Moderate | High |
| Best for | Simple CRUD APIs | Background tasks, emails, exports | Event-driven microservices | High-throughput event streaming |

**Decision guide**:
- Simple CRUD service → None
- Need background jobs (emails, reports, exports) → Bull
- Event-driven architecture with multiple consumers → RabbitMQ
- High-throughput event streaming, event sourcing → Kafka

## API Style

| Criteria | REST | GraphQL | Hybrid |
|----------|------|---------|--------|
| Simplicity | High | Moderate | Low |
| Caching | Easy (HTTP) | Complex | Mixed |
| Over/under-fetching | Common | Solved | Depends |
| File uploads | Native | Complex | Native |
| Real-time | SSE/WebSocket | Subscriptions | Both |
| Swagger/OpenAPI | Native | Separate (Apollo) | Partial |
| Best for | Most APIs, public APIs | Frontend-heavy, complex queries | Migration path |

**Default recommendation**: REST (simplest, best Swagger support, most widely understood)

## Dependency Matrix

These are required co-dependencies:

| If you choose... | You also need... |
|-------------------|-----------------|
| Bull queue | Redis |
| cache-manager-redis-store | Redis |
| Passport JWT | bcrypt (password hashing) |
| Prisma | `npx prisma init` + schema file |
| GraphQL | Separate schema or code-first resolvers |
| TypeORM | Synchronize=false in prod, migrations |
| Any DB | Health check indicator |
| Any auth | Guard + decorator pattern |
