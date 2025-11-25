// main.js
import { loadStripe } from "https://js.stripe.com/v3/";

const stripe = Stripe("pk_live_51SVcSEAxCX5hk2YKsiojWL8rpBAiVAZpwMqnUSfQdJFlwtKEOo2JnblmbNvwAr1fUlyLAyXgNxvbBw6yO0pZTzuV00gYr1w8UI"); // replace with your Stripe publishable key
const paymentForm = document.getElementById("payment-form");
const cardElementDiv = document.getElementById("card-element");
const paymentMessage = document.getElementById("payment-message");

// Create a Stripe card element
const elements = stripe.elements();
const card = elements.create("card");
card.mount(cardElementDiv);

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  paymentMessage.textContent = "Processing payment…";

  try {
    // Step 1: Call your backend to create a PaymentIntent
    const response = await fetch("/functions/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 60000 }) // amount in cents ($600)
    });

    const { clientSecret, error } = await response.json();

    if (error) {
      paymentMessage.textContent = `Error: ${error}`;
      return;
    }

    // Step 2: Confirm the card payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card }
    });

    if (result.error) {
      paymentMessage.textContent = `Payment failed: ${result.error.message}`;
    } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      paymentMessage.textContent = "Payment succeeded! Thank you for your order.";
    }
  } catch (err) {
    paymentMessage.textContent = `Payment error: ${err.message}`;
  }
});
