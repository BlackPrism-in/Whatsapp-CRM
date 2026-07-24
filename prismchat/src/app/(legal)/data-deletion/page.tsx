import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — PrismChat",
  description:
    "How to delete your data from PrismChat, including WhatsApp Business data.",
};

const UPDATED = "24 July 2026";

export default function DataDeletionPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Data Deletion Instructions</h1>
      <p className="text-sm">Last updated: {UPDATED}</p>

      <p>
        You can remove your data from PrismChat at any time. Choose the option
        that matches what you want deleted.
      </p>

      <h2>Option 1 — Disconnect your WhatsApp Business Account</h2>
      <p>
        Removes the link between PrismChat and your WhatsApp Business Account,
        including the stored access token. PrismChat immediately loses all
        access; no further messages can be sent or received.
      </p>
      <ul>
        <li>Sign in to PrismChat</li>
        <li>Go to <strong>WhatsApp → Setup</strong></li>
        <li>Click <strong>Disconnect</strong></li>
      </ul>
      <p>
        This deletes the stored credentials, WhatsApp Business Account record and
        associated phone numbers. Your WhatsApp Business Account itself is
        unaffected and remains yours.
      </p>

      <h2>Option 2 — Delete individual records</h2>
      <p>Inside the app you can delete data yourself at any time:</p>
      <ul>
        <li><strong>Contacts</strong> — delete a contact and its notes</li>
        <li><strong>Inbox</strong> — conversations and messages</li>
        <li><strong>Leads, Products, Reminders</strong> — delete individually</li>
        <li><strong>Team</strong> — remove members or revoke pending invitations</li>
      </ul>

      <h2>Option 3 — Delete your entire account and workspace</h2>
      <p>
        To erase everything — your workspace, all users, contacts, conversations,
        messages, campaigns and WhatsApp credentials — email us:
      </p>
      <ul>
        <li>
          Send a request to{" "}
          <a href="mailto:sandeep@blackprism.in" className="text-brand-600 underline">
            sandeep@blackprism.in
          </a>{" "}
          from the email address registered on your account
        </li>
        <li>Use the subject line: <strong>Data Deletion Request</strong></li>
        <li>Include your workspace name</li>
      </ul>
      <p>
        We verify the request comes from an account owner, then permanently
        delete the data within <strong>30 days</strong> and confirm by email.
        Encrypted backups are purged on a rolling schedule within{" "}
        <strong>90 days</strong>.
      </p>

      <h2>If you are a customer of a business using PrismChat</h2>
      <p>
        If a business messaged you through PrismChat and you want your data
        removed, contact that business directly — they control their contact
        list and can delete you from it. If you cannot reach them, email us with
        the business name and the phone number involved and we will pass the
        request on.
      </p>

      <h2>What we may retain</h2>
      <p>
        We may keep limited records where legally required (for example billing
        records) or in anonymised, non-identifying form for aggregate statistics.
      </p>

      <h2>Contact</h2>
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
