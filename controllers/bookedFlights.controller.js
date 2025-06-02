const BookedFlight = require("../models/bookflight.model");
const airlineNames = require('../airlineIataToName.json')
const cityNames = require('../output.json');
// Get all booked flights


const getAllBookedFlights = async (req, res) => {
    try {
        const bookedFlights = await BookedFlight.findAll();
        console.log(bookedFlights)
        return res.status(200).json({ success: true, data: bookedFlights });
    } catch (error) {
        console.error("Error fetching booked flights:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve booked flights", error: error.message });
    }
};

// Get a single booked flight by ID
const getBookedFlightById = async (req, res) => {
    try {
        const { id } = req.params;
        const flight = await BookedFlight.findByPk(id);

        if (!flight) {
            return res.status(404).json({ success: false, message: "Booked flight not found" });
        }

        return res.status(200).json({ success: true, data: flight });
    } catch (error) {
        console.error("Error fetching booked flight:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve booked flight", error: error.message });
    }
};

// Create a new booked flight
const createBookedFlight = async (req, res) => {
    try {
        const newFlight = await BookedFlight.create(req.body);
        return res.status(201).json({ success: true, data: newFlight });
    } catch (error) {
        console.error("Error creating booked flight:", error);
        return res.status(500).json({ success: false, message: "Failed to create booked flight", error: error.message });
    }
};

// Update a booked flight
const updateBookedFlight = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await BookedFlight.update(req.body, { where: { id } });

        if (!updated) {
            return res.status(404).json({ success: false, message: "Booked flight not found or no changes made" });
        }

        const updatedFlight = await BookedFlight.findByPk(id);
        return res.status(200).json({ success: true, data: updatedFlight });
    } catch (error) {
        console.error("Error updating booked flight:", error);
        return res.status(500).json({ success: false, message: "Failed to update booked flight", error: error.message });
    }
};

// Delete a booked flight
const deleteBookedFlight = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await BookedFlight.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Booked flight not found" });
        }

        return res.status(200).json({ success: true, message: "Booked flight deleted successfully" });
    } catch (error) {
        console.error("Error deleting booked flight:", error);
        return res.status(500).json({ success: false, message: "Failed to delete booked flight", error: error.message });
    }
};

module.exports = {
    getAllBookedFlights,
    getBookedFlightById,
    createBookedFlight,
    updateBookedFlight,
    deleteBookedFlight
};
