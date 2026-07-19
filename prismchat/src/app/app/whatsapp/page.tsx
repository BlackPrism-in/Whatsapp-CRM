import { requireWorkspace } from "@/lib/session";
import { getWaba } from "@/modules/whatsapp/queries";
import { WhatsappTabs } from "@/components/whatsapp/WhatsappTabs";
import { ConnectWabaForm } from "@/components/whatsapp/ConnectWabaForm";
import { SyncPhoneNumbersButton, DisconnectWabaButton } from "@/components/whatsapp/WabaActions";

export default async function WhatsappSetupPage() {
  const { workspace } = await requireWorkspace();
  const waba = await getWaba(workspace.id);
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
            receive messages. You&apos;ll need your WABA ID and a permanent
            System User access token.
          </div>
          <ConnectWabaForm />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-brand-500" />
                <span className="font-medium">{waba.name ?? "WhatsApp Business Account"}</span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">
                  {waba.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">WABA ID: {waba.wabaId}</p>
            </div>
            <div className="flex gap-2">
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
