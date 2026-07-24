# Phase 0 — Meta prerequisites for Embedded Signup

Everything here is done in Meta's dashboards on your account. Work top to bottom.
**Start the App Review as early as possible — it's the long pole (1–2 weeks).**

---

## 0.1 — Business Verification
✅ Already submitted for BLACKPRISM PRIVATE LIMITED (in review, ~2 working days).
Everything below can be prepared while it's pending, but App Review won't pass until it's approved.

---

## 0.2 — Become a Tech Provider

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

1. App → **WhatsApp → Configuration** (or *Facebook Login for Business → Configurations*)
2. **Create configuration**
   - Type: **WhatsApp Embedded Signup**
   - Permissions: `whatsapp_business_management`, `whatsapp_business_messaging`
   - **Enable Coexistence** if the option is offered (lets clients keep the WhatsApp Business app)
3. **Copy the `config_id`** → this is what the frontend button needs

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

> 🔴 Chicken-and-egg: the screencast needs the Connect button, which needs `config_id` (0.4). So do 0.4 **before** submitting. You can record with Standard Access on your *own* WABA — that's acceptable.

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

- [ ] 0.1 Business verification approved
- [ ] 0.2 Tech Provider submitted
- [ ] 0.3 Facebook Login for Business added + real Privacy/ToS/Data-deletion URLs live
- [ ] 0.4 Embedded Signup configuration created → **`config_id` captured**
- [ ] 0.5 App Review submitted (both permissions + screencast + test login)
- [ ] 0.6 Coexistence enabled + 3 extra webhook fields subscribed (`history`, `smb_app_state_sync`, `smb_message_echoes`)

**Send me the `config_id` when you have it** — that's what Phase 3's Connect button needs.

---

## ✅ Blocking dependency — RESOLVED (2026-07-24)
Privacy Policy, Terms of Service and Data Deletion pages are built, publicly accessible, and deploy as static pages. Paste the three URLs above into **App settings → Basic**.

⚠️ **Have these reviewed** before relying on them commercially — they are solid, accurate drafts describing what PrismChat actually does (AES-256-GCM token encryption, webhook signature verification, tenant isolation, the named sub-processors), but they are not legal advice. Check the India DPDP Act grievance-officer requirement in particular.
