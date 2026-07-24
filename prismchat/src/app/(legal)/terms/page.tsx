import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — PrismChat",
  description: "The terms governing use of the PrismChat platform.",
};

const UPDATED = "24 July 2026";

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-sm">Last updated: {UPDATED}</p>

      <p>
        These terms govern your use of PrismChat, operated by{" "}
        <strong>BlackPrism Private Limited</strong>. By using the service you
        agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        PrismChat is a customer-engagement platform that connects to the official
        WhatsApp Business Platform, letting businesses manage contacts, run
        message campaigns, and handle customer conversations from a shared
        inbox.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>Access is invite-only; workspace admins create accounts for their team</li>
        <li>You are responsible for keeping your credentials secure and for activity under your account</li>
        <li>You must provide accurate information and be authorised to act for your business</li>
      </ul>

      <h2>3. Your WhatsApp Business Account</h2>
      <ul>
        <li>
          You retain ownership of your WhatsApp Business Account. Connecting it
          grants PrismChat permission to act on your behalf, and you may revoke
          this at any time by disconnecting.
        </li>
        <li>
          You are responsible for complying with{" "}
          <a
            href="https://www.whatsapp.com/legal/business-policy/"
            className="text-brand-600 underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            WhatsApp&apos;s Business Policy
          </a>{" "}
          and Commerce Policy.
        </li>
        <li>
          Meta bills you directly for messages sent through your account.
          Per-message charges are not included in PrismChat fees.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You must not use PrismChat to:</p>
      <ul>
        <li>Send messages to people who have not opted in to hear from you</li>
        <li>Send spam, scams, phishing, or misleading content</li>
        <li>Send unlawful, harassing, hateful or infringing material</li>
        <li>Upload contact lists you do not have permission to message</li>
        <li>Attempt to breach, overload or reverse-engineer the service</li>
        <li>Resell or sublicense the service without our written agreement</li>
      </ul>
      <p>
        <strong>You are responsible for obtaining opt-in consent</strong> from
        every contact you message. Violations can get your WhatsApp number
        rate-limited or banned by Meta — an outcome we cannot reverse.
      </p>

      <h2>5. Your data</h2>
      <p>
        You retain ownership of your contacts, messages and content. We process
        it only to provide the service, as described in our{" "}
        <a href="/privacy" className="text-brand-600 underline">Privacy Policy</a>.
        You can export or request deletion at any time.
      </p>

      <h2>6. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service.
        PrismChat depends on third parties — notably Meta&apos;s WhatsApp Business
        Platform — and outages or policy changes on their side may affect it.
        Maintenance may cause brief interruptions.
      </p>

      <h2>7. Fees</h2>
      <p>
        Fees, if applicable, are agreed separately in writing. Third-party costs
        (Meta message charges, hosting billed to you) are your responsibility.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using PrismChat at any time. We may suspend or terminate
        access for breach of these terms, unlawful use, or non-payment. On
        termination you may export your data for 30 days, after which it may be
        deleted.
      </p>

      <h2>9. Liability</h2>
      <p>
        The service is provided &quot;as is&quot;. To the maximum extent
        permitted by law, we are not liable for indirect, incidental or
        consequential loss, including lost profits, lost business, or damages
        arising from message delivery failures, account restrictions imposed by
        Meta, or third-party outages.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of India, with exclusive
        jurisdiction in the courts of West Bengal.
      </p>

      <h2>11. Contact</h2>
      <p>
        BlackPrism Private Limited
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
