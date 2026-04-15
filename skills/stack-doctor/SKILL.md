---
name: stack-doctor
description: Diagnose why the dev stack isn't working. Checks Docker, ports, env vars, CORS config, database connection, and API/frontend health in one shot. Use when "nothing is working" or the app won't start.
---

# Stack Doctor

Full diagnostic of a broken dev stack. Checks everything and tells you exactly what to fix.

## Run all diagnostics in parallel

### Docker
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
docker compose logs --tail=20 2>&1
```

### Ports
```bash
lsof -i :3000 -i :3002 -i :5432 -i :5433 -i :6379 2>/dev/null | grep LISTEN
```

### Env vars
```bash
cat .env 2>/dev/null || echo "no .env found"
```

### Database connectivity
```bash
npx prisma db execute --stdin <<< "SELECT 1" 2>&1 || echo "DB not reachable"
```

### TypeScript errors
```bash
npx tsc --noEmit 2>&1 | head -30
```

### API process
```bash
ps aux | grep -E "nest|node" | grep -v grep
curl -s http://localhost:3000/api/v1 2>/dev/null | head -c 200
```

### Frontend process
```bash
ps aux | grep -E "next" | grep -v grep
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null
```

### CORS check
```bash
curl -sv -X OPTIONS http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:3002" \
  -H "Access-Control-Request-Method: POST" 2>&1 | grep -i "access-control\|< HTTP"
```

## Diagnosis decision tree

1. **Docker containers not running** → `docker compose up -d`
2. **Port 5432 conflict** → local Postgres is blocking. Change Docker to 5433, update `DATABASE_URL`
3. **DB not reachable** → check `DATABASE_URL` port matches Docker postgres port
4. **API not responding** → check for TypeScript errors, check process is running
5. **CORS blocked** → run `/debug-cors` skill
6. **Frontend not reachable** → check Next.js process, check port 3002

## Output format

Summarize findings as a prioritized fix list:
1. (Critical) PostgreSQL container not running → `docker compose up -d postgres`
2. (Critical) CORS rejecting localhost:3002 → update corsOrigins default in config class
3. (Warning) 3 TypeScript errors → run `/fix-ts-errors`
