---
name: debug-cors
description: Debug CORS errors between a frontend and backend. Follows the exact sequence that resolves CORS issues in NestJS + Next.js stacks. Use when seeing "blocked by CORS policy", missing Access-Control-Allow-Origin, or preflight failures.
targets: [claude, cursor, codex]
---

# Debug CORS

Systematic CORS debugging for NestJS + Next.js stacks. Work through these steps in order — each one catches a different failure class.

## Step 1 — Verify the actual error

Check what origin the browser is sending and what the API is responding with:
```bash
curl -v -X OPTIONS http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:3002" \
  -H "Access-Control-Request-Method: POST" 2>&1 | grep -i "access-control\|origin"
```

If `Access-Control-Allow-Origin` is missing from the response, the API is rejecting it.

## Step 2 — Check the .env value

```bash
grep CORS_ORIGINS .env
grep CORS_ORIGINS .env.example
```

Common mistake: the env var name is wrong (`CORS_ORIGINS` vs `CORS_ORIGIN` vs `ALLOWED_ORIGINS`).

## Step 3 — Check the validation/config class default (THE MOST COMMON CAUSE)

In NestJS projects with `@nestjs/config` + a validation class, the class often has a **hardcoded default** that overrides the env var:

```typescript
// config/app.config.ts or config/configuration.ts
@Transform(({ value }) => value?.split(',') ?? ['http://localhost:3001'])
corsOrigins!: string[];
```

This default wins even when `.env` has a different value. Fix: update the default to match your actual port.

## Step 4 — Check process.env loading order

In `dev.py` or startup scripts, env vars already in `os.environ` are NOT overwritten by `load_dotenv`. Fix: use `load_dotenv(override=True)` or manually inject:
```python
with open('.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            os.environ[k] = v
```

## Step 5 — Force restart the API

The NestJS watch compiler may not pick up env var changes. Kill and restart:
```bash
pkill -f "nest start" && npm run dev
```

## Step 6 — Verify CORS is applied globally in main.ts

```typescript
app.enableCors({
  origin: configService.get('corsOrigins'),  // must be an array or function
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
```

`origin: '*'` won't work with `credentials: true`. Must use explicit origins.

## Step 7 — Test after each fix

```bash
curl -v -X OPTIONS http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:3002" \
  -H "Access-Control-Request-Method: POST" 2>&1 | grep -i "access-control"
```

Expected: `Access-Control-Allow-Origin: http://localhost:3002`
