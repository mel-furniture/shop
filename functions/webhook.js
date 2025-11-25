export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripe = require('stripe')(context.env.STRIPE_SECRET_KEY);
  const sig = context.request.headers.get('stripe-signature');
  const body = await context.request.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      context.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('PaymentIntent was successful!', paymentIntent.id);
        // Add your business logic here (send confirmation email, update database, etc.)
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
