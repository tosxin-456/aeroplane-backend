const express = require("express");
const router = express.Router();
const { trainRoutes, trainOperators, trainTrips } = require("../controllers/train.controller");


router.get("/", trainRoutes);

router.get("/trip", trainTrips);

router.get("/operators", trainOperators);


module.exports = router;
