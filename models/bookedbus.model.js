const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BookedBus = sequelize.define("BookedBuses", {
    bus_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: DataTypes.INTEGER,
    busOperator: DataTypes.STRING,
    departureCity: DataTypes.STRING,
    arrivalCity: DataTypes.STRING,
    departureDate: DataTypes.STRING,
    arrivalDate: DataTypes.STRING,
    passengers: DataTypes.JSONB,
    seatNumber: DataTypes.STRING,
    bookingCode: DataTypes.STRING
}, {
    tableName: "booked_buses",
    timestamps: true
});

module.exports = BookedBus;
