---
name: deploy-ops
description: >-
  Deploy and operate a service on Railway, Vercel and Supabase — env-var parity across local and
  every platform, auto-deploy wiring, running migrations on deploy, region and latency checks, and
  responding to a leaked credential. Use when setting up hosting, when a deploy fails or does not
  trigger, when prod behaves differently from local, or when a secret leaks.
targets: [claude, cursor, codex]
---

# Deploy ops

API on Railway, frontend on Vercel, Postgres on Supabase. Most incidents here
are one of three things: a variable that exists in one place and not another, a
migration that did not run, or a deploy that never triggered.

---

## 1. Environment variable parity

The single most common cause of "works locally, broken in prod".

There are four places a variable can live, and they drift independently:

| Where | Read by | Set with |
|---|---|---|
| `.env` (local) | local dev | file, gitignored |
| Railway service vars | the API in prod | `railway variables` |
| Vercel project env | the frontend build **and** runtime | `vercel env` |
| GitHub Actions secrets | CI | `gh secret set` |

Audit all four against `.env.example` before blaming code:

```bash
railway variables                       # after: railway link
vercel env ls
gh secret list
grep -v '^#' .env.example | grep -oP '^[A-Z_]+' | sort
```

Anything in `.env.example` missing from a platform is the bug. Anything present
in a platform but absent from `.env.example` is undocumented — add it.

Traps worth knowing:

- **Vercel needs `NEXT_PUBLIC_` for anything the browser reads.** Without the
  prefix the value is `undefined` in the bundle, silently.
- **Vercel env vars are per-environment** (production / preview / development).
  Setting one for production does not set it for preview, so preview deploys
  fail in ways production does not.
- **A Vercel build bakes in build-time vars.** Changing one requires a
  redeploy, not just a restart.
- **Railway injects `PORT`.** The server must bind `process.env.PORT`, not a
  hardcoded 3000.
- **`DATABASE_URL` differs by connection mode** — see §3.
- Frontend and backend need to agree on the API URL *and* the API needs the
  frontend's origin in its CORS allowlist. Both sides, every environment. If
  CORS breaks, use the `debug-cors` skill; the config-class default trap there
  catches people repeatedly.

## 2. Auto-deploy wiring

"Auto deploy unavailable" on Railway almost always means the GitHub App is not
connected for that repo, not that the feature is off.

```bash
railway link                    # pick project + service
railway up                      # manual deploy, proves the build works
```

Then connect the repo in the Railway dashboard (Settings → Source). A manual
`railway up` succeeding while auto-deploy does nothing confirms it is the
connection, not the build.

Vercel:

```bash
vercel link
vercel git connect              # wires the repo for push-to-deploy
vercel --prod                   # manual production deploy
```

Check which branch each platform deploys from. A service still pointed at a
renamed default branch never triggers again and reports no error.

## 3. Supabase Postgres

Two connection modes, and picking the wrong one breaks things subtly:

- **Session pooler / direct (port 5432)** — required for migrations, and for
  anything using prepared statements.
- **Transaction pooler (port 6543)** — for serverless and short-lived
  connections. **Prepared statements do not work here**, which is how a Prisma
  or TypeORM migration fails with a confusing error.

Use the direct URL for `migrate`/`DIRECT_URL` and the pooled URL for the
application's runtime connection. Most ORMs support both; set both.

The connection string from the dashboard contains `[YOUR-PASSWORD]` as a
literal placeholder. Replace it. The database password is not the account
password and is found under Settings → Database.

## 4. Migrations on deploy

The gap that bites: the code deploys, the schema does not, and the app serves
500s against a table that does not exist.

Run migrations as part of the release, not by hand:

- **Railway** — a start command or entrypoint that runs migrations then boots:
  `npm run migration:run && node dist/main.js`. Idempotent, so a restart is
  safe.
- Never rely on `synchronize: true` / `db push` against a real database.
- A migration that drops or renames a column needs a **two-step deploy**
  (add-and-backfill, then remove) or it breaks the running instance mid-rollout.

Verify after deploying, do not assume:

```bash
railway run npm run migration:show
```

## 5. Region and latency

Cross-region hops are the usual cause of "the site feels slow" when the code is
fine. Every hop between the API, the database and the user costs a round trip,
and an ORM doing N queries pays it N times.

Put the API and the database in the **same region**. Check where each actually
is — Supabase projects default to a region chosen at creation and **cannot be
moved**; migrating means a new project and a data transfer. Confirm before
concluding that the code is slow.

Measure before optimizing:

```bash
curl -s -o /dev/null -w 'dns %{time_namelookup}  connect %{time_connect}  ttfb %{time_starttransfer}  total %{time_total}\n' https://<api>/health
```

High TTFB with low connect time is server-side. Both high is network or region.

## 6. A leaked credential

When GitGuardian (or any scanner) flags a secret, the order matters:

1. **Rotate first.** The secret is compromised the moment it is pushed, whether
   or not the commit is reachable. Generate a new one at the provider.
2. **Update every consumer** — `.env`, Railway, Vercel (all environments),
   GitHub secrets. Use the §1 audit so none is missed.
3. **Then** clean the repo: remove the value, confirm the file is gitignored,
   add it to `.env.example` as an empty key.
4. Deleting the commit is optional and usually not worth a history rewrite on a
   shared branch. Rotation is what actually closes the hole.

To find what was flagged when the scanner will not say:

```bash
git log -p --all -S '<fragment of the secret>' | head -50
gh api /repos/{owner}/{repo}/secret-scanning/alerts 2>/dev/null
```

**Never paste a live credential into a chat, an issue, or a commit message.**
If one is already in the conversation, treat it as leaked and rotate it.

## 7. When a deploy fails

1. Read the build log from the platform, not the dashboard's summary.
2. Does it build locally from a clean checkout? `rm -rf node_modules dist && npm ci && npm run build`.
3. Compare Node versions — platform default vs `engines` vs local.
4. Are the build-time env vars present? A Next.js build fails on a missing
   `NEXT_PUBLIC_` var only at build time.
5. Monorepo: is the root directory and build command set correctly for the app
   being deployed?

## Rules

- Never point a local dev environment at a production database.
- Never run an untested migration against production. Run it on staging first,
  and have the down migration ready.
- Confirm with the user before a first production deploy, a destructive
  migration, or rotating a credential others depend on.
