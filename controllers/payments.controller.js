const ValidatedPayment = require("../models/payments.model");

// Get all validated payments
const getAllPayments = async (req, res) => {
    try {
        const payments = await ValidatedPayment.findAll();
        return res.status(200).json({ success: true, data: payments });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve payments", error: error.message });
    }
};

// Get a single payment by ID
const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await ValidatedPayment.findByPk(id);

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        return res.status(200).json({ success: true, data: payment });
    } catch (error) {
        console.error("Error fetching payment:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve payment", error: error.message });
    }
};

// Create a new validated payment
const createPayment = async (req, res) => {
    try {
        const newPayment = await ValidatedPayment.create(req.body);
        return res.status(201).json({ success: true, data: newPayment });
    } catch (error) {
        console.error("Error creating payment:", error);
        return res.status(500).json({ success: false, message: "Failed to create payment", error: error.message });
    }
};

// Update a payment
const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await ValidatedPayment.update(req.body, { where: { id } });

        if (!updated) {
            return res.status(404).json({ success: false, message: "Payment not found or no changes made" });
        }

        const updatedPayment = await ValidatedPayment.findByPk(id);
        return res.status(200).json({ success: true, data: updatedPayment });
    } catch (error) {
        console.error("Error updating payment:", error);
        return res.status(500).json({ success: false, message: "Failed to update payment", error: error.message });
    }
};

// Delete a payment
const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ValidatedPayment.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        return res.status(200).json({ success: true, message: "Payment deleted successfully" });
    } catch (error) {
        console.error("Error deleting payment:", error);
        return res.status(500).json({ success: false, message: "Failed to delete payment", error: error.message });
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
};
