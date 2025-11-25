export async function onRequest(context) {
  // Only allow POST requests
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const stripe = require('stripe')(context.env.STRIPE_SECRET_KEY);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 60000, // $600.00 in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
