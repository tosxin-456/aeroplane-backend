const express = require("express");
const router = express.Router();
const {
    getAllBookedFlights,
    getBookedFlightById,
    createBookedFlight,
    updateBookedFlight,
    deleteBookedFlight
} = require("../controllers/bookedFlights.controller");
const { bookTrain } = require("../controllers/aeroplanes.controller");

// GET all booked flights
router.get("/", getAllBookedFlights);

router.get("/bus-test", bookTrain);


// GET a specific booked flight by ID
router.get("/:id", getBookedFlightById);

// POST create a new booked flight
router.post("/", createBookedFlight);

// PATCH update a booked flight
router.patch("/:id", updateBookedFlight);

// DELETE a booked flight
router.delete("/:id", deleteBookedFlight);

module.exports = router;
