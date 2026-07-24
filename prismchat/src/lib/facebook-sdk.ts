"use client";

/**
 * Minimal loader for the Facebook JavaScript SDK, used only for Embedded
 * Signup. Loaded lazily (not in <head>) so pages that don't need WhatsApp
 * connect never pay for it.
 */

declare global {
  interface Window {
    FB?: {
      init: (opts: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadFacebookSdk(appId: string, graphVersion = "v21.0"): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK can only load in the browser"));
  }
  if (window.FB) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Failed to load the Facebook SDK"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

/** Shape of the postMessage event Meta's Embedded Signup popup sends. */
export type EmbeddedSignupSessionEvent = {
  type: "WA_EMBEDDED_SIGNUP";
  event: "FINISH" | "FINISH_ONLY_WABA" | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" | "CANCEL" | "ERROR";
  data?: {
    waba_id?: string;
    phone_number_id?: string;
    business_id?: string;
    current_step?: string;
  };
};

/**
 * Listen once for the Embedded Signup session-info message. Meta posts this
 * from the popup while `FB.login`'s own callback only carries the OAuth code.
 * Cleans itself up on the first FINISH, CANCEL or ERROR event, or on timeout.
 */
export function listenForEmbeddedSignupEvent(
  onEvent: (event: EmbeddedSignupSessionEvent) => void,
  timeoutMs = 5 * 60 * 1000,
): () => void {
  function handler(message: MessageEvent) {
    if (!message.origin.endsWith("facebook.com")) return;
    try {
      const data = JSON.parse(message.data);
      if (data.type === "WA_EMBEDDED_SIGNUP") {
        onEvent(data as EmbeddedSignupSessionEvent);
      }
    } catch {
      // Not JSON — Meta posts other message types on the same channel; ignore.
    }
  }

  window.addEventListener("message", handler);
  const timeout = setTimeout(() => window.removeEventListener("message", handler), timeoutMs);

  return () => {
    window.removeEventListener("message", handler);
    clearTimeout(timeout);
  };
}
