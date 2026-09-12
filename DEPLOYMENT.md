# Deployment Guide

Production deployment reference for Smart Store: a single Next.js 16 App
Router application (frontend + API routes in one service — there is no
separate backend service) backed by MongoDB via Mongoose. Deployed on
Railway.

Run `npm run verify-env` (locally, with the target environment's variables
present, or via `railway run npm run verify-env` against a live Railway
service) before or after any deploy to check this list mechanically rather
than by eye.

## Environment variables

### Required for application startup

Nothing crashes the process itself if these are missing — the app boots and
serves pages either way — but without all three, no page can authenticate a
user and no data can be read or written. Treat these as non-negotiable for
any real deployment.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (`mongodb+srv://...`). Without it, `connectDB()` logs a warning and every database-backed route returns empty/null results rather than crashing — but the app is non-functional. |
| `NEXTAUTH_URL` | The deployed web origin (e.g. `https://your-app.up.railway.app` or a custom domain). Must match the real production URL or auth callbacks/cookies misbehave. |
| `NEXTAUTH_SECRET` | Signs and verifies session JWTs. Generate with `openssl rand -base64 32` (minimum 32 characters). Never reuse a development value in production. |

### Required for authentication

Covered above (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`) — listed separately here
because they're specifically what NextAuth (Credentials provider, JWT
sessions) needs, as distinct from the database connection.

| Variable | Purpose |
|---|---|
| `NEXTAUTH_URL` | See above. |
| `NEXTAUTH_SECRET` | See above. |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed for CORS (e.g. `https://your-domain.com`). Optional — the app has a default — but should be set explicitly in production rather than left on its development default. |

### Required for 2FA

Optional in the sense that the app runs fine without it — 2FA simply
isn't offered to users. If the client wants two-factor authentication
available at all, this is mandatory, not optional.

| Variable | Purpose |
|---|---|
| `MFA_ENCRYPTION_KEY` | Base64-encoded 32-byte (256-bit) key. TOTP secrets are encrypted at rest (AES-256-GCM) with this key before being stored — there is no plaintext fallback and no insecure default; if this is unset or the wrong length, 2FA setup/verification fails immediately with a clear configuration error (`MFA is not configured on this server: MFA_ENCRYPTION_KEY is not set.`), returned to the caller even in production — it does not silently disable 2FA or expose secrets. Generate with:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

**Do not commit an actual key value anywhere — including into this file or
`.env.example`.** Generate it directly in Railway's environment variable
editor, or generate it once locally and paste only the value (never the
generation command's output) into Railway.

### Required for database

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | See above. Must point at the production MongoDB Atlas cluster, not a local or shared development database. |

**Must be a replica set.** Purchase Order receiving (`POST
/api/purchase-orders/[id]/goods-receipts` and the over-delivery
approve/reject routes) uses real MongoDB multi-document transactions
(`mongoose.startSession()`/`session.withTransaction()`) to keep inventory
counts correct under concurrent receiving requests — the first and only
feature in this codebase that requires transaction support. Any standard
`mongodb+srv://` Atlas connection string already satisfies this (Atlas
clusters are always replica sets); this only matters if `MONGODB_URI` is
ever pointed at a standalone (non-replica-set) MongoDB instance, in which
case those three routes would fail while the rest of the app continues to
work normally.

### Required for Redis

**None — Redis is not required for this application to function.** A
`redis` client wrapper (`src/lib/redis.ts`) and a cache helper
(`src/lib/cache.ts`) exist in the dependency tree and read an optional
`REDIS_URL`, but neither is imported by any route, page, or server action
anywhere in the app today (confirmed by grep — zero real callers). Do not
provision a Redis instance on Railway on the assumption that this app needs
one; it does not, as currently built. If Redis-backed caching is wanted in
the future, `REDIS_URL` (defaulting to `redis://localhost:6379` if unset)
is already wired to accept it — but wiring an actual caller is separate,
not-yet-done work.

### Optional integrations

The app runs correctly with all of these unset — each integration degrades
to a documented, non-fake fallback rather than crashing or silently
pretending to succeed.

| Variable | Purpose | Behavior when unset |
|---|---|---|
| `NVIDIA_API_KEY` | AI features (Business Insights, AI Predictions) — uses NVIDIA's OpenAI-compatible API, **not** OpenAI or Google directly, despite the `openai` npm package being used as the HTTP client. | AI actions return a clear "AI features are not configured" error; the rest of the app is unaffected. |
| `NVIDIA_BASE_URL` | Overrides the NVIDIA API base URL. | Defaults to `https://integrate.api.nvidia.com/v1`. |
| `NVIDIA_AI_MODEL` | Overrides the model name. | Defaults to `deepseek-ai/deepseek-v4-pro`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Product image uploads. | Upload requests fail with a clear error; the rest of the app is unaffected. |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | Reserved for Paystack payment processing. **No live Paystack API call exists anywhere in this codebase today** — these fields are read/written in Settings but nothing currently calls out to Paystack with them. Treat real payment processing as not-yet-built, not merely unconfigured. | No effect either way today. |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business API for customer messages (order confirmations, etc). **Both** must be set for real sending. | Runs in demo mode: messages are recorded in the database and logged as if sent, but never actually delivered. Not a bug — a deliberate, clearly-logged fallback (`🎭 WhatsApp API not configured. Using demo mode.`). |

## Recommended deployment sequence

1. **Provision MongoDB Atlas.** Create (or confirm) the production cluster,
   get its `mongodb+srv://` connection string, and confirm network access
   allows connections from Railway (Atlas's "allow access from anywhere"
   plus a strong database user password is the usual pairing for a
   platform like Railway with no fixed egress IP, unless Atlas's own
   Railway integration/PrivateLink is in use).
2. **Create the Railway service** from this repository. No `railway.json`,
   `nixpacks.toml`, or `Dockerfile` exists in this repo — Railway's Nixpacks
   builder auto-detects the Next.js app and runs `npm install`, `npm run
   build`, `npm start`. Nothing else to configure here.
3. **Set the required variables** in Railway's service → Variables tab:
   `MONGODB_URI`, `NEXTAUTH_URL` (the Railway-assigned domain or your custom
   domain, with `https://`), `NEXTAUTH_SECRET` (freshly generated, never a
   value that has appeared in development or in this repo).
4. **Decide on 2FA** and set `MFA_ENCRYPTION_KEY` now if it should be
   available at launch — enabling it later is safe (existing users simply
   couldn't set up 2FA until it's set), but generate and store it via
   Railway's variable editor, never through a value that passes through
   version control.
5. **Set whichever optional integrations are actually ready** (Cloudinary,
   NVIDIA AI, WhatsApp). Leave the rest unset — each degrades to the
   documented fallback above rather than breaking anything.
6. **Deploy**, then run `railway run npm run verify-env` (or open a Railway
   shell and run `npm run verify-env`) against the live service to confirm
   every required variable is actually present and `MFA_ENCRYPTION_KEY` (if
   set) decodes to a valid 32-byte key.
7. **Smoke-test the real authentication flow** against the deployed URL:
   log in, and if 2FA was configured, enable it on a test account and
   confirm the full setup → QR → verify → recovery-codes flow before
   considering the deployment complete.
8. **Do not run `npm run seed` against this deployment.** It deletes every
   collection before reseeding demo data. It refuses to run at all when
   `NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=true` is explicitly
   set — leave that override unset in production permanently; it exists
   only so an intentional, one-off reseed of a genuinely-non-production
   environment isn't accidentally blocked.
9. **Enable MongoDB Atlas Cloud Backups** (requires an M10+ cluster tier) as
   the real, automated disaster-recovery mechanism. The application's own
   `GET /api/backup/export` (admin-only, Backup & Export page) is a
   real, on-demand data export for portability — it is a complement to
   Atlas's own backups, not a replacement for them. See
   `SMART_STORE_AUDIT.md`'s "Database restore" section for the full
   reasoning and what a self-service in-app restore would require if ever
   commissioned (not currently built, and not recommended by default).

## Notes on this repo's own safety nets

- `.gitignore` excludes `.env`, `.env.local`, and every environment-specific
  variant — `.env.example` is the only environment file meant to be
  committed, and it never contains a real value.
- No `NEXT_PUBLIC_*` environment variables exist in this codebase — nothing
  server-only is exposed to client-side code today. If one is ever added,
  remember that any `NEXT_PUBLIC_` prefix ships its value into the browser
  bundle; never use that prefix for a secret.
- `next.config.js` sets standard production security headers (HSTS,
  `X-Frame-Options`, `X-Content-Type-Options: nosniff`, a restrictive
  `Permissions-Policy`) already — no changes needed there for a standard
  deployment.
