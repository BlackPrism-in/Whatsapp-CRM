import { requireWorkspace } from "@/lib/session";
import { getWaba } from "@/modules/whatsapp/queries";
import { WhatsappTabs } from "@/components/whatsapp/WhatsappTabs";
import { ConnectWhatsAppButton } from "@/components/whatsapp/ConnectWhatsAppButton";
import {
  SyncPhoneNumbersButton,
  DisconnectWabaButton,
  CheckConnectionButton,
} from "@/components/whatsapp/WabaActions";

export default async function WhatsappSetupPage() {
  const { workspace } = await requireWorkspace();
  const waba = await getWaba(workspace.id);
  // Token health drives the reconnect banner — see modules/whatsapp/token-health.
  const needsReconnect =
    waba?.status === "token_invalid" || waba?.status === "credentials_unreadable";
  const isCoexistence = waba?.onboardingMode === "coexistence" || waba?.isOnBizApp;
  const statusLabel = needsReconnect ? "needs reconnect" : waba?.status ?? "";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-muted">
          Connect your WhatsApp Business account via the official Meta Cloud API.
        </p>
      </div>

      <WhatsappTabs />

      {!waba ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
            Connect your Meta WhatsApp Business Account to send broadcasts and
            receive messages. You&apos;ll sign in with the Facebook account that
            manages your business — no tokens to copy or paste. If you already
            use the WhatsApp Business app, you can keep using it after
            connecting.
          </div>
          <ConnectWhatsAppButton />
        </div>
      ) : (
        <div className="space-y-6">
          {needsReconnect && (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-5">
              <h2 className="font-medium text-danger">
                WhatsApp needs to be reconnected
              </h2>
              <p className="mt-1 text-sm text-muted">
                Messages and broadcasts will not send until you reconnect.
              </p>
              {waba.lastError && (
                <p className="mt-2 rounded bg-surface-subtle px-3 py-2 font-mono text-xs text-muted">
                  {waba.lastError}
                </p>
              )}
              <div className="mt-4">
                <ConnectWhatsAppButton />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-5">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    needsReconnect ? "bg-danger" : "bg-brand-500"
                  }`}
                />
                <span className="font-medium">{waba.name ?? "WhatsApp Business Account"}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    needsReconnect
                      ? "bg-danger/15 text-danger"
                      : "bg-brand-100 text-brand-800"
                  }`}
                >
                  {statusLabel}
                </span>
                {isCoexistence && (
                  <span
                    className="rounded-full bg-accent-200 px-2 py-0.5 text-xs text-accent-900"
                    title="Your WhatsApp Business app keeps working alongside PrismChat"
                  >
                    coexistence
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">
                WABA ID: {waba.wabaId}
                {waba.lastVerifiedAt && !needsReconnect
                  ? ` · verified ${waba.lastVerifiedAt.toLocaleString()}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CheckConnectionButton />
              <SyncPhoneNumbersButton />
              <DisconnectWabaButton />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-medium">Phone numbers</h2>
            {waba.phoneNumbers.length === 0 ? (
              <p className="text-sm text-muted">
                No phone numbers synced yet. Click &quot;Sync phone numbers&quot;.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-2 font-medium">Number</th>
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {waba.phoneNumbers.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2">{p.displayNumber}</td>
                      <td className="py-2">{p.name ?? "—"}</td>
                      <td className="py-2">{p.status ?? "—"}</td>
                      <td className="py-2">{p.qualityRating ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-2 font-medium">Webhook</h2>
            <p className="text-muted">
              Configure this callback URL in your Meta app&apos;s WhatsApp webhook
              settings:
            </p>
            <code className="mt-2 block break-all rounded bg-surface-subtle px-3 py-2 text-xs">
              {appUrl}/api/webhooks/whatsapp
            </code>
            <p className="mt-2 text-muted">
              Verify token:{" "}
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs">
                {waba.webhookVerifyToken}
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
