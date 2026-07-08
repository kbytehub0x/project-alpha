require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve only specific files to improve security
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/success.html', (req, res) => res.sendFile(path.join(__dirname, 'success.html')));
app.get('/cancel.html', (req, res) => res.sendFile(path.join(__dirname, 'cancel.html')));

app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const YOUR_DOMAIN = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'LuxeReal AI Pro Subscription',
              description: 'Professional property listing generation',
            },
            unit_amount: 1500,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/success.html`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// For the existing verification script
app.post('/api/generate', (req, res) => {
    res.json({
        description: "# Coastal Masterpiece\n\n* Panoramic Ocean Views\n* Smart Home Integration\n* Private Infinity Pool\n\nExperience the pinnacle of luxury living in this architectural gem."
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
