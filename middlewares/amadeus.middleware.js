const dotenv = require('dotenv');
dotenv.config()
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
    clientId: process.env.AmadeusKey,
    clientSecret: process.env.AmadeusSecret,
});

module.exports = {
    amadeus
}
