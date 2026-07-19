// Meta WhatsApp Cloud API client (Graph API). Official API only — no unofficial
// automation. Credentials (access token) are per-WABA and decrypted by callers.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type GraphResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

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
      const err = json.error as { message?: string } | undefined;
      return { ok: false, error: err?.message ?? `Graph error ${res.status}`, status: res.status };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
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
