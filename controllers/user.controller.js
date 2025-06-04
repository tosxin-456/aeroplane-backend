const User = require('../models/users.model');
const bcrypt = require('bcryptjs');

// Create a new user
const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword
        });

        res.status(201).json({ message: "User created successfully.", user });
    } catch (error) {
        res.status(500).json({ message: "Error creating user.", error: error.message });
        console.log(error)
    }
};

const jwt = require("jsonwebtoken");

// Login User
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const fullName = `${user.firstName} ${user.lastName}`;

        const token = jwt.sign(
            {
                id: user.user_id,
                email: user.email,
                fullName
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        res.status(200).json({ message: "Login successful.", token, user, fullName });
    } catch (error) {
        res.status(500).json({ message: "Error during login.", error: error.message });
    }
};


// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users.", error: error.message });
    }
};

// Get a single user
const getSingleUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user.", error: error.message });
    }
};

// Update a user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        await user.update(updates);
        res.status(200).json({ message: "User updated successfully.", user });
    } catch (error) {
        res.status(500).json({ message: "Error updating user.", error: error.message });
    }
};

// Delete a user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        await user.destroy();
        res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user.", error: error.message });
    }
};

module.exports = {
    createUser,
    loginUser,
    getAllUsers,
    getSingleUser,
    updateUser,
    deleteUser
};
