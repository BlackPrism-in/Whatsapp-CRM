"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadFacebookSdk, listenForEmbeddedSignupEvent } from "@/lib/facebook-sdk";
import { connectEmbeddedSignup } from "@/modules/whatsapp/actions";

type Status = "idle" | "opening" | "waiting" | "connecting" | "error";

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;
const GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? "v21.0";

/**
 * One-click WhatsApp connect via Meta Embedded Signup. Replaces manual
 * WABA-ID/token entry entirely — this is PrismChat's only connection path.
 */
export function ConnectWhatsAppButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const misconfigured = !APP_ID || !CONFIG_ID;

  async function handleClick() {
    setError(null);

    if (misconfigured) {
      setError(
        "WhatsApp connect is not configured on this deployment (missing App ID or Configuration ID).",
      );
      setStatus("error");
      return;
    }

    setStatus("opening");
    try {
      await loadFacebookSdk(APP_ID, GRAPH_VERSION);
    } catch {
      setError("Could not load Facebook's sign-in. Check your connection and try again.");
      setStatus("error");
      return;
    }

    if (!window.FB?.login) {
      setError("Facebook's sign-in did not load correctly. Please retry.");
      setStatus("error");
      return;
    }

    // Meta requires HTTPS for FB.login — on a plain-http origin (e.g. local
    // dev) it logs an error internally and never calls our callback. Fail
    // fast with a clear message instead of hanging on "Waiting for Meta…".
    if (window.location.protocol !== "https:") {
      setError(
        "WhatsApp connect requires HTTPS. This won't complete on a plain-http address — try it on the deployed site.",
      );
      setStatus("error");
      return;
    }

    // Meta sends the WABA/phone IDs via postMessage; FB.login's own callback
    // only carries the OAuth code. Both are needed, so we listen for both.
    let sessionInfo: { wabaId?: string; phoneNumberId?: string; event?: string } = {};
    let settled = false;

    const stopListening = listenForEmbeddedSignupEvent((msg) => {
      if (msg.event === "CANCEL") {
        settled = true;
        setStatus("idle");
        stopListening();
        return;
      }
      if (msg.event === "ERROR") {
        settled = true;
        setError("Meta reported an error during signup. Please try again.");
        setStatus("error");
        stopListening();
        return;
      }
      sessionInfo = {
        wabaId: msg.data?.waba_id,
        phoneNumberId: msg.data?.phone_number_id,
        event: msg.event,
      };
    });

    // Watchdog: if neither FB.login's callback nor a postMessage event ever
    // arrives (popup blocked, network issue, silent SDK failure), don't leave
    // the button stuck on "Waiting for Meta…" forever.
    const watchdog = setTimeout(() => {
      if (settled) return;
      settled = true;
      stopListening();
      setError(
        "Meta didn't respond. Check that pop-ups are allowed for this site, then try again.",
      );
      setStatus("error");
    }, 90_000);

    setStatus("waiting");
    window.FB.login(
      // Meta's SDK rejects an AsyncFunction here (it checks the callback
      // constructor rather than merely calling it). Keep this callback
      // synchronous and run the server action in a detached async task.
      function onFacebookLogin(response) {
        void (async () => {
          if (settled) return; // watchdog already fired
          clearTimeout(watchdog);

          const code = response.authResponse?.code;
          if (!code) {
            settled = true;
            stopListening();
            // A cancelled/closed popup with no CANCEL message yet — not an error.
            setStatus((s) => (s === "error" ? s : "idle"));
            return;
          }

          if (!sessionInfo.wabaId) {
            settled = true;
            stopListening();
            setError(
              "Signed in, but Meta did not report a WhatsApp Business Account. Please try again.",
            );
            setStatus("error");
            return;
          }

          setStatus("connecting");
          try {
            const result = await connectEmbeddedSignup({
              code,
              wabaId: sessionInfo.wabaId,
              phoneNumberId: sessionInfo.phoneNumberId,
              event: sessionInfo.event,
            });
            settled = true;
            stopListening();

            if (result?.error) {
              setError(result.error);
              setStatus("error");
              return;
            }

            setStatus("idle");
            router.refresh();
          } catch {
            settled = true;
            stopListening();
            setError("Could not finish the WhatsApp connection. Please try again.");
            setStatus("error");
          }
        })();
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }

  const busy = status === "opening" || status === "waiting" || status === "connecting";
  const label =
    status === "opening"
      ? "Opening Meta…"
      : status === "waiting"
        ? "Waiting for Meta…"
        : status === "connecting"
          ? "Connecting…"
          : "Connect WhatsApp";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || misconfigured}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {label}
      </button>
      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      {misconfigured && !error && (
        <p className="text-sm text-muted">
          Set <code>NEXT_PUBLIC_META_APP_ID</code> and{" "}
          <code>NEXT_PUBLIC_META_CONFIG_ID</code> to enable this.
        </p>
      )}
    </div>
  );
}
