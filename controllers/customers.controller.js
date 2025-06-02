const Customer = require("../models/customers.model");

// Get all customers
const getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll();
        return res.status(200).json({ success: true, data: customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve customers", error: error.message });
    }
};

// Get a single customer by ID
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findByPk(id);

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        return res.status(200).json({ success: true, data: customer });
    } catch (error) {
        console.error("Error fetching customer:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve customer", error: error.message });
    }
};

// Create a new customer
const createCustomer = async (req, res) => {
    try {
        const newCustomer = await Customer.create(req.body);
        return res.status(201).json({ success: true, data: newCustomer });
    } catch (error) {
        console.error("Error creating customer:", error);
        return res.status(500).json({ success: false, message: "Failed to create customer", error: error.message });
    }
};

// Update a customer
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Customer.update(req.body, { where: { customer_id: id } });

        if (!updated) {
            return res.status(404).json({ success: false, message: "Customer not found or no changes made" });
        }

        const updatedCustomer = await Customer.findByPk(id);
        return res.status(200).json({ success: true, data: updatedCustomer });
    } catch (error) {
        console.error("Error updating customer:", error);
        return res.status(500).json({ success: false, message: "Failed to update customer", error: error.message });
    }
};

// Delete a customer
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Customer.destroy({ where: { customer_id: id } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        return res.status(200).json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
        console.error("Error deleting customer:", error);
        return res.status(500).json({ success: false, message: "Failed to delete customer", error: error.message });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};
