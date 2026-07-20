import { requireWorkspace } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listReminders } from "@/modules/reminders/actions";
import { REMINDER_TYPES } from "@/modules/reminders/constants";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { ReminderActions } from "@/components/reminders/ReminderActions";
import { cn } from "@/lib/utils";

const typeLabel = Object.fromEntries(REMINDER_TYPES.map((t) => [t.value, t.label]));

export default async function RemindersPage() {
  const { workspace } = await requireWorkspace();
  const [{ pending, completed }, contactRows] = await Promise.all([
    listReminders(workspace.id),
    prisma.contact.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, phoneE164: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const contacts = contactRows.map((c) => ({
    id: c.id,
    name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.phoneE164 || "Unknown",
  }));

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted">
          {pending.length} open · follow-ups, birthdays, classes and orders
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReminderForm contacts={contacts} />

        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
              Nothing due. Add a reminder to stay on top of follow-ups.
            </p>
          ) : (
            pending.map((r) => {
              const overdue = r.dueAt < now;
              const name = r.contact
                ? [r.contact.firstName, r.contact.lastName].filter(Boolean).join(" ") ||
                  r.contact.phoneE164
                : null;
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-start justify-between gap-4 rounded-xl border bg-surface p-4",
                    overdue ? "border-danger/50" : "border-border",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface-subtle px-2 py-0.5 text-xs">
                        {typeLabel[r.type] ?? r.type}
                      </span>
                      <span className="font-medium">{r.title}</span>
                      {overdue && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Due {r.dueAt.toLocaleString()}
                      {name ? ` · ${name}` : ""}
                    </p>
                    {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
                  </div>
                  <ReminderActions id={r.id} done={false} />
                </div>
              );
            })
          )}

          {completed.length > 0 && (
            <div className="rounded-xl border border-border bg-surface">
              <h2 className="border-b border-border px-4 py-2 text-sm font-medium text-muted">
                Recently completed
              </h2>
              <div className="divide-y divide-border">
                {completed.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-2">
                    <span className="truncate text-sm text-muted line-through">{r.title}</span>
                    <ReminderActions id={r.id} done />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
