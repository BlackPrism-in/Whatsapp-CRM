# PrismChat — Embedded Signup + Coexistence Plan

**Goal:** replace the manual "paste WABA ID + token" form with a **"Connect WhatsApp" button**. The client clicks it, logs into their own Facebook, and PrismChat wires everything automatically — no tokens handled by hand.

**With Coexistence**, the client **keeps the WhatsApp Business app on their phone** while PrismChat gets API access, and their existing **contacts + up to 180 days of chat history sync in**.

> **Meta prerequisites (Tech Provider, App Review, `config_id`) live in [`PHASE0_META_SETUP.md`](./PHASE0_META_SETUP.md)** — that's your admin work and is not repeated here. This document is the **build plan**.
>
> Sources: WhatsMine's `WhatsappEmbeddedSignupController` (reference implementation) + [Meta: Onboarding Business App Users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).

---

## ⚠️ Constraints that shape the design

| Constraint | Impact |
|---|---|
| **Number must NOT already be on Cloud API** | Coexistence only works for numbers currently on the **WhatsApp Business app**. Our existing test number is *already* on Cloud API → it can't use coexistence. |
| **Throughput capped at 20 msg/sec** | Coexistence numbers are hard-limited. Our `BROADCAST_RATE_LIMIT` default of 20 already matches — but must be **enforced, not just defaulted**, for these numbers. |
| **3 extra webhook fields** | `history`, `smb_app_state_sync`, `smb_message_echoes` — our webhook currently only handles `messages`. Real work. |
| **Sync is one-time** | Contacts/history import runs **once**. To re-sync, the client must offboard and redo the flow. No retry safety net — must not lose the payload. |
| **180 days history / 14 days media** | Older messages and media won't come across. Set client expectations. |
| **Business app ≥ 2.24.17** | Client must update their phone app first. |
| **Not supported in coexistence** | Catalog/orders, labels, quick replies, group chats, broadcast *lists*, voice/video calls. *(Template broadcasts via API still work — that's our feature, unaffected.)* |

---

## Phase 1 — Backend: OAuth code exchange (~1 day) · unblocked

`POST /api/whatsapp/embedded-signup` — accepts `{ code, wabaId, phoneNumberId, event }`

1. Exchange **`code` → short-lived token** (`GET /oauth/access_token`)
   *(retry without `redirect_uri` — some app configs reject it on ES codes)*
2. Exchange **short → long-lived token** (`grant_type=fb_exchange_token`)
3. Fetch WABA details (`GET /{wabaId}?fields=id,name,currency,timezone_id`)
4. **Guard:** WABA already linked to a *different* workspace → **409** (prevents tenant hijacking)
5. Upsert `WhatsappBusinessAccount`, **encrypt the token**, generate `webhookVerifyToken`
6. Record the onboarding mode — `standard` vs `coexistence` (from the `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` event)

**Deliverable:** a client's WABA connects from a `code`, no manual token.
**Schema:** add `onboardingMode` + `isOnBizApp` to `WhatsappBusinessAccount`.

---

## Phase 2 — Backend: auto-wire webhooks + numbers (~1 day) · unblocked

1. **Subscribe the app to the WABA:** `POST /{wabaId}/subscribed_apps`
   ⚠️ Use the **App Access Token** (`{app_id}|{app_secret}`) as a **query param**, not a Bearer header. Fall back to the user token.
2. **Subscribe webhook fields:** `messages` always; **plus `history`, `smb_app_state_sync`, `smb_message_echoes` when coexistence**
3. **Sync phone numbers** → upsert `WhatsappPhoneNumber`
4. **Register the number** — ⚠️ **SKIP for coexistence** (already registered; registering would break it)
5. **Verify mode:** query the phone number for `is_on_biz_app` + `platform_type` → store
6. **Auto-sync templates** (enqueue → needs the worker)
7. Return structured warnings rather than failing hard

**Deliverable:** client never opens Meta's dashboard — no callback URL, verify token, or field subscription by hand.

---

## Phase 3 — Frontend: Connect button, manual form removed (~1 day) · needs `config_id`

1. Load the **Facebook JS SDK**
2. `FB.login()` with `config_id`, `response_type: 'code'`, `override_default_response_type: true`
3. Listen for the `message` event → capture `waba_id`, `phone_number_id`, and the **`event`** type (standard vs `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`)
4. POST to Phase 1; show progress → success / partial-warning states
5. **🗑️ Delete the manual WABA-ID + token form** (per the no-fallbacks decision) — only after this flow is verified working

**Deliverable:** one-click connect; a single onboarding path.

---

## Phase 4 — Coexistence data sync (~1.5 days) · the client-visible win

This is what makes clients say yes — their existing WhatsApp data appears in PrismChat.

1. **Request contact sync** via the SMB App Data API
2. **Request history sync** via the SMB App Data API
3. **Handle `smb_app_state_sync`** → import/update contacts into `Contact`
4. **Handle `history`** → backfill `Conversation` + `Message` (up to 180 days)
5. **Handle `smb_message_echoes`** → messages the client sends *from their phone* also land in PrismChat's Inbox (keeps both sides in sync)
6. Process **asynchronously via the worker** — history payloads are large
7. ⚠️ **Idempotency + durability:** sync is **one-shot**. Persist raw payloads before processing so a crash can't lose the client's history.

**Deliverable:** client connects → their contacts and recent chats are already in PrismChat, and phone-sent messages keep appearing.

---

## Phase 5 — Multi-tenant hardening (~1 day)

- Reconnect / disconnect per workspace
- Detect + surface **expired or revoked** tokens (today it fails silently at send time)
- **Enforce the 20 msg/sec cap** for coexistence numbers (override `BROADCAST_RATE_LIMIT`)
- Handle "already connected elsewhere", permission-denied, partial-success
- Admin view: connected clients, token health, last sync, onboarding mode

**Deliverable:** onboard many clients without babysitting.

---

## Effort summary

| Phase | Work | Blocked by |
|---|---|---|
| 1 — OAuth exchange | ~1 day | — **buildable now** |
| 2 — Auto-wire webhooks/numbers | ~1 day | — **buildable now** |
| 3 — Connect button + remove manual form | ~1 day | `config_id` |
| 4 — Coexistence data sync | ~1.5 days | Coexistence enabled on the config |
| 5 — Multi-tenant hardening | ~1 day | — |

**~5.5 dev days**, gated by **App Review** (1–2 weeks calendar).

**Sequencing:** you do the Meta prerequisites; I build **Phases 1–2 now**, then 3–5 once `config_id` and approval land.

---

## Decisions (locked 2026-07-24)

1. **WABA owned by the CLIENT.** Each client connects their own Business portfolio and is billed by Meta directly. PrismChat never owns client WABAs.
2. **No fallbacks, no static data.** The manual form is **deleted in Phase 3** — not earlier, since removing it today would break the live connection with nothing to replace it.
3. **Coexistence → yes**, and it's now a first-class path (Phase 4), not an optional extra.
4. **Worker required** — template sync (Phase 2) and history import (Phase 4) both run on BullMQ → **$14/mo Render tier**.

---

## Practical notes for the cookery client

- ✅ Their number is on the **WhatsApp Business app** → **eligible for coexistence**, they keep their phone app.
- ⚠️ They must update the Business app to **2.24.17+** before onboarding.
- ⚠️ Broadcasts to 5,000 contacts run at **20 msg/sec** → roughly **4 minutes**. Fine, but it's a hard ceiling.
- ⚠️ History sync is **one-time** — do it right the first time.
- ❌ Our current **test number can't use coexistence** (it's already on Cloud API). Coexistence must be tested with a *different* number that's on the Business app.
