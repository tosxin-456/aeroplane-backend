const dotenv = require('dotenv');
dotenv.config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Amadeus = require('amadeus');
const airlineNames = require('../airlineIataToName.json')
const cityNames = require('../output.json');
const User = require('../models/users.model');
const BookedFlight = require('../models/bookflight.model');
const ValidatedPayment = require('../models/payments.model');
const Customer = require('../models/customers.model');
const Card = require('../models/cards.model');
const openai = require('../utils/openai');
const ManualFlightBooking = require('../models/manual-booking.model');
const duffel = require('../middlewares/duffel.configuration');

const axios = require('axios');

const amadeus = new Amadeus({
    clientId: process.env.AmadeusKey,
    clientSecret: process.env.AmadeusSecret,
});


const getAllPresentFlights = async (req, res) => {
    try {
        const formData = req.body;
        const passengers = [];
        // console.log(formData)

        const addPassengers = (count, type) => {
            for (let i = 0; i < count; i++) {
                passengers.push({
                    type,
                    id: (passengers.length + 1).toString()
                });
            }
        };

        const pax = formData.passengers || {};
        addPassengers(pax.adults || 0, "adult");
        addPassengers(pax.children || 0, "child");
        addPassengers(pax.infantsOnLap || 0, "infant_without_seat");
        addPassengers(pax.infantsInSeat || 0, "infant_with_seat");

        const searchDates = [];

        if (formData.departureDate) {
            searchDates.push(formData.departureDate);
        } else {
            const today = new Date();
            for (let i = 1; i <= 3; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                searchDates.push(date.toISOString().split('T')[0]);
            }
        }

        let offerRequestRes = null;
        let success = false;
        let lastError = null;

        for (const date of searchDates) {
            const slices = [
                {
                    origin: formData.originLocationCode,
                    destination: formData.destinationLocationCode,
                    departure_date: date
                }
            ];

            if (formData.tripType === "roundtrip" && formData.returnDate) {
                slices.push({
                    origin: formData.destinationLocationCode,
                    destination: formData.originLocationCode,
                    departure_date: formData.returnDate
                });
            }

            const payload = {
                slices,
                passengers,
                cabin_class: formData.cabinClass?.toLowerCase() || "economy",
                currency: formData.currencyCode || "USD"
            };

            try {
                offerRequestRes = await duffel.post('/offer_requests', { data: payload });
                success = true;
                break; // Stop loop if one date works
            } catch (err) {
                lastError = err;
            }
        }
        console.log(offerRequestRes.data.data.offers[0])
        // console.log(offerRequestRes)

        if (success && offerRequestRes) {
            return res.status(200).json({ success: true, data: offerRequestRes.data.data });
        } else {
            const duffelError = lastError?.response?.data;
            return res.status(500).json({
                success: false,
                message: "No flights found for the next few days",
                error: duffelError || lastError.message
            });
        }

    } catch (error) {
        const duffelError = error?.response?.data;

        if (duffelError?.errors && Array.isArray(duffelError.errors)) {
            duffelError.errors.forEach((err, idx) => {
                console.log(`Duffel Error #${idx + 1}: ${err.title} - ${err.detail}`);
            });
        } else {
            console.log("General error:", error.message || error);
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch flights",
            error: error?.response?.data || error.message
        });
    }
};



const getSelectedOfferDetails = async (req, res) => {
    const { offerId } = req.params;
    console.log("Requested Offer ID:", offerId);

    try {
        const response = await duffel.get(`/air/offers/${offerId}`); // ✅ Correct

        const offer = response.data?.data;

        return res.status(200).json({
            success: true,
            message: `Fetched offer ${offerId} details`,
            offer,
        });
    } catch (error) {
        const duffelError = error?.response?.data;

        if (duffelError?.errors && Array.isArray(duffelError.errors)) {
            duffelError.errors.forEach((err, idx) => {
                console.log(
                    `Duffel Error #${idx + 1}: ${err.title || "No Title"} - ${err.detail || "No Detail"}`
                );
            });
        } else {
            console.log("General error:", error?.message || error);
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch offer details",
            error: duffelError?.errors || error?.message || "Unknown error",
        });
    }
};




const airlineLink = async (req, res) => {
    const { airlineCode } = req.body;
    if (!airlineCode) {
        return res.status(400).json({ success: false, message: "Airline code is required" });
    }

    try {
        // Try Amadeus first
        const amadeusRes = await amadeus.referenceData.urls.checkinLinks.get({ airlineCode });
        const checkinUrl = amadeusRes.data[0]?.attributes?.checkinUrl;

        if (checkinUrl) {
            return res.status(200).json({ success: true, source: "amadeus", checkinUrl });
        }

        // Fallback to OpenAI
        const openaiRes = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a travel assistant that helps users find airline check-in pages."
                },
                {
                    role: "user",
                    content: `Find the official website for the airline with IATA code "${airlineCode}" Respond with just the website.`
                }
            ]
        });

        const openaiUrl = openaiRes.choices?.[0]?.message?.content.trim();
        return res.status(200).json({ success: true, source: "openai", checkinUrl: openaiUrl });

    } catch (error) {
        console.error("Error fetching airline check-in link:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve check-in URL", error: error.message });
    }
};



const getUpsellOptions = async (req, res) => {
    try {
        console.log("here")
        const { flightOffer } = req.body;
        // console.log(flightOffer)
        if (!flightOffer) {
            return res.status(400).json({ success: false, message: "Flight offer is required" });
        }

        const payload = {
            data: {
                type: "flight-offers-upselling",
                flightOffers: [flightOffer]
            }
        };

        const response = await amadeus.shopping.flightOffers.upselling.post(JSON.stringify(payload));
        // console.log(response)
        return res.status(200).json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error("Error fetching upsell options:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch upsell options",
            error: error?.response?.data || error.message
        });
    }
};


const getFlightPricing = async (req, res) => {
    try {
        const { flightOffer } = req.body; // Pass the selected offer from previous search

        const pricingResponse = await amadeus.shopping.flightOffers.pricing.post(
            JSON.stringify({
                data: {
                    type: "flight-offers-pricing",
                    flightOffers: [flightOffer]
                }
            })
        );

        return res.status(200).json({ success: true, data: pricingResponse.data });
    } catch (error) {
        console.error("Error pricing flight offer:", error);
        return res.status(500).json({ success: false, message: "Pricing failed", error: error?.response?.data || error.message });
    }
};

const testDate = {
    "data": {
        "type": "hold",
        "selected_offers": ["off_00009hj8USM7Ncg31c6CLL"],
        "passengers": [
            {
                "id": "pas_00009hj8USM7Ncg31c6CLL",
                "type": "adult",
                "title": "mr",
                "gender": "m",
                "given_name": "Shallom",
                "family_name": "Ekundayo",
                "born_on": "2006-01-19",
                "email": "tosinekshally@gmail.com",
                "phone_number": "+2349028392258",
                "identity_documents": [
                    {
                        "type": "passport",
                        "issuing_country_code": "NG",
                        "unique_identifier": "5245246264",
                        "expires_on": "2027-06-08"
                    }
                ]
            }
        ]
    }
}
  

const bookFlight = async (req, res) => {
    try {
        const { flightOfferId, travelersInfo } = req.body;
        console.log(travelersInfo[0].documents);

        const mappedTravelers = travelersInfo.map((traveler, index) => {
            const phone = traveler.contact?.phones?.[0]?.number;
            const formattedPhone = phone && phone.startsWith('+') ? phone : undefined;

            const document = traveler.documents?.[0]; // take the first if exists
            const identityDocument = document
                ? {
                    type: document.type || "passport", // must be 'passport', 'id_card', etc.
                    issuing_country_code: document.issuingCountryCode || "NG", // ISO 3166-1 alpha-2
                    unique_identifier: document.number,
                    expires_on: document.expiryDate // must be 'YYYY-MM-DD'
                }
                : undefined;

            return {
                id: (index + 1).toString(),
                type: traveler.type || "adult",
                title: traveler.name?.title?.toLowerCase() || "mr",
                gender: traveler.gender?.toLowerCase().startsWith('m') ? "m" : "f",
                given_name: traveler.name?.firstName,
                family_name: traveler.name?.lastName,
                born_on: traveler.dateOfBirth,
                email: traveler.contact?.emailAddress,
                phone_number: formattedPhone,
                identity_documents: identityDocument ? [identityDocument] : []
            };
        });

        console.log(JSON.stringify(mappedTravelers, null, 2));

        // Create the order without payment
        const orderRes = await duffel.post('/orders', {
            data: {
                type: "hold", // Use "hold" to reserve the booking without charging
                selected_offers: [flightOfferId],
                passengers: testDate.data.passengers 
                // payments omitted: no payment yet
            }
        });

        const orderData = orderRes.data.data;

        return res.status(200).json({
            success: true,
            message: "Flight order created and reserved, waiting for payment",
            data: {
                orderId: orderData.id,
                totalAmount: orderData.total_amount,
                currency: orderData.total_currency,
                orderData
            }
        });
    } catch (error) {
        const errors = error?.response?.data?.errors;

        if (Array.isArray(errors) && errors.length > 0) {
            const detailedErrors = errors.map((err) => ({
                field: err?.source?.pointer,
                message: err?.detail
            }));
            console.log("Full Duffel Error:", JSON.stringify(error?.response?.data, null, 2));

            return res.status(422).json({
                success: false,
                message: "Duffel order creation failed due to invalid input.",
                errors: detailedErrors
            });
        }

        return res.status(500).json({
            success: false,
            message: `Duffel order creation failed: ${error?.message}`
        });
    }
}


// GET /api/duffel/services/:offerId
const getAvailableServices = async (req, res) => {
    const { offerId } = req.params;
    console.log(offerId)
    try {
        const offerResponse = await duffel.get(`/air/offers/${offerId}`, {
            params: { return_available_services: true },
        });

        const services = offerResponse.data.data.available_services || [];

        return res.status(200).json({
            success: true,
            message: `Available services for offer ${offerId}`,
            services,
        });
    } catch (err) {
        console.error("Duffel service fetch error:", JSON.stringify(err?.response?.data, null, 2));

        const message =
            err?.response?.data?.errors?.[0]?.detail ||
            err?.response?.data?.errors?.[0]?.title ||
            err?.message ||
            "Error fetching available services";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};



const createPaymentIntent = async (req, res) => {
    try {
        let { amount, currency } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({ message: 'Amount and currency are required' });
        }
        // Convert to smallest currency unit (e.g. cents for USD)
        amount = Math.round(parseFloat(amount) * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: { enabled: true },
        });
        // console.log(paymentIntent)

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error('Stripe Error:', error);
        return res.status(500).json({ message: error.message || 'Payment creation failed' });
    }
};

const validatePayment = async (req, res) => {
    try {
        const { paymentIntentId, userId, reference, email } = req.body;
        console.log(userId);
        if (!paymentIntentId) {
            return res.status(400).json({ message: "PaymentIntent ID is required" });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ message: "Payment not successful yet" });
        }

        // Check if already saved (avoid duplicates)
        const existing = await ValidatedPayment.findOne({
            where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (existing) {
            return res.status(200).json({ message: "Payment already validated", data: existing });
        }

        // Calculate markup and charge
        const originalAmount = paymentIntent.amount / 100; // Convert from cents to dollars
        const markupPercent = 0.05;
        const markedUpAmount = originalAmount * (1 + markupPercent);
        const charge = (markedUpAmount - originalAmount).toFixed(2); // Difference is the charge (in dollars)

        const validated = await ValidatedPayment.create({
            userId: userId || null,
            stripePaymentIntentId: paymentIntent.id,
            stripePaymentMethodId: paymentIntent.payment_method,
            amount: paymentIntent.amount, // still stored in cents
            charge, // store markup charge in dollars
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            reference,
            email,
            metadata: paymentIntent.metadata || {},
        });

        return res.status(201).json({
            message: "Payment validated and saved",
            data: validated,
        });
    } catch (error) {
        console.error("Validation Error:", error);
        return res.status(500).json({ message: "Payment validation failed", error: error.message });
    }
};




const bookTrain = async (req, res) => {
    const { origin, destination, date } = req.query;

    // Use dummy default values if not provided
    const searchParams = {
        originLocationCode: origin || 'PAR',    // Paris
        destinationLocationCode: destination || 'LYS', // Lyon
        departureDate: date || '2025-04-28'
    };

    try {
        const response = await amadeus.shopping.railOffers.get(searchParams);

        res.json({
            search: searchParams,
            results: response.data
        });
    } catch (error) {
        console.error('Train Search Error:', error);
        res.status(500).json({ error: 'Failed to fetch train data' });
    }
}



module.exports = { getAllPresentFlights, validatePayment, getFlightPricing, bookFlight, bookTrain, getUpsellOptions, airlineLink, createPaymentIntent, getAvailableServices, getSelectedOfferDetails };
