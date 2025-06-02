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
const amadeus = new Amadeus({
    clientId: process.env.AmadeusKey,
    clientSecret: process.env.AmadeusSecret,
});


const getAllPresentFlights = async (req, res) => {
    try {
        const formData = req.body;

        // Create the initial payload with departure details
        const payload = {
            currencyCode: formData.currencyCode,
            originDestinations: [
                {
                    id: "1",
                    originLocationCode: formData.originLocationCode,
                    destinationLocationCode: formData.destinationLocationCode,
                    departureDateTimeRange: {
                        date: formData.departureDate,
                        ...(formData.departureTime && { time: formData.departureTime + ":00" })
                    }
                }
            ],
            travelers: [{ id: "1", travelerType: "ADULT", count: formData.travelers }],
            sources: ["GDS"],
            searchCriteria: {
                maxFlightOffers: 250,
                flightFilters: {
                    cabinRestrictions: [{
                        cabin: formData.cabinClass,
                        coverage: "MOST_SEGMENTS",
                        originDestinationIds: ["1"]
                    }]
                }
            }
        };

        // If the trip type is roundtrip, add the returnDate to the payload
        if (formData.tripType === "roundtrip" && formData.returnDate) {
            payload.originDestinations.push({
                id: "2",
                originLocationCode: formData.destinationLocationCode,
                destinationLocationCode: formData.originLocationCode,
                departureDateTimeRange: {
                    date: formData.returnDate,
                    ...(formData.departureTime && { time: formData.departureTime + ":00" })
                }
            });
        }

        const response = await amadeus.shopping.flightOffersSearch.post(JSON.stringify(payload));
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Error fetching flight data:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch flights", error: error?.response?.data || error.message });
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
                    content: `I couldn't find the check-in URL for the airline with IATA code "${airlineCode}". What is the likely website page for the site for booking, Respond with only the link.`
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
        console.log(response)
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
        const { flightOffer, travelersInfo, paymentDetails, userId } = req.body;

        const { amount, currency } = paymentDetails;
        // console.log(paymentDetails)
        // Step 3: Book flight via Amadeus
        const bookingResponse = await amadeus.booking.flightOrders.post(
            JSON.stringify({
                data: {
                    type: "flight-order",
                    flightOffers: [flightOffer],
                    travelers: travelersInfo,
                },
            })
        );

        const bookingData = bookingResponse.data;
        // console.log(bookingData)
        // Step 4: Save traveler info as Customers
        const customerRecords = await Promise.all(
            travelersInfo.map(async (traveler) => {
                return await Customer.create({
                    travelerId: traveler.id || null,
                    travelerType: traveler.travelerType,
                    firstName: traveler.name.firstName,
                    lastName: traveler.name.lastName,
                    gender: traveler.gender,
                    dateOfBirth: traveler.dateOfBirth,
                    emailAddress: traveler.contact?.emailAddress || null,
                    phoneNumber: traveler.contact?.phones?.[0]?.number || null,
                    documentType: traveler.documents?.[0]?.documentType || null,
                    documentNumber: traveler.documents?.[0]?.number || null,
                    expiryDate: traveler.documents?.[0]?.expiryDate || null,
                    issuanceCountry: traveler.documents?.[0]?.issuanceCountry || null,
                    nationality: traveler.documents?.[0]?.nationality || null,
                });
            })
        );
        // console.log(stripeToken)
        // Step 5: Save BookedFlight
        const flightSegment = flightOffer.itineraries[0].segments[0]; // Assumes 1 itinerary
        const bookedFlight = await BookedFlight.create({
            customerId: customerRecords[0].customer_id, // primary customer
            offerId: flightOffer.id,
            bookingReference: bookingData?.id || uuidv4(),
            airline: flightSegment.carrierCode,
            origin: flightSegment.departure.iataCode,
            destination: flightSegment.arrival.iataCode,
            departureTime: flightSegment.departure.at,
            arrivalTime: flightSegment.arrival.at,
            travelersInfo,
            rawOfferData: flightOffer,
            status: "confirmed" // ✅ Booking successful, so mark as confirmed
        });

        // Step 7: Save Payment
        const serviceCharge = amount * 0.15;
        const totalAmount = amount + serviceCharge;

        await ValidatedPayment.create({
            userId: customerRecords[0].customer_id,
            amount: totalAmount * 100, // stored in cents if needed
            currency,
            charge: serviceCharge * 100, // also in cents if needed
            paymentMethod: charge.payment_method_details.type,
            status: "successful",
            reference: charge.id,
            metadata: {
                flightOfferId: flightOffer.id,
                bookingReference: bookingData.id,
                travelersCount: travelersInfo.length,
            }
        });
        

        return res.status(200).json({
            success: true,
            message: "Flight booked successfully",
            data: {
                bookingReference: bookingData.id,
                // paymentId: charge.id,
                travelers: customerRecords,
                flight: bookedFlight
            }
        });

    } catch (error) {
        console.error("Booking error:", error);
        return res.status(500).json({
            success: false,
            message: "Booking failed",
            error: error?.response?.data || error.message,
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



module.exports = { getAllPresentFlights, getFlightPricing, bookFlight, bookTrain, getUpsellOptions, airlineLink };
