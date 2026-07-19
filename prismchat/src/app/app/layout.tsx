import { requireUser, getActiveWorkspace } from "@/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const ctx = await getActiveWorkspace();
  if (!ctx) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          workspaceName={ctx.workspace.name}
          userName={user.name}
          role={ctx.role}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
