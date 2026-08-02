---
name: manual-qa
description: >-
  Simulate a manual QA session against a running stack. Discovers every API endpoint from the
  OpenAPI spec, exercises each one (happy path, auth guard, edge cases), validates response
  shapes, and does light UI QA via browser-use. Use when asked to "simulate manual QA",
  "test every endpoint", "QA the API", or to produce a manual test guide for the team.
targets: [claude, cursor, codex]
---

# Manual QA

Act as a manual QA tester: discover the API surface, hit every route, assert the
responses, probe edge cases, check the frontends render, and report findings.

Nothing here hardcodes a route list. A hardcoded list goes stale the day someone
adds an endpoint, and then QA silently stops covering it. Everything is
discovered from the repo and from the running service.

---

## Step 1 — Find the services

Read `.agent/loop.json`. Its `services[]` entries already declare what runs and
where:

```jsonc
"services": [
  { "name": "api", "port": 3000, "health": "http://localhost:3000/health" },
  { "name": "web", "port": 3002 }
]
```

If there is no `.agent/loop.json`, run the `loop-init` skill first — the contract
is worth having anyway. Failing that, infer ports from `docker-compose.yml`,
`.env`, or the framework defaults, and say which you assumed.

Probe each service before doing anything else:

```bash
node ~/.claude/loop/loop.mjs doctor
```

`doctor` already checks the declared services and ports. If the API is down,
stop and tell the user how this repo starts (`dev.py`, `docker compose up`,
`pnpm dev` — whatever the README or `loop.json` says). Frontends being down is
non-blocking: note it and continue.

---

## Step 2 — Discover the API surface

Fetch the OpenAPI document. Try, in order, the framework conventions:

```bash
curl -s http://localhost:<port>/docs-json     # NestJS + @nestjs/swagger default
curl -s http://localhost:<port>/openapi.json  # FastAPI, many others
curl -s http://localhost:<port>/swagger/v1/swagger.json
```

Parse `paths`. For each `{method, path}` record:

- the **path parameters** it needs,
- the **request body** schema (for a valid happy-path payload),
- whether it is **auth-protected** — the `security` field on the operation, or
  the document-level `security` default.

This step is what makes the skill self-updating: new endpoints appear in the
spec, so QA expands automatically.

If there is no spec, fall back to enumerating route decorators/handlers in the
source, and say in the report that coverage came from source, not a live spec.

---

## Step 3 — Auth fixtures

Most routes need a real token. Look for a test credential in `.env`
(`*_TEST_TOKEN`, `TEST_USER_*`) or a documented seed/login helper.

**Never fabricate a token.** If none exists, mark every authenticated check
`needs-token` in the report rather than guessing — a fake token turns the auth
suite into a suite that only proves 401 works.

Where the app can mint one (a seeded user plus a login endpoint), do that and say
so.

---

## Step 4 — Auth guard sweep

Every operation the spec marks as protected must reject an anonymous caller.
Build this list from the spec, not by hand:

```bash
# For each protected {method, path}, substitute a syntactically valid dummy for
# each path param and assert 401/403.
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$BASE/$PATH")
```

Expect 401 (or 403 where the route exists but the role is wrong). A protected
route answering 200 anonymously is the single highest-severity finding this
skill can produce — lead the report with it.

Also check a malformed token is rejected: `Authorization: Bearer not-a-token`.

---

## Step 5 — Happy paths

For each endpoint, build the smallest valid request from the spec's schema and
assert:

- the status code the spec documents,
- the response **shape** matches the declared schema — required fields present,
  correct types,
- no internal fields leaked that the schema does not declare (timestamps, soft
  delete flags, password hashes, tenant ids, internal ids),
- list endpoints respect their documented ordering and pagination contract.

If the repo has a shared types package, validate against that too — a response
that satisfies the spec but not the type the frontend compiles against is still
a bug.

Prefer read-only routes first. Order mutating calls so each one's output feeds
the next (create → read → update → delete), and clean up what you create.

---

## Step 6 — Edge cases

Generic probes that apply to any HTTP API:

```bash
curl -s -o /dev/null -w "%{http_code}" "$BASE/definitely-not-a-route"   # 404
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/<a-GET-route>"    # 404/405
curl -s -o /dev/null -w "%{http_code}" "$BASE/docs"                     # 200
curl -s -X POST "$BASE/<a-POST-route>" -H 'Content-Type: application/json' -d '{}'  # 400
```

Then, from the schema, for each endpoint with validated input: omit a required
field, send the wrong type, send an out-of-range number, send an empty array
where a non-empty one is required. Each must be a 4xx with a useful message, not
a 500.

Money, if the domain has any, deserves its own pass: assert amounts are the
integer type the codebase declares, never a float.

---

## Step 7 — Frontend UI QA

Invoke the `browser-use` skill. Discover routes rather than listing them:

- **Next.js app router** — glob `app/**/page.tsx`, map to URL paths.
- **Next.js pages router** — glob `pages/**/*.tsx`.
- **React Router / Vue Router** — parse the route config module.

For each screen check: it renders, no blank white page, no red console errors,
no unhandled promise rejection. Note anything that needs auth and was skipped.

If `browser-use` is unavailable, mark all UI checks `not run`.

---

## Step 8 — Report

A table of every check with ✓ / ✗ / skipped, then a short summary:

- **All green** — "QA passed, no issues found."
- **Failures** — one line each, most severe first. Then: "To file these as
  GitHub issues, run `/qa`."
- **Skipped** — say why (no token, no browser, service down). A skipped check is
  not a passing check and must never be reported as one.

### Producing a guide for the team

When asked for a manual test guide rather than a run, emit the same coverage as
numbered human steps: preconditions, what to click or send, and what to expect.
Write it in the language the team uses, and save it to the repo (`docs/qa/`) so
it can be reviewed and kept current.

---

## Safety

- GETs and auth-guard probes are read-only and safe anytime.
- Anything that creates, mutates, or deletes runs against local or seeded data
  only — **never** production. Confirm which environment the base URL points at
  before the first mutating call.
- Flag any check that permanently changes a test fixture's state (role changes,
  one-shot applications) and run it at most once per fixture.
