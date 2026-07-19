"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { launchCampaign, pauseCampaign, deleteCampaign } from "@/modules/broadcasting/actions";

export function CampaignActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canLaunch = status === "draft" || status === "scheduled" || status === "paused";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canLaunch && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await launchCampaign(id);
              if (res?.error) setError(res.error);
              else router.refresh();
            })
          }
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Launching…" : status === "paused" ? "Resume" : "Launch now"}
        </button>
      )}
      {status === "sending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await pauseCampaign(id); router.refresh(); })}
          className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle"
        >
          Pause
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this campaign?")) return;
          start(async () => { await deleteCampaign(id); router.push("/app/broadcasts"); });
        }}
        className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger transition hover:bg-danger/10"
      >
        Delete
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
