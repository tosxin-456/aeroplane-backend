const express = require("express");

const upload = require("../middlewares/upload");
const jwtMiddleware = require("../middlewares/jwtMiddleware");
const { registerAdmin, loginAdmin, getAdmins, getSingleAdmin, updateAdminDetails, updateProfileImage, getUserAnswers, getAllAnswers, updateAdminPassword } = require("../controllers/admin.controller");

const router = express.Router();

// User Registration and Login
router.post("/register", registerAdmin);


router.post("/login", loginAdmin);

// Get all users
router.get("/", getAdmins);

// Get a single user by ID
router.get("/:id", getSingleAdmin);

// Update user details
router.put("/:id", updateAdminDetails);

router.patch('/:email/password', updateAdminPassword);


router.patch("/profile-image/:id", upload.single("profile_image"), updateProfileImage);


module.exports = router;