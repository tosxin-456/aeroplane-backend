const express = require("express");
const { getAllPresentFlights, bookFlight, getUpsellOptions, airlineLink, createPaymentIntent } = require("../controllers/aeroplanes.controller");
// const { getAllAvailableHotels } = require("../controllers/hotels.controller");

const router = express.Router();

// User Registration and Login
router.post("/search", getAllPresentFlights);
router.post("/get-link", airlineLink  );
router.post("/book", bookFlight);
router.post("/upsell-options", getUpsellOptions );
router.post('/create-payment-intent', createPaymentIntent);


module.exports = router;