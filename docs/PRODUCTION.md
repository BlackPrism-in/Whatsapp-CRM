# PrismChat — Go-Live Checklist

Your decisions are locked in. This is the ordered list of what **you** need to do.

**Stack:** Render (web + worker) · Supabase Pro (Postgres) · Redis Cloud · Cloudflare R2 · Pusher · Resend
**Domain:** `prismchat.blackprism.in`
**Cost:** ~$32/mo (~₹2,700) infrastructure + Meta per-message charges

---

## ⏱️ Do these in order

Meta verification is the long pole (2–10 business days) — **start it today**, do everything else while you wait.

### Phase A — Start immediately (blocking, slow)

- [ ] **A1.** Create Meta Business Account at business.facebook.com
- [ ] **A2.** Submit **business verification** (GST/incorporation certificate + utility bill or bank statement; business name must match **exactly**)
- [ ] **A3.** Get a phone number for WhatsApp that is **NOT** registered on regular WhatsApp or WhatsApp Business app
      *(if it is: delete that account first, then wait ~24h)*

> Full Meta walkthrough in §2 below.

### Phase B — Accounts + credentials (do while A is pending)

- [ ] **B1. Supabase** → new project (region: Singapore/Mumbai)
      Settings → Database → copy **two** connection strings:
      - `DATABASE_URL` = pooled, port **6543**, append `?pgbouncer=true`
      - `DIRECT_URL` = direct, port **5432**
- [ ] **B2. Redis Cloud** → new database → copy `REDIS_URL`
      Format: `redis://default:[password]@[host]:[port]` (use `rediss://` if TLS on)
- [ ] **B3. Cloudflare R2** → create bucket `prismchat` → R2 API Token →
      `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (`https://[account-id].r2.cloudflarestorage.com`)
      ⚠️ `S3_REGION` must be literally `auto`
- [ ] **B4. Pusher** → Channels app (cluster `ap2` for India) → `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`
- [ ] **B5. Resend** → API key, **and verify `blackprism.in`** by adding their DNS records
      *(without this, team invites can't be emailed — and invites are the only way to add users)*
- [ ] **B6. Generate two secrets yourself:**
      ```bash
      openssl rand -base64 32   # AUTH_SECRET
      openssl rand -base64 32   # ENCRYPTION_KEY
      ```
      🔴 **Never lose or rotate `ENCRYPTION_KEY`** — it decrypts stored WhatsApp tokens. Changing it makes every connected WhatsApp account unreadable. Back it up somewhere safe.

### Phase C — Deploy

- [ ] **C1.** Push the repo to GitHub
- [ ] **C2.** Render → **New → Blueprint** → select the repo → Apply
      *(uses `render.yaml` at the repo root — creates `prismchat-web` and `prismchat-worker`)*
- [ ] **C3.** Fill the `sync: false` env vars in **BOTH** services.
      The worker needs: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `ENCRYPTION_KEY`
      ⚠️ Missing worker env vars = broadcasts silently never send
- [ ] **C4.** First deploy runs migrations automatically (`preDeployCommand`)
- [ ] **C5.** DNS on `blackprism.in`:
      ```
      CNAME   prismchat   prismchat-web.onrender.com
      ```
      Then Render → Settings → Custom Domain → add `prismchat.blackprism.in` (TLS is automatic)
- [ ] **C6.** Create your admin account (Render → prismchat-web → Shell):
      ```bash
      ADMIN_EMAIL=sandeep@blackprism.in ADMIN_PASSWORD='strong-password' \
      ADMIN_NAME='Sandeep' BUSINESS_NAME='Cookery Shop' pnpm bootstrap:admin
      ```
      *(PrismChat is invite-only — there is no public signup. Everyone else is invited from **Team**.)*
- [ ] **C7.** Sign in at `https://prismchat.blackprism.in/login` and verify the dashboard loads

### Phase D — Connect WhatsApp (once Meta approves)

- [ ] **D1.** Create Meta App → add WhatsApp product → copy `META_APP_ID` + `META_APP_SECRET` into Render
      ⚠️ `META_APP_SECRET` is **required** — the webhook fails closed and rejects all traffic without it
- [ ] **D2.** Create the **System User permanent token** (§2 Step 4 — this is the step most people get wrong)
- [ ] **D3.** In PrismChat → **WhatsApp → Setup** → enter WABA ID + token → Connect → **Sync phone numbers**
- [ ] **D4.** In Meta → WhatsApp → Configuration → set webhook:
      - Callback URL: `https://prismchat.blackprism.in/api/webhooks/whatsapp`
      - Verify token: shown on PrismChat's WhatsApp Setup page
      - **Subscribe to the `messages` field** ← without this, no inbound messages or delivery receipts
- [ ] **D5.** Submit message templates for approval
- [ ] **D6.** Add a payment method in Meta Business Settings; switch app **Development → Live**
- [ ] **D7.** Send a test broadcast to yourself before touching the real 5,000 contacts

---

## 2. Meta WhatsApp setup — detail

### Step 1 — Business Account
business.facebook.com → create → **Business Settings → Business Info → Verify** → upload documents. Name must match your legal documents exactly.

### Step 2 — Meta App
developers.facebook.com → My Apps → **Create App** → type **Business** → link to your Business Account → **Add Product → WhatsApp → Set up**.
Settings → Basic gives you **App ID** and **App Secret**.

### Step 3 — WhatsApp number
WhatsApp → API Setup gives a free test number (good for D7 testing).
For production: **Add phone number** → verify by SMS/call → set **Display Name** (Meta reviews it).
Copy the **WABA ID**.

### Step 4 — Permanent token ⚠️
The token in API Setup **expires in 24 hours** — useless for production. Instead:
1. **Business Settings → Users → System Users → Add** → role **Admin**
2. **Add Assets** → your **WhatsApp Account** → **Full control**
3. **Generate New Token** → select your app → expiry **Never** → tick:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
4. **Copy immediately — shown only once.**

### Step 5 — Templates
Create in PrismChat (**WhatsApp → Templates → New**) which submits to Meta, or create in Meta Manager then **Sync from Meta**.
Approval: minutes to 24h. Marketing templates are stricter — keep early submissions plain.
**Broadcasts require an APPROVED template.** Free-form text only works within 24h of a customer messaging you.

---

## 3. Environment variables

Set in Render. `W` = web service, `K` = worker service.

| Variable | Where | Source |
|---|---|---|
| `DATABASE_URL` | W K | Supabase pooled (6543, `?pgbouncer=true`) |
| `DIRECT_URL` | W K | Supabase direct (5432) — migrations |
| `AUTH_SECRET` | W | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | W K | `openssl rand -base64 32` — 🔴 never rotate |
| `REDIS_URL` | W K | Redis Cloud |
| `META_APP_ID` / `META_APP_SECRET` | W | Meta app → Settings → Basic |
| `RESEND_API_KEY` | W | Resend |
| `S3_*` | W | Cloudflare R2 (`S3_REGION=auto`) |
| `PUSHER_*` + `NEXT_PUBLIC_PUSHER_*` | W | Pusher |
| `NEXT_PUBLIC_APP_URL` / `AUTH_URL` | W | preset to `https://prismchat.blackprism.in` |

---

## 4. Known gaps

| Gap | Status |
|---|---|
| Webhook signature verification (`X-Hub-Signature-256`) | ✅ **Done** — HMAC + timing-safe compare, fails closed in production |
| **Broadcast throttling** | ✅ **Done** — worker paces sends at `BROADCAST_RATE_LIMIT` (default 20/sec ≈ 5,000 in ~4 min). Rate-limit/outage errors retry with exponential backoff; permanent errors fail fast |
| **Login rate limiting** | ⏳ Not done — brute-force protection |
| Realtime inbox client | ⏳ Server-side triggers exist; client subscriber not wired. Inbox updates on refresh |
| Password reset | ⏳ Not built — admins can re-invite as a workaround |
| 2FA | ⏳ Schema exists, flow doesn't |
| Automated backups | ✅ Included with Supabase Pro |

**Remaining before real traffic:** login rate limiting.

**Tuning throughput:** `BROADCAST_RATE_LIMIT` (msgs/sec, default 20) and `BROADCAST_ATTEMPTS` (default 5) on the **worker** service. Start at 20; raise only after the number reaches a higher Meta messaging tier and quality rating stays green.

---

## 5. Costs

| Item | Monthly |
|---|---|
| Render web (starter) | $7 |
| Render worker (starter) | $7 |
| Supabase Pro | $25 |
| Redis Cloud / R2 / Pusher / Resend | ₹0 (free tiers) |
| **Infrastructure** | **~$39 (~₹3,300)** |
| WhatsApp messages | ~₹0.80 each — 5,000-contact broadcast ≈ **₹4,000** |

Put Meta's message charges on the **client's own payment method** in their Business Account so it never runs through your books.

> You can start Supabase on the **free tier** and upgrade to Pro at launch — that drops it to ~$14/mo (~₹1,200) during build-out. Free tier pauses after 7 days idle, so don't ship the client on it.
