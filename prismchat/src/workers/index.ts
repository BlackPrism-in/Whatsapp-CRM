import "dotenv/config";
import { Worker, type Processor } from "bullmq";
import { redis } from "../lib/redis";
import { QUEUE_NAMES, type QueueName } from "../lib/queue";
import {
  sendCampaignMessage,
  finalizeCampaignIfDone,
  markRecipientFailedByContact,
} from "../modules/broadcasting/send";
import { syncTemplatesForWaba } from "../modules/whatsapp/sync";
import {
  effectiveSendRate,
  COEXISTENCE_MAX_MPS,
} from "../modules/whatsapp/token-health";
import { prisma } from "../lib/prisma";

/**
 * PrismChat background worker process. Run separately from the Next.js server
 * (`pnpm worker`) — Next route handlers can't host long-lived BullMQ workers.
 */

/**
 * Broadcast throttling.
 *
 * Meta's Cloud API caps throughput (default ~80 messages/sec, lower for new
 * numbers) and will return 130429 / HTTP 429 when exceeded. Sustained bursts
 * also hurt the number's quality rating, which can get it restricted.
 *
 * We pace sends with a BullMQ limiter so a 5,000-contact broadcast drains
 * steadily instead of stampeding. Default 20/sec ≈ 5,000 messages in ~4 min.
 * Raise BROADCAST_RATE_LIMIT once the number reaches a higher messaging tier.
 *
 * ⚠️ Coexistence numbers are capped by Meta at 20 msg/sec regardless of tier, so
 * the configured rate is clamped down to that ceiling — see `effectiveSendRate`.
 * The limiter is process-wide, so we apply the safe (lower) bound whenever any
 * connected account is in coexistence mode.
 */
const CONFIGURED_RATE = Number(process.env.BROADCAST_RATE_LIMIT ?? 20);
const BROADCAST_ATTEMPTS = Number(process.env.BROADCAST_ATTEMPTS ?? 5);

/**
 * Resolve the send rate at startup. If any WABA is in coexistence mode the
 * whole queue is clamped to Meta's 20/sec ceiling — over-sending would get the
 * client's number throttled or flagged, which is far worse than sending slowly.
 */
async function resolveBroadcastRate(): Promise<number> {
  try {
    const coexistenceCount = await prisma.whatsappBusinessAccount.count({
      where: { OR: [{ onboardingMode: "coexistence" }, { isOnBizApp: true }] },
    });
    return effectiveSendRate(CONFIGURED_RATE, coexistenceCount > 0);
  } catch {
    // If the check fails, fall back to the safer of the two rates.
    return Math.min(CONFIGURED_RATE, COEXISTENCE_MAX_MPS);
  }
}

// Resolved during bootstrap — the worker runs as CJS, so no top-level await.
let BROADCAST_RATE_LIMIT = Math.min(CONFIGURED_RATE, COEXISTENCE_MAX_MPS);

const broadcastProcessor: Processor = async (job) => {
  const { campaignId, contactId } = job.data as { campaignId: string; contactId: string };
  const result = await sendCampaignMessage(campaignId, contactId);
  await finalizeCampaignIfDone(campaignId);
  return { result };
};

const placeholder: Processor = async (job) => {
  console.log(`[worker:${job.queueName}] job ${job.id} (${job.name}) — no processor yet`);
  return { ok: true };
};

/** Template sync after a WABA connects via Embedded Signup. */
const whatsappSyncProcessor: Processor = async (job) => {
  const { wabaId } = job.data as { wabaId: string };
  const result = await syncTemplatesForWaba(wabaId);
  if ("error" in result) throw new Error(result.error);
  console.log(`[worker:whatsapp-sync] synced ${result.synced} template(s)`);
  return result;
};

const processors: Partial<Record<QueueName, Processor>> = {
  [QUEUE_NAMES.broadcast]: broadcastProcessor,
  [QUEUE_NAMES.whatsappSync]: whatsappSyncProcessor,
};

let workers: Worker[] = [];

async function bootstrap() {
  BROADCAST_RATE_LIMIT = await resolveBroadcastRate();

  workers = Object.values(QUEUE_NAMES).map((name: QueueName) => {
  const isBroadcast = name === QUEUE_NAMES.broadcast;

  const worker = new Worker(name, processors[name] ?? placeholder, {
    connection: redis,
    concurrency: isBroadcast ? 5 : 5,
    // Global pacing across all jobs on this queue.
    ...(isBroadcast
      ? { limiter: { max: BROADCAST_RATE_LIMIT, duration: 1000 } }
      : {}),
  });

  worker.on("completed", (job, ret) => {
    if (isBroadcast) console.log(`[worker:${name}] ${job.id} →`, ret?.result);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[worker:${name}] job ${job?.id} failed:`, err.message);

    // Once a broadcast job exhausts every retry, consume the recipient so the
    // campaign can finalize instead of hanging with `pending` rows forever.
    if (isBroadcast && job && job.attemptsMade >= (job.opts.attempts ?? BROADCAST_ATTEMPTS)) {
      const { campaignId, contactId } = job.data as {
        campaignId: string;
        contactId: string;
      };
      try {
        await markRecipientFailedByContact(
          campaignId,
          contactId,
          `Gave up after ${job.attemptsMade} attempts: ${err.message}`,
        );
        await finalizeCampaignIfDone(campaignId);
      } catch (e) {
        console.error(`[worker:${name}] could not finalize recipient:`, e);
      }
    }
  });

    return worker;
  });

  console.log(
    `PrismChat worker started. Listening on: ${Object.values(QUEUE_NAMES).join(", ")}`,
  );
  console.log(
    `Broadcast throttle: ${BROADCAST_RATE_LIMIT} msg/sec, ${BROADCAST_ATTEMPTS} attempts w/ exponential backoff`,
  );
}

bootstrap().catch((e) => {
  console.error("Worker failed to start:", e);
  process.exit(1);
});

async function shutdown() {
  console.log("Shutting down workers…");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
