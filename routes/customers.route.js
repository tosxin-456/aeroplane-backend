const express = require("express");
const router = express.Router();
const {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customers.controller");


// GET all customers
router.get("/", getAllCustomers);

// GET a specific customer by ID
router.get("/:id", getCustomerById);

// POST create a new customer
router.post("/", createCustomer);



// PATCH update a customer
router.patch("/:id", updateCustomer);

// DELETE a customer
router.delete("/:id", deleteCustomer);

module.exports = router;
