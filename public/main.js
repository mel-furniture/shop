import { loadStripe } from '@stripe/stripe-js';

// Use your **publishable key**, NOT the secret key
const stripe = await loadStripe('pk_live_51SVcSEAxCX5hk2YKsiojWL8rpBAiVAZpwMqnUSfQdJFlwtKEOo2JnblmbNvwAr1fUlyLAyXgNxvbBw6yO0pZTzuV00gYr1w8UI');

const paymentForm = document.getElementById('payment-form');
const cardElementContainer = document.getElementById('card-element');
const paymentMessage = document.getElementById('payment-message');

// Create Stripe Elements
const elements = stripe.elements();
const card = elements.create('card');
card.mount(cardElementContainer);

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  paymentMessage.textContent = 'Processing payment...';

  try {
    // Call your Cloudflare Pages function
    const response = await fetch('/functions/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 60000 }) // $600 in cents
    });

    const data = await response.json();
    const clientSecret = data.clientSecret;

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: card,
      },
    });

    if (error) {
      paymentMessage.textContent = error.message;
    } else if (paymentIntent.status === 'succeeded') {
      paymentMessage.textContent = 'Payment successful! Thank you.';
    }
  } catch (err) {
    paymentMessage.textContent = 'Payment failed: ' + err.message;
  }
});
