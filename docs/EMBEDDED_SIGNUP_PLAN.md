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
| **3 — Connect button, manual form removed** | ✅ **Done** |
| **4 — Coexistence data sync** | ✅ **Done** — verified against realistic payloads |
| **5 — Multi-tenant hardening** | ✅ **Done** — token health, auto-pause, rate clamp, reconnect UI |

**What works right now:** a client (or you, testing) can click **Connect WhatsApp** on the deployed site, sign in via Facebook, and PrismChat automatically stores the WABA, subscribes webhooks, syncs phone numbers, registers the number, and queues a template sync — with zero manual Meta steps. The old manual entry form no longer exists.

**All five build phases are complete.** The remaining blocker is entirely on Meta's side (see below), not in the code.

**Deliberately deferred:** a cross-client admin console (one screen listing every connected client's health). Per-workspace health is fully surfaced, which is what a workspace admin actually needs; a superadmin view only becomes worthwhile at several clients.

**🔴 Confirmed blocker (tested live 2026-07-24):** clicking **Connect WhatsApp** on the deployed site opens Meta's popup, which then shows:

> *"BlackPrism Private Limited can't onboard customers at the moment"*

This is **Meta's gate, not a PrismChat bug** — the app-side flow works and reaches Meta correctly. Onboarding *other businesses* requires all three of:
1. **Tech Provider status approved** (§0.2) — the single most likely cause of this exact message
2. **Business Verification approved** (§0.1 — still *in review*)
3. **Advanced Access** granted for `whatsapp_business_management` + `whatsapp_business_messaging` (§0.5 — **not yet submitted**)

⚠️ **Correction to an earlier assumption:** I previously suggested you could test the Connect button yourself as an app developer, because Standard Access permissions are requestable from "people with roles on this app". That is **wrong for Embedded Signup** — the *customer-onboarding* flow is gated on Tech Provider status regardless of who is clicking. There is no developer bypass. The flow cannot be exercised end-to-end until Meta approves.

**Consequence for App Review:** the required screencast (§0.5) shows a completed signup — which is itself blocked by this gate. See §0.5 for how to handle that chicken-and-egg.

---

## 🚨 Before deploying this code

**Run the migrations first.** Two migrations are pending on production:

```bash
cd prismchat
DIRECT_URL="<supabase 5432 url>" pnpm db:deploy
```

- `embedded_signup_fields` — `onboardingMode`, `isOnBizApp`, `platformType`, `historySyncedAt`, `contactsSyncedAt`
- `waba_token_health` — `lastError`, `lastErrorAt`, `lastVerifiedAt`

The WhatsApp setup page reads these columns. Deploying the code before the
migration produces a **500 on `/app/whatsapp`** — this exact failure already
happened once when `embedded_signup_fields` shipped ahead of its migration.
Render's free tier has no `preDeployCommand`, so this step is manual.

---

## ⚠️ Constraints that shape the design

| Constraint | Impact |
|---|---|
| **Number must NOT already be on Cloud API** | Coexistence only works for numbers currently on the **WhatsApp Business app**. Our existing test number is *already* on Cloud API → it can't use coexistence. |
| **Throughput capped at 20 msg/sec** | ✅ Enforced in Phase 5 — `effectiveSendRate()` clamps the configured rate down to 20 for coexistence numbers, so a higher `BROADCAST_RATE_LIMIT` can't cause over-sending. |
| **3 extra webhook fields** | `history`, `smb_app_state_sync`, `smb_message_echoes` — ✅ handled in code (Phase 4). Still must be **subscribed in the Meta configuration** (`PHASE0_META_SETUP.md` §0.6) before any payloads arrive. |
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

## ✅ Phase 4 — Coexistence data sync · DONE

**Built as:** `src/modules/whatsapp/coexistence.ts`, routed from `processWebhook()` in `src/modules/inbox/inbound.ts`.

| Webhook field | Handler | Behaviour |
|---|---|---|
| `smb_app_state_sync` | `handleAppStateSync()` | Imports the client's phone contacts. **`remove` actions are deliberately ignored** — deleting a contact on the phone shouldn't silently destroy CRM records (notes, tags, campaign history) the business relies on. |
| `history` | `handleHistory()` | Backfills `Conversation` + `Message` (up to 180 days), using `history_context.from_me` to set direction, and back-dating `sentAt` from Meta's unix timestamps so the inbox orders correctly. |
| `smb_message_echoes` | `handleMessageEchoes()` | Mirrors messages the business sends **from their phone** into the inbox — otherwise staff would see a customer question with no sign it was already answered. |

**Durability (the critical part).** Coexistence sync is one-shot — Meta never resends it. So `processCoexistenceChange()` **persists every raw payload to `InboundWebhookEvent` before processing**, keyed by a content hash. If processing throws, `processedAt` stays null and the payload can be replayed from storage rather than the client's history being lost permanently. Already-processed payloads short-circuit, so Meta retries are safe.

Contacts are matched by normalised E.164 phone, and an existing contact's name is only filled in **if it was empty** — never overwriting a name the business edited.

**Bug caught during testing:** conversations were being created with the WABA row id as `channelAccountId`. Those two ids happen to coincide when created by `connectViaEmbeddedSignup`, so it would have appeared to work — but it's a foreign key to `ChannelAccount`, and the assumption breaks if that row is ever missing. Now resolved by an explicit lookup, with `null` tolerated.

**Verified** end-to-end against realistic Meta payloads on a real database:
- 2 contacts imported, the `remove` entry correctly skipped
- Inbound vs outbound direction correct from `from_me` (`hist_1` → `in`, `hist_2` → `out`)
- Phone-sent echo landed as an outbound message
- **Replaying the identical history payload produced zero duplicates**
- All 3 payloads stored *and* marked processed

⚠️ **Still needs Meta-side enablement:** the 3 webhook fields must be subscribed on the Embedded Signup configuration (`PHASE0_META_SETUP.md` §0.6) before any of these payloads will actually arrive. The handling code is ready and waiting.

---

## ✅ Phase 5 — Multi-tenant hardening · DONE

**Built as:** `src/modules/whatsapp/token-health.ts`, wired into every send path.

**The problem it solves:** before this, a revoked or expired token failed *silently at send time*. A broadcast would mark thousands of recipients "failed", the inbox would show a raw Meta error, and nothing told the client their connection needed re-authorising.

1. **Auth-error classification** — `isAuthError()` separates "this token is dead" (Meta codes 190/102/463/467/200/10, HTTP 401/403) from transient failures (rate limits, Meta 5xx). Only the former flags the account; a Meta outage must never tell a client to reconnect.
2. **Health recorded on every Graph call** — `recordGraphOutcome()` marks the account healthy on success and `token_invalid` on auth failure, storing Meta's own error text for the UI.
3. **🔑 Broadcasts auto-pause on auth failure** — an invalid token fails identically for every remaining recipient, so the campaign is paused after the *first* one. Remaining recipients stay `pending` and resumable instead of burning the whole audience on guaranteed failures.
4. **Safe credential reads** — `getCredentials()` never throws. `decrypt()` throws if `ENCRYPTION_KEY` was rotated or the ciphertext is corrupt; that previously propagated as a **500** (the exact class of failure that took `/app/whatsapp` down). It now degrades to an actionable error and flags the account.
5. **Coexistence rate cap enforced** — `effectiveSendRate()` clamps the configured rate to Meta's hard **20 msg/sec** ceiling for coexistence numbers. Previously `BROADCAST_RATE_LIMIT` could be set higher and would over-send, risking throttling or a flagged number.
6. **Reconnect UI** — a red banner with Meta's actual error and an inline Connect button; red status dot, "needs reconnect" badge, coexistence badge, and last-verified timestamp.
7. **Proactive "Check connection"** — verifies credentials against Meta on demand, so a dead token is found *before* a broadcast rather than during one.

**Verified:**
- Auth classification 7/7 (190, 102, 200, HTTP 401 → auth; 130429 rate-limit, HTTP 500, 131026 undeliverable → *not* auth)
- Rate clamp 3/3 (coexistence 80→20, keeps a lower 10, standard 80 untouched)
- Credential safety 8/8 in an isolated tenant — corrupt ciphertext returns `ok:false` instead of throwing, flags `credentials_unreadable`, and health transitions set/clear correctly
- **Campaign auto-pause, end-to-end** with a simulated code-190 response: campaign paused after recipient 1, WABA flagged, recipient 2 short-circuited and left `pending`
- **Live browser test:** "Check connection" called the real Graph API, Meta rejected the stored dummy token, and the error surfaced in the reconnect banner

**Bug caught by running the worker** (`tsc` and `next build` both passed): the startup rate resolution used top-level `await`, which fails because tsx compiles the worker to CJS. Restructured into an async `bootstrap()`.

---

## Effort summary

| Phase | Work | Status |
|---|---|---|
| 1 — OAuth exchange | ~1 day | ✅ Done |
| 2 — Auto-wire webhooks/numbers | ~1 day | ✅ Done |
| 3 — Connect button + remove manual form | ~1 day | ✅ Done |
| 4 — Coexistence data sync | ~1.5 days | ✅ Done |
| 5 — Multi-tenant hardening | ~1 day | ✅ Done |

**~1 dev day of build work remaining.**

**The real remaining blocker is Meta, not code.** A signup has never completed end-to-end, because Meta returns *"BlackPrism Private Limited can't onboard customers at the moment"* — see the Status section. Every phase is built and tested in isolation against realistic payloads, but the full live path stays unproven until Tech Provider / Business Verification / Advanced Access clear.

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
