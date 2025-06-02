const express = require("express");
const router = express.Router();
const { busRoutes, busTrips, busOperators } = require("../controllers/buses.controller");


router.get("/", busRoutes);

router.get("/trip", busTrips);

router.get("/operators", busOperators);



module.exports = router;
