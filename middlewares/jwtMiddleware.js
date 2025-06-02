require('dotenv').config();
const jwt = require("jsonwebtoken");

const jwtMiddleware = (req, res, next) => {
    // Get token from the Authorization header (Bearer <token>)
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        // Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;

        next();
    } catch (error) {
        console.error("JWT verification failed:", error); // Optional logging for debugging
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

module.exports = jwtMiddleware;
