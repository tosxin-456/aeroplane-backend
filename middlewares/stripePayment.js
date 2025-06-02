const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const initiatePayment = async (req, res) => {
    try {
        const { amount, currency, email } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // in smallest currency unit
            currency,
            receipt_email: email,
            metadata: { integration_check: "flight_booking" }
        });

        return res.status(200).json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Payment initiation failed:", error);
        return res.status(500).json({ success: false, message: "Payment failed", error: error.message });
    }
};
