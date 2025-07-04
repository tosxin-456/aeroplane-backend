// duffelClient.js
const dotenv = require('dotenv');
dotenv.config()

const axios = require('axios');
console.log(process.env.DUFFEL_ACCESS_TOKEN)
const duffel = axios.create({
    baseURL: 'https://api.duffel.com/air',
    headers: {
        Authorization: `Bearer ${process.env.DUFFEL_ACCESS_TOKEN}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json'
    }
});

module.exports = duffel;
