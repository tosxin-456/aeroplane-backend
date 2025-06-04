const express = require('express');
const router = express.Router();
const manualBookingController = require('../controllers/manual-booking.controller');

router.get('/', manualBookingController.getAllManualBookings);
router.get('/:id', manualBookingController.getManualBookingById);
router.post('/', manualBookingController.createManualBooking);
router.put('/:id', manualBookingController.updateManualBooking);
router.delete('/:id', manualBookingController.deleteManualBooking);

module.exports = router;
