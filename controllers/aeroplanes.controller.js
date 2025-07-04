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
                cabin_class: formData.cabinClass?.toLowerCase() || "economy"
            };

            try {
                offerRequestRes = await duffel.post('/offer_requests', { data: payload });
                success = true;
                break; // Stop loop if one date works
            } catch (err) {
                lastError = err;
            }
        }
        // console.log(offerRequestRes.data.data.offers[0])

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


const bookFlight = async (req, res) => {
    try {
        const { flightOfferId, travelersInfo, paymentDetails, userId } = req.body;
        const { amount, currency } = paymentDetails;
        console.log(paymentDetails)
        const mappedTravelers = travelersInfo.map((traveler, index) => ({
            id: (index + 1).toString(),
            type: "adult", // or child, infant_with_seat, etc.
            title: traveler.name?.title?.toLowerCase() || "mr",
            gender: traveler.gender?.toLowerCase() || "male",
            given_name: traveler.name?.firstName,
            family_name: traveler.name?.lastName,
            born_on: traveler.dateOfBirth, // Must be in YYYY-MM-DD
            email: traveler.contact?.emailAddress,
            phone_number: traveler.contact?.phones?.[0]?.number || "+2340000000000"
        }));


        // STEP 1: BOOK FLIGHT VIA DUFFEL
        let orderData;
        try {
            const orderRes = await duffel.post('/orders', {
                data: {
                    type: "instant",
                    selected_offers: [flightOfferId],
                    passengers: mappedTravelers,
                    payments: [
                        {
                            type: "card",
                            currency,
                            amount: amount.toFixed(2),
                            three_d_secure_session_id: paymentDetails.threeDSecureSessionId
                        }
                    ],
                    metadata: {
                        payment_intent_id: paymentDetails.paymentIntentId // Optional if tracking from Stripe
                    }
                }
            });

            orderData = orderRes.data.data;
        } catch (err) {
            console.error("Duffel booking error response:", JSON.stringify(err?.response?.data, null, 2));

            const duffelError =
                err?.response?.data?.errors?.[0]?.detail ||
                err?.response?.data?.errors?.[0]?.title ||
                err?.response?.data?.message ||
                err?.message ||
                "Unknown Duffel error";

            return res.status(400).json({
                success: false,
                message: `Duffel Booking Failed: ${duffelError}`,
            });
        }


        // STEP 2: SAVE TRAVELERS AS CUSTOMERS
        const customerRecords = await Promise.all(
            travelersInfo.map(async (traveler) => {
                return await Customer.create({
                    travelerId: traveler.id || null,
                    travelerType: traveler.type,
                    firstName: traveler.given_name,
                    lastName: traveler.family_name,
                    gender: traveler.gender || null,
                    dateOfBirth: traveler.date_of_birth,
                    emailAddress: traveler.email || null,
                    phoneNumber: traveler.phone_number || null,
                    documentType: traveler.identity_document_type || null,
                    documentNumber: traveler.identity_document_number || null,
                    expiryDate: traveler.identity_document_expiry_date || null,
                    issuanceCountry: traveler.identity_document_issuing_country || null,
                    nationality: traveler.nationality || null,
                });
            })
        );

        // STEP 3: SAVE BOOKED FLIGHT
        const segment = orderData?.slices?.[0]?.segments?.[0] || {};
        const lastSegment = orderData?.slices?.[0]?.segments?.slice(-1)?.[0] || {};
        const bookingReference = orderData?.booking_reference || orderData.id;

        const bookedFlight = await BookedFlight.create({
            customerId: customerRecords[0].customer_id,
            offerId: flightOfferId,
            bookingReference,
            airline: segment.marketing_carrier?.iata_code,
            origin: segment.origin?.iata_code,
            destination: segment.destination?.iata_code,
            departureTime: segment.departing_at,
            arrivalTime: lastSegment.arriving_at,
            travelersInfo,
            rawOfferData: orderData,
            status: "confirmed",
        });

        // STEP 4: SAVE PAYMENT
        const totalAmount = amount; // already includes markup
        const totalPrice = parseFloat((totalAmount / 1.10).toFixed(2));
        const totalCharge = parseFloat((totalAmount - totalPrice).toFixed(2));

        await ValidatedPayment.create({
            userId: customerRecords[0].customer_id,
            amount: totalAmount * 100,
            currency,
            charge: totalCharge * 100,
            paymentMethod: paymentDetails.paymentMethod || "card",
            status: paymentDetails.status || "successful",
            reference: paymentDetails.paymentMethodId,
            metadata: {
                flightOfferId,
                bookingReference,
                travelersCount: travelersInfo.length,
            },
        });

        // STEP 5: GENERATE CHECK-IN LINK VIA OpenAI
        let checkInLink = null;
        try {
            const openaiRes = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a travel assistant that helps users find airline booking or check-in URLs using airline code.",
                    },
                    {
                        role: "user",
                        content: `Find the official check-in website for airline with IATA code "${segment.marketing_carrier?.iata_code}". Respond with only the full URL.`,
                    },
                ],
            });
            checkInLink = openaiRes.choices?.[0]?.message?.content?.trim() || null;
        } catch (err) {
            console.warn("OpenAI check-in URL generation failed:", err.message);
        }

        const detailedPaymentDetails = {
            ...paymentDetails,
            totalAmount,
            totalPrice,
            totalCharge,
        };

        // STEP 6: SAVE MANUAL FLIGHT BOOKING
        await ManualFlightBooking.create({
            userId,
            bookingReference,
            flightOfferId,
            airlineCode: segment.marketing_carrier?.iata_code,
            origin: segment.origin?.iata_code,
            destination: lastSegment.destination?.iata_code,
            departureTime: segment.departing_at,
            arrivalTime: lastSegment.arriving_at,
            travelerCount: travelersInfo.length,
            travelersInfo,
            paymentDetails: detailedPaymentDetails,
            ticketingOption: "instant",
            latestTicketingDate: orderData?.expires_at || null,
            amadeusBookingData: orderData, // Consider renaming this column to duffelBookingData
            checkInLink,
            status: "pending",
        });

        return res.status(200).json({
            success: true,
            message: "Flight booked successfully via Duffel",
            data: {
                bookingReference,
                travelers: customerRecords,
                flight: bookedFlight,
            },
        });
    } catch (error) {
        console.log("Booking error:", error);
        const fallbackMessage = "An unexpected error occurred during booking.";
        const backendError =
            error?.response?.data?.errors?.[0]?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            fallbackMessage;

        return res.status(500).json({
            success: false,
            message: backendError,
        });
    }
};

const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        // Step 1: Create a Payment Intent
        const intentRes = await duffel.post('/air/payment_intents', {
            data: {
                type: 'payment_intent',
                currency,
                amount,
            },
        });

        const paymentIntentId = intentRes.data.data.id;
        console.log(paymentIntentId)
        // Step 2: Create a 3D Secure Session for that payment intent
        const sessionRes = await duffel.post('/air/three_d_secure_sessions', {
            data: {
                type: 'three_d_secure_session',
                payment_intent_id: paymentIntentId,
                return_url: 'https://yourdomain.com/flight/complete',
            },
        });

        res.status(200).json({
            success: true,
            paymentIntentId,
            threeDSecureSessionId: sessionRes.data.data.id,
        });

    } catch (error) {
        console.error('Duffel payment error:', error?.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create Duffel payment intent.',
            details: error?.response?.data || error.message,
        });
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



module.exports = { getAllPresentFlights, getFlightPricing, bookFlight, bookTrain, getUpsellOptions, airlineLink, createPaymentIntent };
