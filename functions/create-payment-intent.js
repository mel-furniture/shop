// Server-side product catalog - CRITICAL for security
// Prices here are the source of truth, not what the client sends
const PRODUCTS = {
  'radius-table': {
    name: 'Radius Table',
    price: 600.00, // Price in dollars
  },
  // Add more products here as you create them
};

export async function onRequest(context) {
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

    // Get data from request body
    const requestData = await context.request.json();
    const { items, shippingAddress, deliveryMethod } = requestData;

    // Input validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({
        error: 'Cart is empty or invalid'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate each item and calculate amount using SERVER-SIDE prices
    let amount = 0;
    const validatedItems = [];

    for (const item of items) {
      // Validate item structure
      if (!item.id || !item.quantity) {
        return new Response(JSON.stringify({
          error: 'Invalid item data'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Check if product exists in our catalog
      const product = PRODUCTS[item.id];
      if (!product) {
        return new Response(JSON.stringify({
          error: `Product not found: ${item.id}`
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Validate quantity
      const quantity = parseInt(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return new Response(JSON.stringify({
          error: 'Invalid quantity'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Calculate amount using SERVER price (not client price!)
      amount += product.price * quantity * 100; // Convert to cents

      // Store validated item info for metadata
      validatedItems.push({
        id: item.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
      });
    }

    // Ensure minimum amount (Stripe requires at least 50 cents)
    if (amount < 50) {
      return new Response(JSON.stringify({
        error: 'Order total must be at least $0.50'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Prepare metadata
    const metadata = {
      items: JSON.stringify(validatedItems),
      order_date: new Date().toISOString(),
      delivery_method: deliveryMethod || 'ship',
    };

    // Add shipping address to metadata if provided
    if (shippingAddress && deliveryMethod === 'ship') {
      metadata.shipping_address = JSON.stringify(shippingAddress);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata,
      description: `Order: ${validatedItems.map(i => `${i.name} (${i.quantity})`).join(', ')}`,
    });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);

    return new Response(JSON.stringify({
      error: error.message || 'An error occurred processing your payment'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
