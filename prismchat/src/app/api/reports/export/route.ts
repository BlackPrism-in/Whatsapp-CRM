import { requireWorkspace } from "@/lib/session";
import { getReports } from "@/modules/reports/queries";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Campaign performance export as CSV. */
export async function GET() {
  const { workspace } = await requireWorkspace();
  const report = await getReports(workspace.id);

  const header = [
    "Campaign",
    "Status",
    "Recipients",
    "Sent",
    "Delivered",
    "Read",
    "Replied",
    "Failed",
    "Created",
  ];
  const rows = report.campaigns.map((c) => [
    c.name,
    c.status,
    c.totalRecipients,
    c.sentCount,
    c.deliveredCount,
    c.readCount,
    c.repliedCount,
    c.failedCount,
    c.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const filename = `prismchat-campaigns-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
