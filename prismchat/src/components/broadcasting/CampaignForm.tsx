"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createCampaign, previewAudience, type CampaignState } from "@/modules/broadcasting/actions";
import { Field, inputClass } from "@/components/ui/Field";

type Option = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create campaign"}
    </button>
  );
}

export function CampaignForm({
  templates,
  segments,
  tags,
}: {
  templates: Option[];
  segments: Option[];
  tags: Option[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"all" | "segments" | "tags">("all");
  const [count, setCount] = useState<number | null>(null);
  const [previewing, startPreview] = useTransition();
  const [state, action] = useActionState<CampaignState, FormData>(createCampaign, undefined);

  useEffect(() => {
    if (state?.ok && state.id) router.push(`/app/broadcasts/${state.id}`);
  }, [state, router]);

  function runPreview() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    startPreview(async () => {
      const res = await previewAudience(fd);
      setCount(res.count);
    });
  }

  return (
    <form ref={formRef} action={action} className="max-w-2xl space-y-5">
      <Field label="Campaign name" htmlFor="name">
        <input id="name" name="name" placeholder="Diwali cake class promo" className={inputClass} />
      </Field>

      <Field label="Template" htmlFor="templateId">
        {templates.length === 0 ? (
          <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-900">
            No templates yet. Create one under WhatsApp → Templates first.
          </p>
        ) : (
          <select id="templateId" name="templateId" className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose a template…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Audience</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {(["all", "segments", "tags"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input
                type="radio"
                name="audienceMode"
                value={m}
                checked={mode === m}
                onChange={() => {
                  setMode(m);
                  setCount(null);
                }}
              />
              {m === "all" ? "All opted-in contacts" : m === "segments" ? "By segment" : "By tag"}
            </label>
          ))}
        </div>

        {mode === "segments" && (
          <div className="rounded-lg border border-border p-3">
            {segments.length === 0 ? (
              <p className="text-sm text-muted">No segments yet.</p>
            ) : (
              segments.map((s) => (
                <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" name="segmentIds" value={s.id} onChange={() => setCount(null)} />
                  {s.name}
                </label>
              ))
            )}
          </div>
        )}

        {mode === "tags" && (
          <div className="rounded-lg border border-border p-3">
            {tags.length === 0 ? (
              <p className="text-sm text-muted">No tags yet.</p>
            ) : (
              tags.map((t) => (
                <label key={t.id} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" name="tagIds" value={t.id} onChange={() => setCount(null)} />
                  {t.name}
                </label>
              ))
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing}
            className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle disabled:opacity-60"
          >
            {previewing ? "Counting…" : "Preview audience"}
          </button>
          {count !== null && (
            <span className="text-sm">
              <b className="text-brand-700">{count}</b> opted-in contact{count === 1 ? "" : "s"} will receive this.
            </span>
          )}
        </div>
      </fieldset>

      <Field label="Schedule (optional — leave blank to send on launch)" htmlFor="scheduledAt">
        <input id="scheduledAt" name="scheduledAt" type="datetime-local" className={inputClass} />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
