import { Resend } from "resend";

// Transactional email. Uses Resend when RESEND_API_KEY is set; in development
// without a key it logs the message so invite links are still usable locally.
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM =
  process.env.MAIL_FROM_ADDRESS && process.env.MAIL_FROM_NAME
    ? `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`
    : "PrismChat <onboarding@resend.dev>";

export type SendMailResult = { ok: boolean; error?: string; devFallback?: boolean };

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendMailResult> {
  if (!resend) {
    console.log(
      `\n[mail:dev] To: ${opts.to}\n[mail:dev] Subject: ${opts.subject}\n[mail:dev] ${opts.text ?? opts.html}\n`,
    );
    return { ok: true, devFallback: true };
  }

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}

/** Branded password-reset email with a one-time link. */
export function resetPasswordEmail(opts: { url: string }) {
  const { url } = opts;
  return {
    subject: "Reset your PrismChat password",
    text: `We received a request to reset your PrismChat password.\n\nReset it here (expires in 1 hour):\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
          <div style="width:32px;height:32px;border-radius:8px;background:#467235;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold">P</div>
          <strong style="font-size:18px">PrismChat</strong>
        </div>
        <h1 style="font-size:20px;margin:0 0 8px">Reset your password</h1>
        <p style="color:#5f6b52;line-height:1.5">
          We received a request to reset your PrismChat password. Click below to
          choose a new one.
        </p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#467235;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">
            Reset password
          </a>
        </p>
        <p style="color:#5f6b52;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </div>
    `,
  };
}

/** Branded invite email with a one-time link to set a password. */
export function inviteEmail(opts: {
  inviterName: string;
  workspaceName: string;
  url: string;
}) {
  const { inviterName, workspaceName, url } = opts;
  return {
    subject: `You've been invited to ${workspaceName} on PrismChat`,
    text: `${inviterName} invited you to join ${workspaceName} on PrismChat.\n\nSet your password and get started:\n${url}\n\nThis link expires in 7 days.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
          <div style="width:32px;height:32px;border-radius:8px;background:#467235;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold">P</div>
          <strong style="font-size:18px">PrismChat</strong>
        </div>
        <h1 style="font-size:20px;margin:0 0 8px">You're invited to ${workspaceName}</h1>
        <p style="color:#5f6b52;line-height:1.5">
          ${inviterName} has invited you to join <strong>${workspaceName}</strong> on PrismChat.
          Click below to set your password and sign in.
        </p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#467235;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">
            Set your password
          </a>
        </p>
        <p style="color:#5f6b52;font-size:13px">This link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  };
}
