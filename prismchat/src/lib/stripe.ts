import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

// Instantiated lazily so the app boots without billing configured.
export const stripe = key ? new Stripe(key) : null;

export function requireStripe(): Stripe {
  if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  return stripe;
}
