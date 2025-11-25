// functions/webhook.js

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  try {
    // Call Stripe API to verify webhook signature
    const response = await fetch(`https://api.stripe.com/v1/webhook_endpoints/${env.STRIPE_WEBHOOK_ID}/events`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const events = await response.json();
    // NOTE: You can check that payload and sig match an actual event here
    console.log("Received Stripe webhook:", payload);

    // Example: handle payment_intent.succeeded
    const event = JSON.parse(payload);
    if (event.type === "payment_intent.succeeded") {
      console.log("Payment succeeded:", event.data.object.id);
      // Here you could send email, update database, etc.
    }

    return new Response("Webhook received", { status: 200 });

  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }
}
