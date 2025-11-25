import Stripe from 'stripe';
const stripe = new Stripe('YOUR_SECRET_KEY');

export async function onRequestPost({ request }) {
  const { amount } = await request.json();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd'
  });

  return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
