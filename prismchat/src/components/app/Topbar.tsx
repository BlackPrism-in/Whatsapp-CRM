import { logoutAction } from "@/app/app/actions";

export function Topbar({
  workspaceName,
  userName,
  role,
}: {
  workspaceName: string;
  userName: string;
  role: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div className="text-sm">
        <span className="font-medium">{workspaceName}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm leading-tight">
          <div className="font-medium">{userName}</div>
          <div className="text-xs capitalize text-muted">{role}</div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-surface-subtle"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
