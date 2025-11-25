// functions/webhook.js

import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-08-16",
  });

  let event;

  try {
    // Use the webhook secret stored as an environment variable
    event = stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    console.log("Payment succeeded:", paymentIntent.id);

    // TODO: send email or update DB here if needed
  }

  return new Response("Received", { status: 200 });
}
