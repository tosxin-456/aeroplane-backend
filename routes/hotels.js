const express = require("express");
const { getAllAvailableHotels, getHotelRooms } = require("../controllers/hotels.controller");


const router = express.Router();

// User Registration and Login
router.post("/", getAllAvailableHotels);

router.post("/rooms", getHotelRooms);


module.exports = router;