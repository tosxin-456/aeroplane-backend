const crypto = require("crypto");

const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString(); // Generate a number between 100000 and 999999
};

module.exports = generateOTP;
