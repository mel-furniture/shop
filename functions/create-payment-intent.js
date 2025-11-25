// functions/create-payment-intent.js

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const amount = data.amount; // in cents

    // Call Stripe API directly
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: "usd",
        "automatic_payment_methods[enabled]": "true"
      }),
    });

    const paymentIntent = await response.json();

    if (paymentIntent.error) {
      return new Response(JSON.stringify({ error: paymentIntent.error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
