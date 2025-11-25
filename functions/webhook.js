import Stripe from 'stripe';
const stripe = new Stripe('YOUR_SECRET_KEY');

export async function onRequestPost({ request }) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, 'YOUR_ENDPOINT_SECRET');
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log('Payment succeeded:', paymentIntent.id);
  }

  return new Response('Received', { status: 200 });
}
