const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BookedFlight = sequelize.define("BookedFlights", {
    flight_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    customerId: DataTypes.INTEGER, // Foreign key
    offerId: DataTypes.STRING,
    bookingReference: DataTypes.STRING,
    airline: DataTypes.STRING,
    origin: DataTypes.STRING,
    destination: DataTypes.STRING,
    departureTime: DataTypes.STRING,
    arrivalTime: DataTypes.STRING,
    travelersInfo: DataTypes.JSONB,
    rawOfferData: DataTypes.JSONB,
    status: {
        type: DataTypes.ENUM("confirmed", "pending", "cancelled"),
        allowNull: false,
        defaultValue: "pending"
    }
}, {
    tableName: "booked_flights",
    timestamps: true
});

module.exports = BookedFlight;
