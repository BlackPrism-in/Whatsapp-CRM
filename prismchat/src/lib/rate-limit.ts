import { headers } from "next/headers";
import { redis } from "./redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Fixed-window rate limiter backed by Redis (shared across instances/restarts).
 *
 * Fails OPEN: if Redis is unreachable we allow the request rather than lock
 * everyone out of login. A blip should not take down auth.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  opts: { max: number; windowSec: number },
): Promise<RateLimitResult> {
  const key = `rl:${scope}:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, opts.windowSec);
    }
    if (count > opts.max) {
      const ttl = await redis.ttl(key);
      return { allowed: false, remaining: 0, retryAfterSec: ttl > 0 ? ttl : opts.windowSec };
    }
    return { allowed: true, remaining: Math.max(0, opts.max - count), retryAfterSec: 0 };
  } catch (e) {
    console.warn(`[rate-limit] Redis error, failing open:`, e instanceof Error ? e.message : e);
    return { allowed: true, remaining: opts.max, retryAfterSec: 0 };
  }
}

/** Clear a limiter key (e.g. after a successful login). */
export async function rateLimitReset(scope: string, identifier: string): Promise<void> {
  try {
    await redis.del(`rl:${scope}:${identifier}`);
  } catch {
    /* ignore */
  }
}

/** Best-effort client IP from proxy headers (Render/Vercel set x-forwarded-for). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
