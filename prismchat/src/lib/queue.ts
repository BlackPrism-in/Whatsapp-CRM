import { Queue } from "bullmq";
import { redis } from "./redis";

// Central place to declare BullMQ queues. Workers (src/workers/) consume these.
// Each maps to a background concern ported from WhatsMine's Laravel jobs.
export const QUEUE_NAMES = {
  broadcast: "broadcast", // campaign fan-out + per-recipient send
  contactImport: "contact-import", // CSV/Excel bulk import
  automation: "automation", // workflow runner steps
  ai: "ai", // embeddings, chatbot runs, generation
  webhookDispatch: "webhook-dispatch", // outbound webhook delivery
  leadScrape: "lead-scrape",
  socialPublish: "social-publish",
  ecommerceSync: "ecommerce-sync",
  whatsappSync: "whatsapp-sync", // template/number sync after Embedded Signup
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const globalForQueues = globalThis as unknown as {
  queues?: Map<QueueName, Queue>;
};

const queues = globalForQueues.queues ?? new Map<QueueName, Queue>();
if (process.env.NODE_ENV !== "production") globalForQueues.queues = queues;

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: redis });
    queues.set(name, q);
  }
  return q;
}
