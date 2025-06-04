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

        // STEP 1: BOOK FLIGHT VIA AMADEUS
        let bookingData;
        try {
            const bookingResponse = await amadeus.booking.flightOrders.post(
                JSON.stringify({
                    data: {
                        type: "flight-order",
                        flightOffers: [flightOffer],
                        travelers: travelersInfo,
                    },
                })
            );
            bookingData = bookingResponse.data;
            // console.log(bookingData)
        } catch (err) {
            const amadeusError =
                err?.response?.data?.errors?.[0]?.detail ||
                err?.response?.data?.message ||
                err.message;

            return res.status(400).json({
                success: false,
                message: `Amadeus Booking Failed: ${amadeusError}`,
            });
        }

        // STEP 2: SAVE TRAVELERS AS CUSTOMERS
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
        
        // STEP 3: SAVE BOOKED FLIGHT
        const flightSegment = flightOffer.itineraries[0].segments[0]; // assumes 1 itinerary
        const bookingReference = bookingData?.associatedRecords?.[0]?.reference || bookingData?.id;
        // const bookingReference = bookingData?.id || uuidv4();

        const bookedFlight = await BookedFlight.create({
            customerId: customerRecords[0].customer_id,
            offerId: flightOffer.id,
            bookingReference,
            airline: flightSegment.carrierCode,
            origin: flightSegment.departure.iataCode,
            destination: flightSegment.arrival.iataCode,
            departureTime: flightSegment.departure.at,
            arrivalTime: flightSegment.arrival.at,
            travelersInfo,
            rawOfferData: flightOffer,
            status: "confirmed",
        });

        // STEP 4: SAVE PAYMENT
        const totalAmount = paymentDetails.amount; // this is already amount + 15%
        const totalPrice = parseFloat((totalAmount / 1.15).toFixed(2));
        const totalCharge = parseFloat((totalAmount - totalPrice).toFixed(2));
        

        await ValidatedPayment.create({
            userId: customerRecords[0].customer_id,
            amount: totalAmount * 100,
            currency,
            charge: totalCharge * 100,
            paymentMethod: paymentDetails.paymentMethod || "card",
            status: paymentDetails.status || "succeeded",
            reference: paymentDetails.paymentMethodId,
            metadata: {
                flightOfferId: flightOffer.id,
                bookingReference,
                travelersCount: travelersInfo.length,
            },
        });

        const segment = flightOffer.itineraries?.[0]?.segments?.[0] || {};
        const lastSegment =
            flightOffer.itineraries?.[0]?.segments?.slice(-1)?.[0] || {};
        const departureTime = segment.departure?.at || null;
        const arrivalTime = lastSegment.arrival?.at || null;

        // STEP 5: GENERATE CHECK-IN LINK VIA OpenAI
        let checkInLink = null;
        try {
            const formattedDate = new Date(flightSegment.departure.at).toDateString();
            const openaiRes = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a travel assistant that helps users find airline booking or check-in URLs using airline code, origin, destination, and date.",
                    },
                    {
                        role: "user",
                        content: `Find the booking or check-in URL for airline with IATA code "${flightSegment.carrierCode}", flying from ${flightSegment.departure.iataCode} to ${flightSegment.arrival.iataCode} on ${formattedDate}. Respond with only the full URL.`,
                    },
                ],
            });
            checkInLink = openaiRes.choices?.[0]?.message?.content?.trim() || null;
        } catch (err) {
            console.warn("OpenAI URL generation failed:", err.message);
        }

        const detailedPaymentDetails = {
            ...paymentDetails,
            totalAmount,
            totalPrice,
            totalCharge
          };

        // STEP 6: SAVE MANUAL FLIGHT BOOKING
        await ManualFlightBooking.create({
            userId,
            bookingReference,
            flightOfferId: flightOffer.id,
            airlineCode: segment.carrierCode,
            origin: segment.departure.iataCode,
            destination: lastSegment.arrival.iataCode,
            departureTime,
            arrivalTime,
            travelerCount: travelersInfo.length,
            travelersInfo,
            paymentDetails: detailedPaymentDetails,
            ticketingOption: bookingData?.ticketingAgreement?.option || null,
            latestTicketingDate: bookingData?.ticketingAgreement?.latestTicketingDate || null,
            amadeusBookingData: bookingData,
            checkInLink,
            status: "pending",
        });

        // FINAL SUCCESS RESPONSE
        return res.status(200).json({
            success: true,
            message: "Flight booked successfully",
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
