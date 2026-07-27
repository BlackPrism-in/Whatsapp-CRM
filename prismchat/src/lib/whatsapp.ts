// Meta WhatsApp Cloud API client (Graph API). Official API only — no unofficial
// automation. Credentials (access token) are per-WABA and decrypted by callers.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type GraphResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      status?: number;
      /** Meta error code, e.g. 130429 (rate limit hit). */
      code?: number;
      /** True when retrying later could plausibly succeed. */
      transient?: boolean;
    };

/**
 * Meta error codes that are worth retrying. Anything not listed is treated as
 * permanent (bad number, template rejected, invalid token) so we don't burn
 * retries on failures that will never succeed.
 */
const TRANSIENT_CODES = new Set([
  4, // Application request limit reached
  80007, // Rate limit issues
  130429, // Cloud API message throughput limit hit
  131056, // (Pair) rate limit — too many messages to the same recipient
  133016, // Temporary account restriction
  1, // API Unknown (usually transient)
  2, // API Service — temporary outage
]);

function classifyError(status: number, code?: number) {
  // 429 = throttled, 5xx = Meta-side problem. Both are worth retrying.
  if (status === 429 || status >= 500) return true;
  return code !== undefined && TRANSIENT_CODES.has(code);
}

async function graph<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<GraphResult<T>> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      // Never cache Graph calls.
      cache: "no-store",
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = json.error as { message?: string; code?: number } | undefined;
      return {
        ok: false,
        error: err?.message ?? `Graph error ${res.status}`,
        status: res.status,
        code: err?.code,
        transient: classifyError(res.status, err?.code),
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    // Network/DNS/timeout — always worth a retry.
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
      transient: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Embedded Signup — OAuth token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange the short-lived `code` returned by Embedded Signup for an access
 * token.
 *
 * Some app configurations reject `redirect_uri` on Embedded Signup codes, so we
 * retry once without it — matches the behaviour of the reference implementation.
 */
export async function exchangeCodeForToken(
  code: string,
): Promise<GraphResult<{ access_token: string }>> {
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: "META_APP_ID / META_APP_SECRET are not configured" };
  }

  const attempt = async (includeRedirect: boolean) => {
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });
    if (includeRedirect && process.env.NEXT_PUBLIC_APP_URL) {
      params.set("redirect_uri", process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""));
    }
    return publicGraph<{ access_token: string }>(`oauth/access_token?${params}`);
  };

  const first = await attempt(true);
  if (first.ok && first.data.access_token) return first;

  const second = await attempt(false);
  if (second.ok && second.data.access_token) return second;
  return second.ok
    ? { ok: false, error: "Meta returned no access_token" }
    : second;
}

/** Upgrade a short-lived token to a long-lived one (~60 days). */
export async function exchangeForLongLivedToken(
  shortToken: string,
): Promise<GraphResult<{ access_token: string }>> {
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: "META_APP_ID / META_APP_SECRET are not configured" };
  }
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  return publicGraph<{ access_token: string }>(`oauth/access_token?${params}`);
}

/** Graph call that carries credentials in the query string, not a Bearer header. */
async function publicGraph<T>(path: string): Promise<GraphResult<T>> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${path}`, { cache: "no-store" });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = json.error as { message?: string; code?: number } | undefined;
      return {
        ok: false,
        error: err?.message ?? `Graph error ${res.status}`,
        status: res.status,
        code: err?.code,
        transient: classifyError(res.status, err?.code),
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
      transient: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Provisioning (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Subscribe our Meta app to a WABA's webhook events.
 *
 * ⚠️ Meta expects the **App Access Token** (`{app_id}|{app_secret}`) as a query
 * parameter here — a Bearer header does not work. Falls back to the user token,
 * which some configurations accept instead.
 *
 * Note: *which* fields are delivered (`messages`, `history`,
 * `smb_app_state_sync`, `smb_message_echoes`) is app-level configuration in the
 * Meta dashboard, not per-WABA.
 */
export async function subscribeAppToWaba(
  wabaId: string,
  userToken: string,
): Promise<GraphResult<{ success: boolean }>> {
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (appId && appSecret) {
    const appToken = `${appId}|${appSecret}`;
    const withAppToken = await postForm<{ success: boolean }>(
      `${wabaId}/subscribed_apps`,
      { access_token: appToken },
    );
    if (withAppToken.ok) return withAppToken;
  }

  // Fallback: the business user's own token.
  return postForm<{ success: boolean }>(`${wabaId}/subscribed_apps`, {
    access_token: userToken,
  });
}

export type MetaPhoneNumberDetails = MetaPhoneNumber & {
  /** True when the number is also live on the WhatsApp Business app (coexistence). */
  is_on_biz_app?: boolean;
  /** e.g. "CLOUD_API" */
  platform_type?: string;
};

/** Full detail for one phone number, including coexistence indicators. */
export function fetchPhoneNumberDetails(phoneNumberId: string, accessToken: string) {
  return graph<MetaPhoneNumberDetails>(
    `${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,status,is_on_biz_app,platform_type`,
    accessToken,
  );
}

/**
 * Register a phone number for Cloud API messaging.
 * ⚠️ Must be SKIPPED for coexistence numbers — they are already registered, and
 * re-registering breaks the WhatsApp Business app link.
 */
export function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string,
) {
  return graph<{ success: boolean }>(`${phoneNumberId}/register`, accessToken, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
}

/** POST with form-encoded credentials in the body (no Bearer header). */
async function postForm<T>(
  path: string,
  params: Record<string, string>,
): Promise<GraphResult<T>> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      cache: "no-store",
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = json.error as { message?: string; code?: number } | undefined;
      return {
        ok: false,
        error: err?.message ?? `Graph error ${res.status}`,
        status: res.status,
        code: err?.code,
        transient: classifyError(res.status, err?.code),
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
      transient: true,
    };
  }
}

export type MetaPhoneNumber = {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  status?: string;
};

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown[];
};

/** Verify a WABA + token by fetching the WABA node. */
export function verifyWaba(wabaId: string, accessToken: string) {
  return graph<{ id: string; name?: string }>(
    `${wabaId}?fields=id,name`,
    accessToken,
  );
}

export function fetchPhoneNumbers(wabaId: string, accessToken: string) {
  return graph<{ data: MetaPhoneNumber[] }>(
    `${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`,
    accessToken,
  );
}

export function fetchTemplates(wabaId: string, accessToken: string) {
  return graph<{ data: MetaTemplate[] }>(
    `${wabaId}/message_templates?fields=id,name,language,category,status,components&limit=200`,
    accessToken,
  );
}

export function createTemplate(
  wabaId: string,
  accessToken: string,
  body: { name: string; language: string; category: string; components: unknown[] },
) {
  return graph<{ id: string; status: string }>(`${wabaId}/message_templates`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Send a template message via a phone number. */
export function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  template: { name: string; language: string; components?: unknown[] },
) {
  return graph<{ messages: { id: string }[] }>(`${phoneNumberId}/messages`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: template.components ?? [],
      },
    }),
  });
}

/** Send a free-form text message (only valid within the 24h customer-care window). */
export function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
) {
  return graph<{ messages: { id: string }[] }>(`${phoneNumberId}/messages`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
