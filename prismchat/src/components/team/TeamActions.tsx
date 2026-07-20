"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeInvite, removeMember, changeMemberRole } from "@/modules/team/actions";

export function RevokeInviteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await revokeInvite(id); router.refresh(); })}
      className="text-sm text-danger hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Revoke"}
    </button>
  );
}

export function MemberControls({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (isSelf) {
    return <span className="text-sm capitalize text-muted">{role} (you)</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <select
        aria-label="Role"
        value={role}
        disabled={pending}
        onChange={(e) =>
          start(async () => { await changeMemberRole(userId, e.target.value); router.refresh(); })
        }
        className="rounded border border-border bg-surface px-2 py-1 text-sm"
      >
        <option value="staff">Staff</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Remove this member from the workspace?")) return;
          start(async () => { await removeMember(userId); router.refresh(); });
        }}
        className="text-sm text-danger hover:underline disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
