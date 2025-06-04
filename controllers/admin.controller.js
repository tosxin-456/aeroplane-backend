// require('dotenv').config()
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const registerAdmin = async (req, res) => {
    // console.log("object")
    try {
        const { firstName, lastName, password, profile_image, role, email } = req.body;
        // console.log(req.body)

        // Check if admin already exists (use firstName and lastName for simplicity)
        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        const newAdmin = await Admin.create({
            firstName,
            lastName,
            password: hashedPassword,
            profile_image,
            role,
            email
        });

        res.status(201).json({ message: "Admin registered successfully.", admin: newAdmin });
    } catch (error) {
        res.status(500).json({ message: "An error occurred during registration.", error: error.message });
        console.log(error)

    }
};

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if admin exists
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const fullName = `${admin.firstName} ${admin.lastName}`

        // Generate token
        const token = jwt.sign(
            { id: admin.admin_id, role: admin.role, email: admin.email, fullName },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        res.status(200).json({ message: "Login successful.", token, admin, fullName,  });
    } catch (error) {
        res.status(500).json({ message: "An error occurred during login.", error: error.message });
        console.log(error)
    }
};

const getAdmins = async (req, res) => {
    try {
        const admins = await Admin.findAll();
        res.status(200).json({ admins });
    } catch (error) {
        res.status(500).json({ message: "An error occurred while retrieving admins.", error: error.message });
    }
};

const getSingleAdmin = async (req, res) => {
    // console.log("here")
    try {
        const { id } = req.params;

        const admin = await Admin.findOne({ where: { admin_id: id } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        res.status(200).json({ admin });
    } catch (error) {
        res.status(500).json({ message: "An error occurred while retrieving the admin.", error: error.message });
    }
};

const updateAdminDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const admin = await Admin.findOne({ where: { admin_id: id } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        if (updates.password) {
            const saltRounds = 10;
            updates.password = await bcrypt.hash(updates.password, saltRounds);
        }

        // Update admin details
        await admin.update(updates);

        res.status(200).json({ message: "Admin details updated successfully.", admin });
    } catch (error) {
        console.error("Error updating admin details:", error);
        console.log(error)
        res.status(500).json({
            message: "An error occurred while updating admin details.",
            error: error.message
        });
    }
};

const updateProfileImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const user = await Admin.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if there is an old profile image
        const oldProfileImage = user.profile_image;
        if (oldProfileImage) {
            // Extract the filename from the old URL
            const oldFileName = path.basename(oldProfileImage);

            // Delete the old profile image from the server
            const oldFilePath = path.join(__dirname, "..", "uploads", oldFileName);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Generate the file URL for the new image
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

        // Update user profile with the new image URL
        await user.update({ profile_image: fileUrl });

        res.status(200).json({ message: "Profile image updated successfully.", profile_image: fileUrl });
    } catch (error) {
        console.error("Error updating profile image:", error);
        res.status(500).json({ message: "Internal server error.", error: error.message });
    }
};

const updateAdminPassword = async (req, res) => {
    try {
        const { email } = req.params;
        const { current, updated } = req.body;

        if (!updated || updated.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long." });
        }

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const isCurrentPasswordCorrect = await bcrypt.compare(current, admin.password);
        if (!isCurrentPasswordCorrect) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const isSameAsOld = await bcrypt.compare(updated, admin.password);
        if (isSameAsOld) {
            return res.status(400).json({ message: "New password must be different from the current password." });
        }

        const hashedPassword = await bcrypt.hash(updated, 10);
        admin.password = hashedPassword;
        await admin.save();

        res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};




module.exports = {
    registerAdmin,
    loginAdmin,
    getAdmins,
    getSingleAdmin,
    updateAdminDetails,
    updateProfileImage,
    updateAdminPassword
};
