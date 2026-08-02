---
name: mercadopago
description: >-
  Work with MercadoPago payments — marketplace split via OAuth-connected sellers, sandbox setup
  (tunnel, test users, env), webhook signature verification, and debugging why a payment is not
  confirming. Use when touching checkout, webhooks, refunds, split payouts, or seller onboarding,
  or when asked to test payments or debug a MercadoPago webhook.
targets: [claude, cursor, codex]
---

# MercadoPago

Platform mechanics and the sandbox procedure. Where this says "your repo", find
the equivalent by searching for `mercadopago`, `MP_`, or `marketplace_fee` — the
module layout differs per project, the platform behavior below does not.

---

## 1. The marketplace split model

MercadoPago has **no working API to disburse from a central account** in most
LatAm countries (the disbursement API is deprecated). So "collect everything
centrally, pay sellers later" means manual bank transfers forever. Don't design
for it.

The model that works: each seller connects **their own** MercadoPago account via
OAuth. The checkout is created **on the seller's account** using their access
token, with `marketplace_fee` set to the platform's cut. MercadoPago settles to
the seller directly and routes the fee to the platform. The platform never holds
the gross.

Consequences that surprise people:

- **A payment can only be read by whoever collected it.** Querying
  `/v1/payments/<id>` with the platform's token returns 404 when the seller
  collected it. Use the seller's stored token.
- **Connecting an account is a prerequisite for a seller going live.** Approve
  workflows must check it.
- **Refunds reverse proportionally.** A refund of a split payment takes back
  both the seller's share and the fee in the same ratio. To keep a penalty, refund
  `total − penalty` rather than refunding fully and re-charging.
- **Payer and collector must differ.** MercadoPago rejects a marketplace payment
  where they are the same account — this bites in sandbox constantly.

---

## 2. Credentials

`client_id` / `client_secret` are **app-level**: the same pair works for test and
production. There is no separate "sandbox secret". What makes a run a sandbox run
is the **test access token** and **test users**.

Always verify a token before trusting it:

```bash
curl -s https://api.mercadopago.com/users/me -H "Authorization: Bearer $MP_ACCESS_TOKEN"
```

Check the `site_id` matches the target country (`MLU` Uruguay, `MLA` Argentina,
`MLB` Brazil, `MLM` Mexico, `MLC` Chile, `MCO` Colombia) **and that the email
ends in `@testuser.com`**.

> If the email is not `@testuser.com`, that is a production token. Stop.

Nothing else in this file is safe to run against a production token.

---

## 3. Tunnel

MercadoPago must reach the API from the internet for OAuth callbacks and
webhooks.

`ngrok` requires an account; **cloudflared quick tunnels do not** — prefer it:

```bash
cloudflared tunnel --url http://localhost:3000
```

On Windows the winget MSI needs UAC elevation, which an agent cannot accept.
Download the standalone binary instead — no admin rights required:

```
https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
```

**The hostname changes on every restart.** Each restart costs a manual
re-registration of *both* the redirect URI and the webhook URL in MercadoPago's
dashboard, or OAuth fails silently. For anything beyond a single session use a
**named** Cloudflare tunnel (needs an account and a domain) or a deployed
preview environment — register once, never again.

---

## 4. Environment

```
MP_CLIENT_ID=              # the application number
MP_CLIENT_SECRET=          # also the HMAC key for signing the OAuth state
MP_ACCESS_TOKEN=           # TEST token, never production
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=         # from app -> Webhooks, generated after saving the URL
MP_TOKEN_ENC_KEY=          # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MP_OAUTH_REDIRECT_URI=https://<tunnel>/<connect-callback-path>
API_PUBLIC_URL=https://<tunnel>
```

Register these on the application **character for character, no trailing
slash** — a trailing slash is a silent OAuth failure:

- Redirect URI → `https://<tunnel>/<connect-callback-path>`
- Webhook URL → `https://<tunnel>/<webhook-path>`, subscribing to payment events

Seller access tokens are credentials: store them encrypted
(`MP_TOKEN_ENC_KEY`), never in plaintext columns or logs.

---

## 5. Test users

```bash
curl -X POST https://api.mercadopago.com/users/test_user \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" -d '{"site_id":"MLU"}'
```

Run it **twice**: one test user is the seller/collector, the other is the
buyer/payer. They cannot be the same account (see §1).

Save both credentials — the endpoint does not let you list them again with their
passwords.

---

## 6. Verify the setup without a browser

Do all of this before asking a human to click anything:

```bash
# 1. Config actually loaded — check the API boot log for "not configured" warnings.

# 2. The tunnel reaches the API.
curl -s https://<tunnel>/health

# 3. Webhook armed:
#      401 = secret loaded, signature correctly rejected  <- what you want
#      503 = no secret loaded
curl -s -o /dev/null -w "%{http_code}" -X POST \
  "https://<tunnel>/<webhook-path>?data.id=123&type=payment" \
  -H 'Content-Type: application/json' -d '{}'

# 4. OAuth callback rejects a forged state (no record should be written).
curl -s -o /dev/null -w "%{http_code}" \
  "https://<tunnel>/<connect-callback-path>?code=fake&state=forged.123.abc"
```

The **401-vs-503 distinction on step 3 is the fastest signal** that the webhook
secret took. Don't move on until it is 401.

---

## 7. What an agent cannot do

**Only one step genuinely requires a human: the MercadoPago authorise screen.**
Entering a password into a financial provider's form is off limits, sandbox or
not. Ask the user to complete that one step and hand back the resulting redirect.

Almost everything else is automatable. If the app's own auth blocks you (phone
OTP, email verification), look for or write a script that mints a token through
the auth provider's Admin SDK — no SMS, no browser. That single script is usually
the difference between "an agent can drive the whole payment flow" and "a human
has to click through every run".

---

## 8. Debugging a payment that will not confirm

Work down this list in order; each step eliminates a whole class of cause.

1. **Did the webhook arrive at all?** Check the API access log for the webhook
   path. Nothing there means the tunnel hostname is stale or the URL registered
   in the dashboard is wrong.
2. **Was it rejected as unsigned?** A 401 in the log means the signature check
   ran and failed — usually `MP_WEBHOOK_SECRET` differs from the dashboard, or
   the raw body was parsed/re-serialized before verification. Signature
   verification must run against the **raw** request body.
3. **Was it read with the wrong token?** A 404 from `/v1/payments/<id>` means
   the platform token was used for a seller-collected payment (§1). Use the
   seller's token.
4. **Is the payment actually approved?** `status: "approved"` with
   `status_detail: "accredited"`. `in_process` means MercadoPago is still
   deciding — not an error.
5. **Is it a test/live mismatch?** Check `live_mode` on the payment. A test
   payment against a production-configured app (or the reverse) silently
   misbehaves. Assert `live_mode` matches the environment; most codebases forget
   this and it is worth adding.

Sandbox card outcomes are controlled by the cardholder **name**, not the number:
`APRO` approves, `OTHE` is a generic decline, `CONT` stays pending. Use them to
exercise each branch.

---

## 9. Before changing payment code

- Money stays in the integer type the codebase declares. Never a float.
- The webhook handler must be **idempotent** — MercadoPago retries, and will
  deliver the same event more than once.
- Never trust an amount from the client. Recompute server-side and compare.
- Never log a full access token, card token, or webhook secret.
- Test the failure branches, not just approval: decline, pending, refund,
  partial refund, and a duplicate webhook.
