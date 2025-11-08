const express = require("express");
const { getAllPresentFlights, bookFlight, getUpsellOptions, airlineLink, createPaymentIntent, getAvailableServices, getSelectedOfferDetails, validatePayment } = require("../controllers/aeroplanes.controller");
// const { getAllAvailableHotels } = require("../controllers/hotels.controller");

const router = express.Router();

// User Registration and Login
router.post("/search", getAllPresentFlights);
router.post("/get-link", airlineLink  );
router.post("/book", bookFlight);
router.post("/upsell-options", getUpsellOptions );
router.get("/services/:offerId", getAvailableServices);
router.get("/offer/:offerId", getSelectedOfferDetails);

router.post('/create-payment-intent', createPaymentIntent);
router.post('/validate', validatePayment);



module.exports = router;