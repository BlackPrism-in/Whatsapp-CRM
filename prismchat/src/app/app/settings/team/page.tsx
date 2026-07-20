import { requireWorkspace, getCurrentUser } from "@/lib/session";
import { listTeam } from "@/modules/team/actions";
import { InviteForm } from "@/components/team/InviteForm";
import { RevokeInviteButton, MemberControls } from "@/components/team/TeamActions";

export default async function TeamPage() {
  const { role } = await requireWorkspace();
  const me = await getCurrentUser();
  const { members, invites } = await listTeam();
  const isAdmin = role === "admin";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-muted">
          Access is invite-only. Admins add teammates, who receive an email to set
          their password.
        </p>
      </div>

      {isAdmin && <InviteForm />}

      <div className="rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-3 font-medium">
          Members ({members.length})
        </h2>
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <div className="font-medium">{m.user.name}</div>
                <div className="truncate text-sm text-muted">{m.user.email}</div>
              </div>
              {isAdmin ? (
                <MemberControls userId={m.userId} role={m.role} isSelf={m.userId === me?.id} />
              ) : (
                <span className="text-sm capitalize text-muted">{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAdmin && invites.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 font-medium">
            Pending invites ({invites.length})
          </h2>
          <div className="divide-y divide-border">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.email}</div>
                  <div className="text-sm text-muted">
                    {i.role} · expires {i.expiresAt.toLocaleDateString()}
                  </div>
                </div>
                <RevokeInviteButton id={i.id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
