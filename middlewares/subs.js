const multer = require("multer");
const path = require("path");

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../payment_images");
        cb(null, uploadDir); // Save to 'uploads' directory
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName); // Generate unique file name
    },
});

// Initialize multer
const payment = multer({ storage });

module.exports = payment;