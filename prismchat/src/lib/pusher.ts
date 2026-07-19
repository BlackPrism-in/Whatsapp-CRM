import Pusher from "pusher";

// Server-side realtime publisher. Works with hosted Pusher or self-hosted Soketi
// (set PUSHER_HOST/PORT for Soketi). Used for inbox live messages, typing, etc.
const configured =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET;

export const pusher = configured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER ?? "mt1",
      host: process.env.PUSHER_HOST || undefined,
      port: process.env.PUSHER_PORT || undefined,
      useTLS: process.env.PUSHER_HOST ? process.env.PUSHER_TLS === "true" : true,
    })
  : null;

/** Scope realtime channels per workspace so tenants never cross streams. */
export function workspaceChannel(workspaceId: string, name: string) {
  return `private-ws-${workspaceId}-${name}`;
}
