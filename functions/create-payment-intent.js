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
    // Debug: Check if API key is available
    console.log('STRIPE_SECRET_KEY exists:', !!context.env.STRIPE_SECRET_KEY);
    console.log('Key starts with:', context.env.STRIPE_SECRET_KEY?.substring(0, 7));

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

    // Validate shipping address for shipping orders
    if (deliveryMethod === 'ship') {
      if (!shippingAddress ||
          !shippingAddress.address ||
          !shippingAddress.city ||
          !shippingAddress.state ||
          !shippingAddress.zip) {
        return new Response(JSON.stringify({
          error: 'Complete shipping address is required'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Validate each item and calculate amount using SERVER-SIDE prices
    let subtotal = 0;
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

      // Calculate subtotal using SERVER price (not client price!)
      subtotal += product.price * quantity * 100; // Convert to cents

      // Store validated item info for metadata
      validatedItems.push({
        id: item.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
      });
    }

    // Add flat $30 shipping for domestic shipping orders
    const SHIPPING_COST = 3000; // $30 in cents
    const shippingAmount = (deliveryMethod === 'ship') ? SHIPPING_COST : 0;

    // Calculate initial amount (subtotal + shipping, before tax)
    let amount = subtotal + shippingAmount;

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

    // Calculate tax using Stripe Tax (for MN customers)
    let taxCalculation = null;
    let taxAmount = 0;

    if (deliveryMethod === 'ship' && shippingAddress) {
      try {
        // Prepare line items for tax calculation
        const lineItems = validatedItems.map(item => ({
          amount: Math.round(item.price * item.quantity * 100), // cents
          reference: item.id,
          tax_code: 'txcd_99999999', // General tangible goods - update if you have specific codes
        }));

        // Add shipping as a line item for tax calculation
        if (shippingAmount > 0) {
          lineItems.push({
            amount: shippingAmount,
            reference: 'shipping',
            tax_code: 'txcd_92010001', // Shipping tax code
          });
        }

        // Create tax calculation
        taxCalculation = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: lineItems,
          customer_details: {
            address: {
              line1: shippingAddress.address,
              line2: shippingAddress.address2 || null,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.zip,
              country: shippingAddress.country || 'US',
            },
            address_source: 'shipping',
          },
        });

        // Get the tax amount from the calculation
        taxAmount = taxCalculation.tax_amount_exclusive;

      } catch (taxError) {
        console.error('Tax calculation error:', taxError);
        // Continue without tax if calculation fails (can happen if outside MN)
        // Stripe Tax only charges if tax is actually calculated
      }
    }

    // Add tax to total amount
    amount += taxAmount;

    // Prepare metadata
    const metadata = {
      items: JSON.stringify(validatedItems),
      order_date: new Date().toISOString(),
      delivery_method: deliveryMethod || 'ship',
      subtotal: subtotal.toString(),
      shipping_amount: shippingAmount.toString(),
      tax_amount: taxAmount.toString(),
    };

    // Add shipping address to metadata if provided
    if (shippingAddress && deliveryMethod === 'ship') {
      metadata.shipping_address = JSON.stringify(shippingAddress);
    }

    // Store tax calculation ID if we have one
    if (taxCalculation) {
      metadata.tax_calculation_id = taxCalculation.id;
    }

    // Create payment intent with tax calculation
    const paymentIntentParams = {
      amount: Math.round(amount), // Ensure it's an integer
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata,
      description: `Order: ${validatedItems.map(i => `${i.name} (${i.quantity})`).join(', ')}`,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      breakdown: {
        subtotal: subtotal,
        shipping: shippingAmount,
        tax: taxAmount,
        total: amount,
      },
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
