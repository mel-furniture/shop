const stripe = Stripe('pk_live_51SVcSEAxCX5hk2YKsiojWL8rpBAiVAZpwMqnUSfQdJFlwtKEOo2JnblmbNvwAr1fUlyLAyXgNxvbBw6yO0pZTzuV00gYr1w8UI'); // Replace with your actual publishable key

const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

const form = document.getElementById('payment-form');
const messageDiv = document.getElementById('payment-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  messageDiv.textContent = 'Processing...';
  
  try {
    // Call your Cloudflare Function
    const response = await fetch('/functions/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const { clientSecret, error } = await response.json();
    
    if (error) {
      messageDiv.textContent = error;
      return;
    }
    
    // Confirm the payment
    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });
    
    if (stripeError) {
      messageDiv.textContent = stripeError.message;
    } else {
      messageDiv.textContent = 'Payment successful!';
    }
  } catch (err) {
    messageDiv.textContent = 'Payment failed: ' + err.message;
  }
});
