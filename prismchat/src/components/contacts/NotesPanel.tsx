"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { addContactNote, deleteContactNote, type NoteState } from "@/modules/contacts/notes";
import { inputClass } from "@/components/ui/Field";

type Note = {
  id: string;
  body: string;
  createdAt: Date;
  user: { name: string };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add note"}
    </button>
  );
}

function DeleteNote({ id, contactId }: { id: string; contactId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await deleteContactNote(id, contactId); router.refresh(); })}
      className="text-xs text-danger hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}

export function NotesPanel({ contactId, notes }: { contactId: string; notes: Note[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = addContactNote.bind(null, contactId);
  const [state, formAction] = useActionState<NoteState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-medium">Internal notes</h2>

      <form ref={formRef} action={formAction} className="mb-4 space-y-2">
        <textarea
          name="body"
          rows={2}
          placeholder="Staff-only note about this customer…"
          className={inputClass}
        />
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton />
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg bg-surface-subtle p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{n.body}</p>
                <DeleteNote id={n.id} contactId={contactId} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {n.user.name} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
