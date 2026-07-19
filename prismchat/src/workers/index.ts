import "dotenv/config";
import { Worker, type Processor } from "bullmq";
import { redis } from "../lib/redis";
import { QUEUE_NAMES, type QueueName } from "../lib/queue";
import { sendCampaignMessage, finalizeCampaignIfDone } from "../modules/broadcasting/send";

/**
 * PrismChat background worker process. Run separately from the Next.js server
 * (`pnpm worker`) — Next route handlers can't host long-lived BullMQ workers.
 */

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

const processors: Partial<Record<QueueName, Processor>> = {
  [QUEUE_NAMES.broadcast]: broadcastProcessor,
};

const workers = Object.values(QUEUE_NAMES).map((name: QueueName) => {
  const worker = new Worker(name, processors[name] ?? placeholder, {
    connection: redis,
    concurrency: name === QUEUE_NAMES.broadcast ? 10 : 5,
  });
  worker.on("completed", (job, ret) => {
    if (name === QUEUE_NAMES.broadcast) {
      console.log(`[worker:${name}] ${job.id} →`, ret?.result);
    }
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker:${name}] job ${job?.id} failed:`, err.message);
  });
  return worker;
});

console.log(
  `PrismChat worker started. Listening on: ${Object.values(QUEUE_NAMES).join(", ")}`,
);

async function shutdown() {
  console.log("Shutting down workers…");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
