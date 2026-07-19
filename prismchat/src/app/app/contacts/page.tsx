import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { listContacts, listWorkspaceTags } from "@/modules/contacts/queries";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [data, tags] = await Promise.all([
    listContacts({ workspaceId: workspace.id, search: sp.q, tagId: sp.tag, page }),
    listWorkspaceTags(workspace.id),
  ]);

  const displayName = (c: (typeof data.items)[number]) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted">{data.total} total</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/contacts/import"
            className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle"
          >
            Import CSV
          </Link>
          <Link
            href="/app/contacts/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Add contact
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2" action="/app/contacts">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search name, phone, email…"
          className="w-64 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        {tags.length > 0 && (
          <select
            name="tag"
            defaultValue={sp.tag ?? ""}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <button className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle">
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No contacts yet. Add one or import a CSV to get started.
                </td>
              </tr>
            ) : (
              data.items.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/app/contacts/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {displayName(c)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.phoneE164 ?? "—"}</td>
                  <td className="px-4 py-3">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t.tagId}
                          className="rounded-full px-2 py-0.5 text-xs"
                          style={{ backgroundColor: `${t.tag.color}22`, color: t.tag.color }}
                        >
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/app/contacts/${c.id}/edit`} className="text-brand-600 hover:underline">
                        Edit
                      </Link>
                      <DeleteContactButton id={c.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {data.page} of {data.pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/app/contacts?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.tag ? { tag: sp.tag } : {}), page: String(page - 1) })}`}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-subtle"
              >
                Previous
              </Link>
            )}
            {page < data.pageCount && (
              <Link
                href={`/app/contacts?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.tag ? { tag: sp.tag } : {}), page: String(page + 1) })}`}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-subtle"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
