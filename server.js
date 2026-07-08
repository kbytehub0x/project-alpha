const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config();

// Provide a dummy stripe key for development if not in env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const stripe = require('stripe')(stripeSecretKey);

const app = express();
const port = 3001;

// Use JSON parser for all non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Initialize Google GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- API Routes ---

// 1. Generate Listing Route
app.post('/api/generate', async (req, res) => {
  try {
    const { description, tone } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const prompt = `You are an expert real estate copywriter. Write a compelling property listing based on the following details.
Tone: ${tone || 'professional'}
Details: ${description}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error('Error generating listing:', error);
    res.status(500).json({ error: 'Failed to generate listing' });
  }
});

// 2. Stripe Checkout Route
app.post('/api/checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'LuxeReal AI Pro Plan',
              description: 'Unlimited AI-generated professional real estate listings.',
            },
            unit_amount: 1200, // $12.00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/?success=true`,
      cancel_url: `${req.protocol}://${req.get('host')}/?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// 3. Stripe Webhook Route
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // In development without webhook secret, just parse the body
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Subscription successful for session:', session.id);
      // Fulfill the purchase...
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Invoice paid:', invoice.id);
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('Invoice payment failed:', failedInvoice.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
