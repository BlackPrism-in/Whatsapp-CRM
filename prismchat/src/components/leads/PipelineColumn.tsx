"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLeadStage } from "@/modules/leads/actions";
import { LeadCard } from "./LeadCard";
import type { LeadCard as LeadCardType } from "@/modules/leads/queries";
import { cn } from "@/lib/utils";

export function PipelineColumn({
  label,
  value,
  leads,
}: {
  label: string;
  value: string;
  leads: LeadCardType[];
}) {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [, start] = useTransition();

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/lead-id");
        if (!id) return;
        start(async () => {
          await moveLeadStage(id, value);
          router.refresh();
        });
      }}
      className={cn(
        "flex min-w-[240px] flex-1 flex-col rounded-xl border bg-surface p-3 transition",
        over ? "border-brand-500 bg-surface-subtle" : "border-border",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
          {leads.length}
        </span>
      </div>

      <div className="space-y-2">
        {leads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
            Drop leads here
          </p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  );
}
