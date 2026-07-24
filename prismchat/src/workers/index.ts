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
 */
const BROADCAST_RATE_LIMIT = Number(process.env.BROADCAST_RATE_LIMIT ?? 20);
const BROADCAST_ATTEMPTS = Number(process.env.BROADCAST_ATTEMPTS ?? 5);

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

const workers = Object.values(QUEUE_NAMES).map((name: QueueName) => {
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

async function shutdown() {
  console.log("Shutting down workers…");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
