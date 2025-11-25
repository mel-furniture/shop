// functions/webhook.js

import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  // Retrieve the Stripe secret from Cloudflare Pages environment
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-08-16",
  });

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    console.log("Payment succeeded:", paymentIntent.id);

    // TODO: Add any post-payment logic here
    // e.g., send a confirmation email, update a database, etc.
  }

  return new Response("Webhook received", { status: 200 });
}
