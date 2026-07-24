# PrismChat — Embedded Signup + Coexistence Plan

**Goal:** replace the manual "paste WABA ID + token" form with a **"Connect WhatsApp" button**. The client clicks it, logs into their own Facebook, and PrismChat wires everything automatically — no tokens handled by hand.

**With Coexistence**, the client **keeps the WhatsApp Business app on their phone** while PrismChat gets API access, and their existing **contacts + up to 180 days of chat history sync in**.

> **Meta prerequisites (Tech Provider, App Review, `config_id`) live in [`PHASE0_META_SETUP.md`](./PHASE0_META_SETUP.md)** — that's your admin work and is not repeated here. This document is the **build plan**.
>
> Sources: WhatsMine's `WhatsappEmbeddedSignupController` (reference implementation) + [Meta: Onboarding Business App Users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).

---

## 📍 Status (2026-07-24)

| Phase | Status |
|---|---|
| **1 — OAuth code exchange** | ✅ **Done** |
| **2 — Auto-wire webhooks + numbers** | ✅ **Done** |
| **3 — Connect button, manual form removed** | ✅ **Done** — code complete, blocked only by HTTPS for full local testing |
| **4 — Coexistence data sync** | ⏳ **Not started** |
| **5 — Multi-tenant hardening** | ⏳ **Not started** |

**What works right now:** a client (or you, testing) can click **Connect WhatsApp** on the deployed site, sign in via Facebook, and PrismChat automatically stores the WABA, subscribes webhooks, syncs phone numbers, registers the number, and queues a template sync — with zero manual Meta steps. The old manual entry form no longer exists.

**What doesn't work yet:** coexistence numbers connect and send/receive fine, but their **existing WhatsApp contacts and chat history are not imported** (Phase 4). Multi-client operational tooling (reconnect flows, token-health monitoring) also isn't built (Phase 5).

**Not yet verified:** a signup has not been completed end-to-end past Meta's popup, because that requires either (a) the deployed HTTPS domain, or (b) Advanced Access for a non-developer test account. Everything up to that boundary — SDK loading, `FB.login` invocation, the backend pipeline — has been verified with real Graph API calls and a live browser test.

---

## ⚠️ Constraints that shape the design

| Constraint | Impact |
|---|---|
| **Number must NOT already be on Cloud API** | Coexistence only works for numbers currently on the **WhatsApp Business app**. Our existing test number is *already* on Cloud API → it can't use coexistence. |
| **Throughput capped at 20 msg/sec** | Coexistence numbers are hard-limited. Our `BROADCAST_RATE_LIMIT` default of 20 already matches — but must be **enforced, not just defaulted**, for these numbers (Phase 5). |
| **3 extra webhook fields** | `history`, `smb_app_state_sync`, `smb_message_echoes` — our webhook currently only handles `messages`. Real work (Phase 4). |
| **Sync is one-time** | Contacts/history import runs **once**. To re-sync, the client must offboard and redo the flow. No retry safety net — must not lose the payload. |
| **180 days history / 14 days media** | Older messages and media won't come across. Set client expectations. |
| **Business app ≥ 2.24.17** | Client must update their phone app first. |
| **Not supported in coexistence** | Catalog/orders, labels, quick replies, group chats, broadcast *lists*, voice/video calls. *(Template broadcasts via API still work — that's our feature, unaffected.)* |
| **FB.login requires HTTPS** *(discovered during Phase 3 testing)* | Meta's SDK refuses to run on plain `http://` origins (e.g. `localhost`). The button now detects this and fails immediately with a clear message instead of hanging — but genuine end-to-end testing needs the deployed HTTPS domain. |

---

## ✅ Phase 1 — Backend: OAuth code exchange · DONE

**Built as:** `connectViaEmbeddedSignup()` in `src/modules/whatsapp/embedded-signup.ts`, wrapped by the server action `connectEmbeddedSignup()` in `src/modules/whatsapp/actions.ts`.
*(Deviation from the original plan: a server action instead of a `POST /api/...` route, for consistency with the rest of the codebase — same effect.)*

1. **Ownership guard runs FIRST**, before spending Meta's one-time `code` — a foreign workspace claiming another's WABA is rejected with 409 before any Graph call. *(This ordering was a deliberate fix during implementation — the code is single-use, so checking after the exchange would waste it on a rejected connection.)*
2. Exchange `code` → short-lived token (`exchangeCodeForToken`, retries without `redirect_uri`)
3. Exchange short → long-lived token (`exchangeForLongLivedToken`)
4. Verify the token actually grants access to the WABA (`verifyWaba`)
5. Upsert `WhatsappBusinessAccount` with the token **encrypted** (AES-256-GCM), reusing the existing `webhookVerifyToken` on reconnect so an already-configured Meta webhook doesn't break
6. Records `onboardingMode` (`standard` / `coexistence`) from the `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` event

**Schema added:** `onboardingMode`, `isOnBizApp`, `platformType`, `historySyncedAt`, `contactsSyncedAt` on `WhatsappBusinessAccount` (migration `embedded_signup_fields`).

**Verified:** mode detection (3/3 cases), cross-workspace hijack blocked with 409 *before* the token exchange, rightful owner passes the guard.

---

## ✅ Phase 2 — Backend: auto-wire webhooks + numbers · DONE

**Built as:** `provisionWaba()` in `src/modules/whatsapp/provision.ts`, called automatically at the end of `connectEmbeddedSignup()`.

1. **Subscribe the app to the WABA:** `subscribeAppToWaba()` — uses the **App Access Token** (`{app_id}|{app_secret}`) form-POSTed, **not** a Bearer header (Meta requires this specific shape); falls back to the user token if that fails
2. **Sync phone numbers** → upsert `WhatsappPhoneNumber`, reading `is_on_biz_app` / `platform_type` per number via `fetchPhoneNumberDetails`
3. **Register the number — skipped for coexistence** (re-registering an already-registered coexistence number would sever the client's WhatsApp Business app link)
4. **Template sync enqueued** on a new `whatsapp-sync` BullMQ queue (`syncTemplatesForWaba()` in `src/modules/whatsapp/sync.ts`), processed by the worker — never blocks the connect response
5. **Never throws** — returns a `warnings[]` array so a webhook-subscribe hiccup reports partial success instead of making a good connection look failed

**Not yet done (still Phase 4/5 scope):** subscribing the 3 coexistence-only webhook fields (`history`, `smb_app_state_sync`, `smb_message_echoes`) — that's app-level Meta configuration, tracked in `PHASE0_META_SETUP.md` §0.6, and the *handling* of those payloads is Phase 4.

**Verified** with a fetch-intercepting test harness (4/4 checks):
- Standard mode → phone synced, number **registered**, `isOnBizApp=false`
- Coexistence mode → phone synced, number registration **correctly skipped**, `isOnBizApp=true`
- Webhook-subscribe failure → warning returned, doesn't throw, phone sync still completes
- Template sync job actually lands in the `whatsapp-sync` queue

---

## ✅ Phase 3 — Frontend: Connect button, manual form removed · DONE

**Built as:**
- `src/lib/facebook-sdk.ts` — lazy-loads the Facebook JS SDK (only when the button is used, not in every page's `<head>`), plus `listenForEmbeddedSignupEvent()` which listens for Meta's `WA_EMBEDDED_SIGNUP` `postMessage` events
- `src/components/whatsapp/ConnectWhatsAppButton.tsx` — the button itself

**Why two data sources are combined:** Meta splits the signup result across two channels — `FB.login`'s own callback carries only the OAuth `code`, while the `waba_id` / `phone_number_id` / onboarding `event` arrive separately via `postMessage`. The button reconciles both before calling the backend.

**🗑️ Manual form removed**, per the no-fallbacks decision: deleted `ConnectWabaForm.tsx`, the `connectWaba` server action, and `connectWabaSchema`. `WhatsApp → Setup` now shows **only** the Connect button when disconnected — there is a single onboarding path.

**Bug found and fixed during live browser testing:** with no guard, a failed `FB.login` (e.g. the HTTPS requirement above) never invokes its callback — the button was left stuck on "Waiting for Meta…" indefinitely. Fixed with:
1. An upfront `window.location.protocol !== "https:"` check → instant, readable failure instead of a silent hang
2. A **90-second watchdog** for any other reason the callback might never fire (popup blocked, network drop)
3. A guard for `window.FB?.login` being missing entirely

**Verified live in browser:** the real Facebook SDK loads, `FB.init` succeeds, `FB.login` is invoked with the correct `config_id` — confirmed by Meta's own SDK correctly refusing to proceed over `http://`. After the fix, that failure surfaces in under a second instead of hanging.

---

## ⏳ Phase 4 — Coexistence data sync · NOT STARTED · the client-visible win

This is what makes clients say yes — their existing WhatsApp data appears in PrismChat.

1. **Request contact sync** via the SMB App Data API
2. **Request history sync** via the SMB App Data API
3. **Handle `smb_app_state_sync`** → import/update contacts into `Contact`
4. **Handle `history`** → backfill `Conversation` + `Message` (up to 180 days)
5. **Handle `smb_message_echoes`** → messages the client sends *from their phone* also land in PrismChat's Inbox (keeps both sides in sync)
6. Process **asynchronously via the worker** — history payloads are large
7. ⚠️ **Idempotency + durability:** sync is **one-shot**. Persist raw payloads before processing so a crash can't lose the client's history.

**Deliverable:** client connects → their contacts and recent chats are already in PrismChat, and phone-sent messages keep appearing.

**Prerequisite:** the 3 extra webhook fields must be subscribed in the Meta configuration (`PHASE0_META_SETUP.md` §0.6) before this phase can receive any payloads to handle.

---

## ⏳ Phase 5 — Multi-tenant hardening · NOT STARTED

- Reconnect / disconnect per workspace (disconnect already exists from the pre-Embedded-Signup work; reconnect-after-revoke flow doesn't)
- Detect + surface **expired or revoked** tokens (today it fails silently at send time)
- **Enforce the 20 msg/sec cap** for coexistence numbers (override `BROADCAST_RATE_LIMIT`)
- Handle "already connected elsewhere", permission-denied, partial-success
- Admin view: connected clients, token health, last sync, onboarding mode

**Deliverable:** onboard many clients without babysitting.

---

## Effort summary

| Phase | Work | Status |
|---|---|---|
| 1 — OAuth exchange | ~1 day | ✅ Done |
| 2 — Auto-wire webhooks/numbers | ~1 day | ✅ Done |
| 3 — Connect button + remove manual form | ~1 day | ✅ Done |
| 4 — Coexistence data sync | ~1.5 days | ⏳ Remaining |
| 5 — Multi-tenant hardening | ~1 day | ⏳ Remaining |

**~2.5 dev days remaining.** Full end-to-end verification of Phases 1–3 (a real signup completing all the way through) still needs either the deployed HTTPS domain or Advanced Access — the code path is built and unit/integration-tested, but Meta's own HTTPS + access-level gates haven't been passed yet.

---

## Decisions (locked 2026-07-24)

1. **WABA owned by the CLIENT.** Each client connects their own Business portfolio and is billed by Meta directly. PrismChat never owns client WABAs.
2. **No fallbacks, no static data.** ✅ Done — the manual form was deleted in Phase 3.
3. **Coexistence → yes**, and it's a first-class path (Phase 4), not an optional extra.
4. **Worker required** — template sync (Phase 2, live) and history import (Phase 4, pending) both run on BullMQ → **$14/mo Render tier**.

---

## Practical notes for the cookery client

- ✅ Their number is on the **WhatsApp Business app** → **eligible for coexistence**, they keep their phone app.
- ⚠️ They must update the Business app to **2.24.17+** before onboarding.
- ⚠️ Broadcasts to 5,000 contacts run at **20 msg/sec** → roughly **4 minutes**. Fine, but it's a hard ceiling.
- ⚠️ History sync is **one-time** — do it right the first time (once Phase 4 is built).
- ❌ Our current **test number can't use coexistence** (it's already on Cloud API). Coexistence must be tested with a *different* number that's on the Business app.
