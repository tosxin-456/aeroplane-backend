const express = require("express");
const router = express.Router();
const {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
} = require("../controllers/payments.controller");

// GET all validated payments
router.get("/", getAllPayments);

// GET a specific payment by ID
router.get("/:id", getPaymentById);

// POST create a new payment
router.post("/", createPayment);

// PATCH update a payment by ID
router.patch("/:id", updatePayment);

// DELETE a payment by ID
router.delete("/:id", deletePayment);

module.exports = router;
