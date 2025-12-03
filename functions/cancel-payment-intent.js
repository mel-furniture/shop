export async function onRequest(context) {
  // Handle CORS preflight request
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Only allow POST requests
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const stripe = require('stripe')(context.env.STRIPE_SECRET_KEY);

    // Get payment intent ID from request body
    const { paymentIntentId } = await context.request.json();

    if (!paymentIntentId) {
      return new Response(JSON.stringify({
        error: 'Payment intent ID required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Cancel the payment intent
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    console.log('Canceled payment intent:', paymentIntentId);

    return new Response(JSON.stringify({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Payment intent cancellation error:', error);

    // If already canceled or doesn't exist, that's fine
    if (error.code === 'payment_intent_unexpected_state' || error.code === 'resource_missing') {
      return new Response(JSON.stringify({
        success: true,
        message: 'Payment intent already canceled or does not exist',
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({
      error: error.message || 'An error occurred canceling the payment intent'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
