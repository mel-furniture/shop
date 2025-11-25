export async function onRequest(context) {
  // Only allow POST requests
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const stripe = require('stripe')(context.env.STRIPE_SECRET_KEY);
    
    // Get cart items from request body
    const { items } = await context.request.json();
    
    // Calculate total amount in cents
    // items is an array like: [{ id, name, price, quantity }, ...]
    const amount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity * 100); // Convert dollars to cents
    }, 0);
    
    // Ensure minimum amount (Stripe requires at least 50 cents)
    if (amount < 50) {
      return new Response(JSON.stringify({ 
        error: 'Order total must be at least $0.50' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
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
