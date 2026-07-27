# Phase 0 — Meta prerequisites for Embedded Signup

Everything here is done in Meta's dashboards on your account. Work top to bottom.
**Start the App Review as early as possible — it's the long pole (1–2 weeks).**

> The **build** (Phases 1–3 of Embedded Signup) is complete and waiting on this doc — see [`EMBEDDED_SIGNUP_PLAN.md`](./EMBEDDED_SIGNUP_PLAN.md) for status. The Connect button is live in the app; it just needs App Review to pass before *other businesses* (not just you) can use it.

---

## 0.1 — Business Verification
✅ Already submitted for BLACKPRISM PRIVATE LIMITED (in review, ~2 working days).
Everything below can be prepared while it's pending, but App Review won't pass until it's approved.

---

## 0.2 — Become a Tech Provider 🔴 CURRENT BLOCKER

> **Tested live 2026-07-24:** clicking Connect WhatsApp opens Meta's popup, which returns
> *"BlackPrism Private Limited can't onboard customers at the moment."*
> That message means Meta does not yet consider BlackPrism authorised to onboard customer
> businesses. **This step is the most likely cause.** There is no developer bypass —
> being an admin on the app does not exempt you from it.

1. developers.facebook.com → your **PrismChat** app
2. Left nav → **Become a Partner → Become Tech Provider**
3. Complete the form. Key fields:
   - **What are you building:** a WhatsApp CRM / customer-engagement platform for SMBs
   - **Who are your customers:** small and medium businesses in India (retail, F&B, education)
4. Submit

---

## 0.3 — Add "Facebook Login for Business"

Embedded Signup runs on top of this product.

1. App → **Add product** → **Facebook Login for Business** → Set up
2. **Settings** → set:
   - **Valid OAuth Redirect URIs:** `https://prismchat.blackprism.in`
   - **Client OAuth Login:** ON
   - **Web OAuth Login:** ON
3. App Settings → **Basic** → **App Domains:** `prismchat.blackprism.in`
4. Also fill in (required before App Review will accept a submission):
   - **Privacy Policy URL** — e.g. `https://prismchat.blackprism.in/privacy`
   - **Terms of Service URL** — e.g. `https://prismchat.blackprism.in/terms`
   - **App icon** and **Category**

> ✅ **DONE (2026-07-24)** — real pages now exist and are publicly reachable (no login required):
> - `https://prismchat.blackprism.in/privacy`
> - `https://prismchat.blackprism.in/terms`
> - `https://prismchat.blackprism.in/data-deletion`
>
> Replace the placeholder `facebook.com` URLs in **App settings → Basic** with these three.

---

## 0.4 — Create the Embedded Signup configuration

✅ **DONE (2026-07-24).** Configuration created with:
- Login variation: **WhatsApp Embedded Signup**
- Assets: **WhatsApp accounts only** (Pages/Ad accounts/Catalogs/Pixels/Instagram unchecked — avoids blocking clients without an Ad account, and avoids over-requesting for App Review)
- Access token: **System-user**, **Never** expires
- Products: **WhatsApp Cloud API** only
- Permissions: `business_management` (auto-added dependency), `whatsapp_business_management`, `whatsapp_business_messaging`
- **`config_id`: `1365519555548055`** → saved as `NEXT_PUBLIC_META_CONFIG_ID` in the app's environment, wired into the live Connect button

⚠️ Coexistence has **not yet been enabled** on this configuration — do that before Phase 4 (data sync) is built, and subscribe the 3 extra webhook fields in §0.6 below.

---

## 0.5 — App Review → Advanced Access ⚠️ the gate

**Standard Access only works on your own assets.** To onboard *other* businesses you need **Advanced Access** on both permissions.

App → **App Review → Permissions and Features** → request **Advanced Access** for:
- `whatsapp_business_management`
- `whatsapp_business_messaging`

### Paste-ready justifications

**`whatsapp_business_management`**
> PrismChat is a WhatsApp CRM used by small and medium businesses to manage customer communication. We request this permission so that, after a business owner connects their own WhatsApp Business Account through Meta's Embedded Signup flow, PrismChat can manage that account on their behalf: retrieve and register their phone numbers, create and sync message templates for approval, and subscribe to webhooks so inbound messages are delivered to their shared team inbox. The permission is used only for WhatsApp Business Accounts whose owners have explicitly authorized our app during Embedded Signup. We do not access any account that has not granted consent, and business owners can disconnect at any time from within PrismChat.

**`whatsapp_business_messaging`**
> PrismChat lets businesses read and reply to their customers' WhatsApp messages from a shared team inbox, and send opt-in notifications such as order updates, class reminders and promotional broadcasts using Meta-approved message templates. We request this permission to send and receive messages on behalf of business users who have connected their own WhatsApp Business Account via Embedded Signup. All recipients are the business's own customers who have opted in. We honour the 24-hour customer service window and only send template messages outside it. Businesses control their own contact lists and can disconnect at any time.

### Screencast — what reviewers must see
Record one continuous video (2–4 min, no cuts):
1. Sign in to PrismChat
2. Go to **WhatsApp → Setup**, click **Connect WhatsApp**
3. The Meta Embedded Signup popup appears; complete it with a *test* business
4. Show the account now connected in PrismChat, with phone numbers synced
5. Show an inbound message arriving in the **Inbox**
6. Show replying from the Inbox and the message arriving on the phone
7. Show **Disconnect** (proves the business controls its own data)

> 🔴 **Chicken-and-egg (real, confirmed 2026-07-24):** the screencast is supposed to show a completed signup — but the signup is blocked by the very approvals you're applying for ("can't onboard customers at the moment").
>
> **How to handle it:** record what you *can* demonstrate and be explicit in the submission notes:
> 1. Sign in to PrismChat → **WhatsApp → Setup** → click **Connect WhatsApp**
> 2. Show Meta's own popup opening with the correct app + configuration
> 3. Show the blocking message, and state in the notes: *"The onboarding flow is fully implemented and reaches Meta correctly; it is blocked pending Tech Provider approval and Advanced Access, which this submission requests."*
> 4. Then demonstrate the **rest of the product working on our own connected WABA** — inbound message arriving in the Inbox, replying from the Inbox, template list, disconnect
>
> Reviewers accept this when the integration is clearly built and the block is Meta-side. Do **not** fake a completed signup.

### Also required
- **Data deletion instructions URL** (real page, not facebook.com)
- Reviewer test credentials — create a PrismChat login for Meta reviewers and include it in the submission notes

---

## 0.6 — Coexistence (confirmed requirements)

Per [Meta's onboarding-business-app-users doc](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users):

**Eligibility**
- You must be a **Solution Partner or Tech Provider** (step 0.2)
- The client's **WhatsApp Business app must be ≥ 2.24.17**
- The client's **phone number must NOT already be registered to Cloud API** — it has to be live on the Business app
- Your webhook must reliably accept and digest payloads ✅ (ours does)

**In the Embedded Signup configuration (step 0.4) you must subscribe to 3 extra webhook fields:**
- `history` — past messages
- `smb_app_state_sync` — contacts
- `smb_message_echoes` — messages the client sends from their phone

When configured correctly, the signup popup offers **"connect your existing WhatsApp Business account"** instead of the normal WABA picker.

**Consequences to plan for**
- Coexistence numbers are **throughput-capped at 20 messages/sec**
- Contact + history sync runs **once only** (re-sync requires offboard + redo)
- History limited to **180 days**; media only for the last **14 days**
- Unsupported while in coexistence: catalog/orders, labels, quick replies, group chats, WhatsApp broadcast *lists*, voice/video calls
  *(Template broadcasts through the API are unaffected — that's PrismChat's feature)*

⚠️ **Our current test number cannot be used to test coexistence** — it's already on Cloud API. Testing needs a separate number that's live on the WhatsApp Business app.

---

## Checklist

- [x] 0.1 Business verification submitted (in review since 2026-07-22)
- [ ] 0.2 Tech Provider submitted — **confirm this is done; required before Advanced Access will be granted**
- [x] 0.3 Facebook Login for Business added + real Privacy/ToS/Data-deletion URLs live *(pages built 2026-07-24 — still need pasting into App settings → Basic if not done)*
- [x] 0.4 Embedded Signup configuration created → **`config_id` = `1365519555548055`**, wired into the app
- [ ] 0.5 App Review submitted (both permissions + screencast + test login) — **the Connect button now exists, so the screencast can be recorded**
- [ ] 0.6 Coexistence enabled on the configuration + 3 extra webhook fields subscribed (`history`, `smb_app_state_sync`, `smb_message_echoes`) — needed before Phase 4 (data sync) can be built

**Remaining before other businesses can self-onboard:** 0.2 (confirm), 0.5 (submit — the app-side blocker is gone), 0.6 (for coexistence specifically).
**You personally can likely test the Connect button already** — Meta's own UI noted that Standard Access permissions "will only be requested from people with roles on this app," which includes you as the developer.

---

## ✅ Blocking dependency — RESOLVED (2026-07-24)
Privacy Policy, Terms of Service and Data Deletion pages are built, publicly accessible, and deploy as static pages. Paste the three URLs above into **App settings → Basic**.

⚠️ **Have these reviewed** before relying on them commercially — they are solid, accurate drafts describing what PrismChat actually does (AES-256-GCM token encryption, webhook signature verification, tenant isolation, the named sub-processors), but they are not legal advice. Check the India DPDP Act grievance-officer requirement in particular.
