// functions/create-payment-intent.js
import Stripe from "stripe";

// Use the environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function onRequestPost({ request }) {
  try {
    const { amount } = await request.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
