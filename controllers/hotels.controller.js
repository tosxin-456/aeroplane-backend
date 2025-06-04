const dotenv = require('dotenv');
dotenv.config();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
    clientId: process.env.AmadeusKey,
    clientSecret: process.env.AmadeusSecret,
});
// console.log(amadeus.shopping.hotelOffersSearch)

const getAllAvailableHotels = async (req, res) => {
    try {
        const {
            cityCode,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity = 10,
            priceRange,
            ratings,
            amenities,
            boardType,
            paymentPolicy,
            currency,
            bestRateOnly,
            hotelSource
        } = req.body;

        // console.log(req.body);

        if (!cityCode || !checkInDate || !checkOutDate) {
            return res.status(400).json({
                success: false,
                message: 'cityCode, checkInDate, and checkOutDate are required.',
            });
        }

        // Step 1: Get hotel IDs in city
        const cityHotels = await amadeus.referenceData.locations.hotels.byCity.get({
            cityCode
        });

        const hotelIds = cityHotels.data.slice(0, 50).map(h => h.hotelId);

        if (!hotelIds.length) {
            return res.status(404).json({
                success: false,
                message: 'No hotels found for this city.'
            });
        }

        // Step 2: Prepare search parameters
        const searchParams = {
            hotelIds: hotelIds.join(','),
            checkInDate,
            checkOutDate,
            adults
        };

        if (roomQuantity) searchParams.roomQuantity = parseInt(roomQuantity);
        if (priceRange) searchParams.priceRange = priceRange;
        if (ratings) searchParams.ratings = parseInt(ratings);

        if (amenities) searchParams.amenities = amenities;
        if (boardType) searchParams.boardType = boardType;
        if (paymentPolicy) searchParams.paymentPolicy = paymentPolicy;
        if (currency) searchParams.currency = currency;
        if (typeof bestRateOnly !== 'undefined') searchParams.bestRateOnly = bestRateOnly;
        if (hotelSource) searchParams.hotelSource = hotelSource;


        if (roomQuantity) searchParams.roomQuantity = parseInt(roomQuantity);
        if (priceRange) searchParams.priceRange = priceRange;
        if (ratings) searchParams.ratings = parseInt(ratings);
        if (amenities && amenities.length > 0) searchParams.amenities = amenities;
        if (boardType) searchParams.boardType = boardType;
        if (paymentPolicy) searchParams.paymentPolicy = paymentPolicy;
        if (currency) searchParams.currency = currency;
        if (typeof bestRateOnly !== 'undefined') searchParams.bestRateOnly = bestRateOnly;
        if (hotelSource) searchParams.hotelSource = hotelSource;

        // Step 3: Get hotel offers
        const offers = await amadeus.shopping.hotelOffersSearch.get(searchParams);
        // console.log(offers.data[0].offers)
        return res.status(200).json({
            success: true,
            data: offers.data,
            meta: offers.meta
        });

    } catch (error) {
        console.error('Error fetching hotel data:', error?.response?.data || error.message || error);
        return res.status(500).json({
            success: false,
            message: 'Failed to find hotels for this criteria',
            error: error?.response?.data || error.message,
        });
    }
};


// Route to get all rooms for a specific hotel
const getHotelRooms = async (req, res) => {
    try {
        const {
            hotelId,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity,
            priceRange,
            currency
        } = req.body;

        if (!hotelId || !checkInDate || !checkOutDate || !adults) {
            return res.status(400).json({
                success: false,
                message: 'hotelId, checkInDate, checkOutDate, and adults are required.',
            });
        }

        // Step 1: Prepare search params
        const searchParams = {
            hotelId,
            checkInDate,
            checkOutDate,
            adults
        };
        // console.log(hotelId, checkInDate, checkOutDate)
        if (roomQuantity) searchParams.roomQuantity = parseInt(roomQuantity);
        if (currency) searchParams.currency = currency;
        if (priceRange) searchParams.priceRange = priceRange;  // (optional) e.g., "100-300"

        // Step 2: Fetch hotel rooms
        const hotelOffers = await amadeus.shopping.hotelOffersByHotel.get(searchParams);

        if (!hotelOffers.data || !hotelOffers.data.offers.length) {
            return res.status(404).json({
                success: false,
                message: 'No rooms found for this hotel and dates.',
            });
        }

        // Step 3: Format the rooms
        const rooms = hotelOffers.data.offers.map((offer, index) => ({
            roomNumber: index + 1,
            roomDescription: offer.room?.description?.text,
            priceTotal: offer.price?.total,
            currency: offer.price?.currency,
            boardType: offer.boardType,
            roomTypeEstimated: offer.room?.typeEstimated,
            paymentPolicy: offer.policies?.paymentType,
            cancellationPolicy: offer.policies?.cancellation,
            amenities: offer.room?.amenities
        }));
        // console.log(rooms)

        return res.status(200).json({
            success: true,
            hotelName: hotelOffers.data.hotel.name,
            hotelId: hotelOffers.data.hotel.hotelId,
            rooms,
        });

    } catch (error) {
        console.error('Error fetching hotel rooms:', error?.response?.data || error.message || error);
        console.log(error)
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch rooms for this hotel.',
            error: error?.response?.data || error.message,
        });
    }
};

// module.exports = { getHotelRooms };


const bookHotel = async (req, res) => {
    try {
        const {
            offerId,
            hotelId,
            checkInDate,
            checkOutDate,
            guestInfo,
            paymentInfo
        } = req.body;

        // Check if the necessary information is provided
        if (!offerId || !hotelId || !checkInDate || !checkOutDate || !guestInfo || !paymentInfo) {
            return res.status(400).json({
                success: false,
                message: 'Offer ID, Hotel ID, check-in date, check-out date, guest information, and payment details are required.'
            });
        }

        // Step 1: Get the booking offer using the provided offer ID and hotel ID
        const offer = await amadeus.shopping.hotelOffer(offerId).get();
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Hotel offer not found.'
            });
        }

        // Step 2: Prepare the booking request
        const bookingParams = {
            hotelId,
            checkInDate,
            checkOutDate,
            guestInfo,   // e.g., name, email, etc.
            paymentInfo, // e.g., card details, billing address
        };

        // Step 3: Create the booking request
        const booking = await amadeus.booking.hotel.create(bookingParams);
        // console.log(booking.data.offers)
        // Step 4: Return the booking confirmation
        return res.status(201).json({
            success: true,
            message: 'Hotel booking successful',
            bookingDetails: booking.data,
        });

    } catch (error) {
        console.error('Error booking hotel:', error?.response?.data || error.message || error);
        return res.status(500).json({
            success: false,
            message: 'Failed to book the hotel',
            error: error?.response?.data || error.message,
        });
    }
};


module.exports = { getAllAvailableHotels, getHotelRooms };
