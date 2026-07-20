"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLeadStage, deleteLead, convertLeadToContact } from "@/modules/leads/actions";
import { LEAD_STAGES } from "@/modules/leads/schema";
import type { LeadCard as LeadCardType } from "@/modules/leads/queries";

export function LeadCard({ lead }: { lead: LeadCardType }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const title = lead.name || lead.phone || lead.email || "Untitled lead";

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)}
      className="cursor-grab rounded-lg border border-border bg-background p-3 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-tight">{title}</span>
        {lead.score > 0 && (
          <span className="shrink-0 rounded-full bg-accent-200 px-1.5 py-0.5 text-[10px] font-medium text-accent-900">
            {lead.score}
          </span>
        )}
      </div>

      {lead.company && <p className="mt-0.5 text-xs text-muted">{lead.company}</p>}
      {lead.phone && <p className="mt-1 text-xs text-muted">{lead.phone}</p>}
      {lead.email && <p className="text-xs text-muted">{lead.email}</p>}
      {lead.source && (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">{lead.source}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          aria-label="Move stage"
          value={lead.status}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              await moveLeadStage(lead.id, e.target.value);
              router.refresh();
            })
          }
          className="rounded border border-border bg-surface px-1.5 py-1 text-xs"
        >
          {LEAD_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {lead.status !== "converted" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await convertLeadToContact(lead.id);
                if (res?.error) setError(res.error);
                else router.refresh();
              })
            }
            className="text-xs text-brand-600 hover:underline disabled:opacity-50"
          >
            Convert
          </button>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this lead?")) return;
            start(async () => {
              await deleteLead(lead.id);
              router.refresh();
            });
          }}
          className="text-xs text-danger hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
