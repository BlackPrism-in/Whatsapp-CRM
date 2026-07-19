# PrismChat (WhatsMine port) → Next.js Port Plan

**Product name:** **PrismChat** (the WhatsMine template is the source blueprint; the new product ships as PrismChat).

**Goal:** Rebuild the platform (template is Laravel 12 + React/Inertia) as a **Next.js full-stack app + Prisma + PostgreSQL**, removing PHP entirely. First deployment is the cookery-shop client (3,000–5,000 WhatsApp users); the product is architected to be **resellable** as phased paid modules.

> Source of truth for behavior = `template/WhatsMine150/`. We keep its React UI, design system (brand `#467235` green / `#FFBF00` amber), and data model as a blueprint; the backend is rewritten. **All "WhatsMine" naming is replaced with "PrismChat"** during the UI port — app name, logos, page titles, email/CMS copy, config `APP_NAME`.

---

## 1. Target Architecture

| Concern | WhatsMine (Laravel) | New stack (Next.js) |
|---|---|---|
| App shell | Laravel + Inertia + React | **Next.js 15 App Router** (React 19, server components) |
| API | Laravel controllers / routes | **Route Handlers + Server Actions** (`app/api/**`, `"use server"`) |
| ORM / DB | Eloquent + migrations | **Prisma** + PostgreSQL (Prisma Migrate) |
| Auth | Sanctum + Socialite + 2FA | **Auth.js (NextAuth v5)** + OAuth providers + `google2fa`→ `otplib` |
| Realtime (inbox, typing) | Laravel Reverb (WebSockets) | **Pusher** or self-hosted **Soketi** (Pusher-protocol) + `pusher-js` |
| Background jobs / queues | Laravel Queue + `jobs` table | **BullMQ + Redis** (broadcasts, imports, AI, scraping, webhooks) |
| Scheduling (cron) | Laravel Scheduler | BullMQ repeatable jobs / Vercel Cron |
| File storage | Flysystem + S3 | **S3 SDK** (`@aws-sdk/client-s3`) + presigned uploads |
| Payments | `stripe/stripe-php` | **`stripe` Node SDK** + webhooks |
| PDF / CSV | dompdf / league-csv | `@react-pdf/renderer` or `puppeteer`; `papaparse` / `csv-parse` |
| Web push | `minishlink/web-push` | `web-push` (Node) |
| Multi-tenancy | `workspace_id` / `client_id` scoping | Prisma middleware + session-scoped `workspaceId` on every query |
| Validation | Form Requests | **Zod** schemas shared client/server |
| i18n | Laravel translations | `next-intl` |
| Error monitoring | Sentry Laravel | `@sentry/nextjs` |

**Repo shape (single Next.js app, modular):**
```
app/            # routes (marketing, auth, client dashboard, admin)
  (marketing)/  (auth)/  (client)/  (admin)/  api/
modules/        # domain logic mirrors WhatsMine modules
  contacts/ whatsapp/ broadcasting/ inbox/ automation/ ai/
  leads/ ecommerce/ social/ integrations/ billing/ shared/
lib/            # prisma, auth, queue, storage, pusher, stripe clients
workers/        # BullMQ processors (run as separate node process)
prisma/         # schema.prisma + migrations
components/     # ported React UI (from resources/js/Components)
```

---

## 2. Data Model (port to `prisma/schema.prisma`)

**Platform / tenancy:** Workspace, WorkspaceUser, Client, ClientSubscription, ClientSetting, AdminUser, User, Role, Permission, RolePermission, Invitation, MagicLink, SocialAccount(auth), AuditLog, SystemSetting, Media, OnboardingStep.

**Billing:** Plan, Subscription, PaymentTransaction, PaymentGatewayConfig, Coupon, TaxRate, Currency, BillingEvent, UsageMeter.

**Comms core (Shared):** Contact, ChannelAccount, Conversation, Message, Segment (+ pivot), InternalNote, NotificationPreference, PushSubscription.

**WhatsApp:** WhatsappBusinessAccount, WhatsappPhoneNumber, WhatsappTemplate, WhatsappAutoReply, WhatsappWidget.

**Broadcasting:** Campaign, CampaignRecipient, SmsProviderConfig, WorkspaceSmtpConfig, SmtpConfiguration.

**Inbox:** CannedReply, InboxLabel.

**Automation:** Automation, AutomationRun, AutomationRunLog.

**AI:** AiProviderConfig, AiKnowledgeBase, AiKbDocument, AiKbChunk (vector — use `pgvector`), AiChatbot, AiRun.

**Leads:** Lead, LeadScrapeJob.

**Ecommerce:** EcommerceStore, EcommerceProduct, EcommerceOrder, EcommerceCart.

**Social:** SocialAccount(publishing), SocialPost, SocialPostAccount.

**Integrations / infra:** IntegrationConfig, WebhookEndpoint, WebhookDelivery, InboundWebhookEvent, SupportTicket, SupportReply, ContactMessage, CmsPage, Template, Locale, Translation.

> ~55 tables. Reproduce each migration's columns/indexes 1:1 in Prisma; enums (SMS providers, statuses) become Prisma enums.

---

## 3. Module port checklist (endpoints already mapped from WhatsMine)

- **Contacts (Shared):** CRUD, bulk import (CSV/Excel), export, avatar, segments CRUD + segment membership.
- **WhatsApp:** embedded signup / WABA setup, phone-number sync + status + rename, webhook re-register, templates CRUD + sync + media upload, auto-replies, embeddable widget + `/widgets/whatsapp/{key}.js`.
- **Broadcasting:** campaigns CRUD, audience preview, draft, test-send, launch, pause; AI email generate / subject improve; SMS gateways; email server (SMTP) + test.
- **Inbox:** conversation list/detail, reply, upload/serve media, start conversation, assign, status, typing (realtime), notes, AI handover, canned replies, labels, share product.
- **Automation:** workflow CRUD, AI-generate workflow, runs history, test, trigger token.
- **AI:** provider configs, knowledge bases + document upload/reindex (embeddings), chatbots CRUD + playground.
- **Leads:** list, scrape job, push-to-contacts, delete.
- **Ecommerce:** stores CRUD + test/sync, OAuth (Shopify/BigCommerce/WooCommerce), products, orders (fulfill/refresh/refund), per-contact orders.
- **Social:** account connect/callback per network, posts CRUD, schedule/publish/cancel, AI generate/plan, bulk, calendar.
- **Billing:** plans, subscriptions, Stripe checkout + webhooks, invoices, coupons, tax, usage metering.
- **Admin:** clients, plans, roles/permissions, CMS pages, support tickets, system settings, audit log, translations.

---

## 4. Phased delivery

| Phase | Deliverable | Notes |
|---|---|---|
| **0 — Foundation** | Next.js app scaffold, Prisma schema (all tables), Auth.js + RBAC + multi-tenant scoping, S3, BullMQ+Redis, Pusher/Soketi, Stripe/webhook plumbing, ported design system + layout shell | Unblocks everything. No feature value yet. |
| **1 — Client MVP** | Dashboard, Contacts + import/segments, WhatsApp Cloud API connect + templates, Broadcasting (campaigns/launch), Inbox (realtime reply), Campaign analytics, Roles (Admin/Staff) | **First shippable to the cookery client.** |
| **2 — Professional** | Leads/pipeline, Reminders, Ecommerce catalog+orders, Reports/exports, Internal notes, Notification center (web push/email), Canned replies + labels | |
| **3 — Automation** | Visual workflow builder + runner (BullMQ), auto-replies, smart segments, scheduled/triggered workflows | |
| **4 — AI** | Provider configs, knowledge base (pgvector embeddings), chatbots + playground, AI content/campaign generation, AI handover in inbox | |
| **5 — Enterprise / SaaS** | Multi-tenant billing (Stripe plans/subscriptions/coupons/usage), Social publishing, Integrations, Admin console, CMS, support desk | Turns it into a resellable product. |

---

## 5. Key risks / decisions to nail early
- **Realtime:** Vercel serverless can't hold WebSocket connections → use hosted Pusher or a separately-deployed Soketi. Decide hosting for realtime + workers (likely a Node host: Railway/Render/Fly, not pure Vercel).
- **Workers:** BullMQ needs a long-running process; Next.js API routes can't host it. Separate `workers/` deployment.
- **WhatsApp Cloud API:** official Meta Graph API + webhook verification; strict template + 24-hour-window rules. Port the WABA webhook-verify-token hashing from WhatsMine.
- **AI embeddings:** enable `pgvector` on Postgres (Neon/Supabase support it).
- **Effort:** full port of ~10 modules + billing + admin is a multi-month build. Phase 0–1 is the critical path to first client revenue.
