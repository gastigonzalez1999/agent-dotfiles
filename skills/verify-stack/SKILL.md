---
name: verify-stack
description: "DEPRECATED — use `loop doctor` instead. Hardcodes ports 3000/3002/5433/6379 and lsof, which is wrong for other projects and broken on Windows."
---

> **Deprecated.** Superseded by `loop doctor`, which reads services and ports
> from `.agent/loop.json` and probes them with a plain TCP connect that works on
> Windows too. Kept only for reference; safe to delete.

# Verify Stack

Run a full health check of the development stack. Report what's up, what's down, and what to fix.

## Checks to run (in parallel)

### 1. Docker services
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
Expected: `postgres` and `redis` containers showing `healthy` or `Up`.

### 2. Port status
```bash
lsof -i :3000 -i :3002 -i :5432 -i :5433 -i :6379 2>/dev/null | grep LISTEN
```
- 3000 → NestJS API
- 3002 → Next.js frontend  
- 5432/5433 → PostgreSQL (conflict if both occupied)
- 6379 → Redis

### 3. Env vars loaded
```bash
grep -E "DATABASE_URL|CORS_ORIGINS|JWT_SECRET|REDIS_URL" .env 2>/dev/null
```
Check that values aren't empty and DATABASE_URL port matches Docker postgres port.

### 4. API health
```bash
curl -s http://localhost:3000/api/v1/health 2>/dev/null || curl -s http://localhost:3000/api/v1 2>/dev/null | head -c 200
```

### 5. Frontend reachable
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null
```
Expected: 200

### 6. Swagger docs
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/docs 2>/dev/null
```

## Report format

Summarize as a table:
| Service | Status | Action needed |
|---|---|---|
| Postgres (Docker) | ✓ Up | — |
| Redis (Docker) | ✗ Down | `docker compose up -d redis` |
| API :3000 | ✓ Responding | — |
| Frontend :3002 | ✗ Not reachable | Start with `npm run dev` in apps/web |

## Common fixes

- **Docker not running**: `docker compose up -d`
- **Port 5432 conflict**: local Postgres vs Docker. Change Docker to 5433 and update DATABASE_URL.
- **API not responding**: check for compile errors `tsc --noEmit`, then restart
- **Env not loaded**: check `dev.py` is using `override=True` on `load_dotenv`
