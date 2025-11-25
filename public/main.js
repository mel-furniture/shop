import { loadStripe } from '@stripe/stripe-js';

// Use your **publishable key** here
const stripe = await loadStripe('YOUR_PUBLISHABLE_KEY');

const paymentForm = document.getElementById('payment-form');
const paymentMessage = document.getElementById('payment-message');

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Create PaymentIntent on server
  const response = await fetch('/functions/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 60000 }) // $600 in cents
  });

  const { clientSecret, error } = await response.json();

  if (error) {
    paymentMessage.textContent = error;
    return;
  }

  // Confirm card payment
  const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: { token: 'tok_visa' } // test card for now
    }
  });

  if (stripeError) {
    paymentMessage.textContent = stripeError.message;
  } else if (paymentIntent && paymentIntent.status === 'succeeded') {
    paymentMessage.textContent = 'Payment successful! Thank you for your order.';
  }
});
