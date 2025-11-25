import Stripe from 'stripe';

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const amount = data.amount; // amount in cents

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-08-16',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}


