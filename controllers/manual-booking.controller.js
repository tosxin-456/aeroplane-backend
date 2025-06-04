const ManualFlightBooking = require("../models/manual-booking.model");

// Get all manual flight bookings
const getAllManualBookings = async (req, res) => {
    try {
        const bookings = await ManualFlightBooking.findAll();
        return res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        console.error("Error fetching manual bookings:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve manual bookings", error: error.message });
    }
};

// Get a single manual booking by ID
const getManualBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await ManualFlightBooking.findByPk(id);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Manual booking not found" });
        }

        return res.status(200).json({ success: true, data: booking });
    } catch (error) {
        console.error("Error fetching manual booking:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve manual booking", error: error.message });
    }
};

// Create a new manual booking
const createManualBooking = async (req, res) => {
    try {
        const newBooking = await ManualFlightBooking.create(req.body);
        return res.status(201).json({ success: true, data: newBooking });
    } catch (error) {
        console.error("Error creating manual booking:", error);
        return res.status(500).json({ success: false, message: "Failed to create manual booking", error: error.message });
    }
};

// Update a manual booking
const updateManualBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await ManualFlightBooking.update(req.body, { where: { id } });

        if (!updated) {
            return res.status(404).json({ success: false, message: "Manual booking not found or no changes made" });
        }

        const updatedBooking = await ManualFlightBooking.findByPk(id);
        return res.status(200).json({ success: true, data: updatedBooking });
    } catch (error) {
        console.error("Error updating manual booking:", error);
        return res.status(500).json({ success: false, message: "Failed to update manual booking", error: error.message });
    }
};

// Delete a manual booking
const deleteManualBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ManualFlightBooking.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Manual booking not found" });
        }

        return res.status(200).json({ success: true, message: "Manual booking deleted successfully" });
    } catch (error) {
        console.error("Error deleting manual booking:", error);
        return res.status(500).json({ success: false, message: "Failed to delete manual booking", error: error.message });
    }
};

module.exports = {
    getAllManualBookings,
    getManualBookingById,
    createManualBooking,
    updateManualBooking,
    deleteManualBooking
};
