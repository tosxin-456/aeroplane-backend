const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const sequelize = require('./config/database');
const path = require("path");
const fs = require('fs');
dotenv.config();

const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const AdminRoutes = require("./routes/admin.route");
const AeroplaneRoutes = require("./routes/aeroplanes.route");
const HostelRoutes = require("./routes/hotels");
const PaymentRoutes = require("./routes/payment.route");
const CustomerRoutes = require("./routes/customers.route");
const BookedFlightRoutes = require("./routes/booked.route");
const BusRoutes = require("./routes/bus.router");
const TrainRoutes = require("./routes/trains.router");
const ManualBookingRoutes = require("./routes/manual-booking.controller");



app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/payment_images", express.static(path.join(__dirname, "payment_images")));
app.use("/question_images", express.static(path.join(__dirname, "question_images")));



app.use('/api/admin', AdminRoutes);
app.use('/api/flights', AeroplaneRoutes);
app.use('/api/hotels', HostelRoutes);
app.use("/api/payments", PaymentRoutes);
app.use("/api/customers", CustomerRoutes);
app.use("/api/booked-flights", BookedFlightRoutes);
app.use("/api/bus-routes", BusRoutes);
app.use("/api/train-routes", TrainRoutes);
app.use("/api/manual-booking", ManualBookingRoutes);





// Database connection
sequelize
    .authenticate()
    .then(() => {
        console.log("Connection has been established successfully.");

        // Sync all models to the database
        return sequelize.sync(); // You can also use { alter: true } during development
    })
    .then(() => {
        console.log("All models were synchronized successfully.");
    })
    .catch((error) => {
        console.error("Unable to connect to the database:", error);
    });

const airportData = JSON.parse(fs.readFileSync(path.join(__dirname, 'output.json'), 'utf-8'));
const airlineData = JSON.parse(fs.readFileSync(path.join(__dirname, 'airlineIataToName.json'), 'utf-8'));

// Middleware to serve the data
app.get('/api/airports', (req, res) => {
    const { country, city } = req.query;

    // No query: return all
    if (!country) {
        return res.json(airportData);
    }

    const selectedCountry = airportData[country];
    if (!selectedCountry) {
        return res.status(404).json({ message: 'Country not found' });
    }

    // Only country: return all cities in that country
    if (!city) {
        return res.json(selectedCountry);
    }

    const selectedCity = selectedCountry[city];
    if (!selectedCity) {
        return res.status(404).json({ message: 'City not found in that country' });
    }

    // Return specific city's airports
    res.json(selectedCity);
});

app.get('/api/airline', (req, res) => {
    const { country, city } = req.query;

    // No query: return all
    if (!country) {
        return res.json(airlineData);
    }

    const selectedCountry = airportData[country];
    if (!selectedCountry) {
        return res.status(404).json({ message: 'Country not found' });
    }

    // Only country: return all cities in that country
    if (!city) {
        return res.json(selectedCountry);
    }

    const selectedCity = selectedCountry[city];
    if (!selectedCity) {
        return res.status(404).json({ message: 'City not found in that country' });
    }

    // Return specific city's airports
    res.json(selectedCity);
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Test route for fetching transit data from Transitland API
app.get('/test-transit', async (req, res) => {
    const API_KEY = 'rDCJeY7aPs2jqGowjHTyigo6TYzYRky3';

    try {
        // Get all BART routes - this endpoint is confirmed working
        const url = `https://transit.land/api/v2/rest/routes?apikey=${API_KEY}&operated_by=o-9q9-bart`;

        console.log('Testing routes URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error Response: ${errorText}`);
            throw new Error(`TransitLand API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        res.json({
            success: true,
            url: url, // Include for debugging
            data: data
        });

    } catch (error) {
        console.error('Transit API test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
});
app.get('/test-schedules', async (req, res) => {
    const API_KEY = 'rDCJeY7aPs2jqGowjHTyigo6TYzYRky3';

    try {
        // BART route schedule (Yellow Line)
        const routeId = 'r-9q9-yellow';
        const date = '2025-05-02';

        const params = new URLSearchParams({
            apikey: API_KEY,
            date: date,
            per_page: 10
        });

        const url = `https://transit.land/api/v2/rest/routes/${routeId}/schedule?${params.toString()}`;

        console.log('Testing schedules URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error Response: ${errorText}`);
            throw new Error(`TransitLand API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        res.json({
            success: true,
            url: url, // Include for debugging
            data: data
        });

    } catch (error) {
        console.error('Transit schedules test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
});


;


app.get('/test-operators', async (req, res) => {
    const API_KEY = 'rDCJeY7aPs2jqGowjHTyigo6TYzYRky3';

    const lat = req.query.lat || 51.5074;   // Default: London
    const lon = req.query.lon || -0.1278;
    const radius = req.query.radius || 1000;


    try {
        const params = new URLSearchParams({
            apikey: API_KEY,
            lat: lat,
            lon: lon,
            r: radius
        });

        const url = `https://transit.land/api/v2/rest/operators?${params.toString()}`;
        console.log('Testing operators URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error Response: ${errorText}`);
            throw new Error(`TransitLand API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Keywords to help infer train/rail operators
        const railKeywords = ['rail', 'bart', 'train', 'subway', 'metro', 'lrt', 'mrt'];

        // Identify rail/train operators based on name or provider hints
        const trainOperators = data.operators.filter(op => {
            const name = op.name?.toLowerCase() || '';
            const shortName = op.short_name?.toLowerCase() || '';
            const providerId = op.tags?.omd_provider_id?.toLowerCase() || '';
            return railKeywords.some(kw =>
                name.includes(kw) || shortName.includes(kw) || providerId.includes(kw)
            );
        });

        // Identify bus operators based on route_types tag, if available
        const busOperators = data.operators.filter(op => {
            const routeTypes = op.tags?.route_types || '';
            return routeTypes.includes('bus');
        });

        res.json({
            success: true,
            url,
            totalFound: data.operators.length,
            trainsOnly: trainOperators.length,
            busesOnly: busOperators.length,
            trainOperators,
            busOperators
        });

    } catch (error) {
        console.error('Transit operators test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
});



