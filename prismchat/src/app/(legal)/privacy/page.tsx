import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PrismChat",
  description:
    "How PrismChat collects, uses, stores and protects data, including WhatsApp Business data.",
};

const UPDATED = "24 July 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm">Last updated: {UPDATED}</p>

      <p>
        PrismChat is a customer-engagement platform operated by{" "}
        <strong>BlackPrism Private Limited</strong> (&quot;we&quot;, &quot;us&quot;).
        It lets businesses manage conversations with their customers over the
        official WhatsApp Business Platform, alongside contacts, campaigns and
        related CRM features. This policy explains what we collect, why, and how
        we protect it.
      </p>

      <h2>1. Who controls the data</h2>
      <p>
        PrismChat is a business-to-business tool. When a business uses PrismChat
        to message its customers, that <strong>business is the data controller</strong>{" "}
        of its customers&apos; data, and we act as a{" "}
        <strong>data processor</strong> on their behalf. For account data of the
        business users themselves, we are the controller.
      </p>

      <h2>2. What we collect</h2>
      <h3>Account data</h3>
      <ul>
        <li>Name, email address and hashed password of each user</li>
        <li>Workspace/business name and role (admin, manager, staff)</li>
        <li>Sign-in timestamps and basic audit records</li>
      </ul>

      <h3>Business content you upload</h3>
      <ul>
        <li>Contacts (name, phone number, email, tags, custom fields, opt-in status)</li>
        <li>Products, leads, reminders and internal notes you create</li>
        <li>Message templates and campaigns you build</li>
      </ul>

      <h3>WhatsApp Business data</h3>
      <p>
        When you connect your WhatsApp Business Account, we access and store only
        what is needed to operate the service:
      </p>
      <ul>
        <li>Your WhatsApp Business Account (WABA) ID, phone numbers and display names</li>
        <li>Message templates and their approval status</li>
        <li>
          Messages sent to and received from your customers, including sender
          phone number, message content, timestamps and delivery status
        </li>
        <li>An access token authorising us to act on your behalf</li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To deliver inbound customer messages to your shared team inbox</li>
        <li>To send replies and approved template messages on your instruction</li>
        <li>To create and sync message templates with Meta for approval</li>
        <li>To report delivery, read and reply statistics back to you</li>
        <li>To send you transactional email (team invitations, password resets)</li>
        <li>To secure the service — rate limiting, abuse prevention, audit logs</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your data, use your customers&apos;
        messages for advertising, or use your data to train machine-learning
        models.
      </p>

      <h2>4. WhatsApp / Meta data</h2>
      <p>
        Our use of information received from Meta APIs adheres to{" "}
        <a
          href="https://developers.facebook.com/terms/dfc_platform_terms/"
          className="text-brand-600 underline"
          target="_blank"
          rel="noreferrer noopener"
        >
          Meta&apos;s Platform Terms
        </a>
        , including the Limited Use requirements. Specifically:
      </p>
      <ul>
        <li>We access a WhatsApp Business Account only after its owner explicitly authorises us</li>
        <li>We use the data solely to provide the messaging features described here</li>
        <li>We do not transfer it to data brokers or advertising networks</li>
        <li>You can disconnect your WhatsApp Business Account from PrismChat at any time, which stops all access</li>
      </ul>

      <h2>5. How we protect it</h2>
      <ul>
        <li>
          <strong>Access tokens are encrypted at rest</strong> using AES-256-GCM;
          they are never displayed back or logged
        </li>
        <li>All traffic is served over HTTPS/TLS</li>
        <li>
          Incoming WhatsApp webhooks are verified using Meta&apos;s{" "}
          <code>X-Hub-Signature-256</code> signature; unsigned or forged requests
          are rejected
        </li>
        <li>
          Each business&apos;s data is isolated to its own workspace and scoped on
          every query
        </li>
        <li>Passwords are hashed with bcrypt; sign-in attempts are rate limited</li>
      </ul>

      <h2>6. Service providers</h2>
      <p>We rely on these processors to run PrismChat:</p>
      <ul>
        <li><strong>Meta Platforms</strong> — WhatsApp Business Platform</li>
        <li><strong>Render</strong> — application hosting</li>
        <li><strong>Supabase</strong> — database hosting</li>
        <li><strong>Redis Cloud</strong> — background job queue</li>
        <li><strong>Cloudflare R2</strong> — media/file storage</li>
        <li><strong>Pusher</strong> — real-time message delivery to the browser</li>
        <li><strong>Resend</strong> — transactional email</li>
      </ul>

      <h2>7. Retention</h2>
      <p>
        We keep your data for as long as your account is active. When you delete
        your workspace, we remove your contacts, conversations, messages and
        WhatsApp credentials. Backups are purged on a rolling schedule. See our{" "}
        <a href="/data-deletion" className="text-brand-600 underline">
          data deletion instructions
        </a>
        .
      </p>

      <h2>8. Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data, and may object to or restrict certain processing. If you are an end
        customer of a business using PrismChat, please contact that business
        first — they control your data. Email us and we will help route it.
      </p>

      <h2>9. Children</h2>
      <p>PrismChat is not intended for anyone under 18.</p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy. Material changes will be communicated by email
        or in-app before they take effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        BlackPrism Private Limited
        <br />
        Jemini Enclave, Kadamtala, Naxalbari, Darjiling
        <br />
        Siliguri, West Bengal 734011, India
        <br />
        Email:{" "}
        <a href="mailto:sandeep@blackprism.in" className="text-brand-600 underline">
          sandeep@blackprism.in
        </a>
      </p>
    </>
  );
}
