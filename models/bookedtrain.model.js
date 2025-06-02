const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BookedTrain = sequelize.define("BookedTrains", {
    train_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: DataTypes.INTEGER,
    trainOperator: DataTypes.STRING,
    departureStation: DataTypes.STRING,
    arrivalStation: DataTypes.STRING,
    departureDate: DataTypes.STRING,
    arrivalDate: DataTypes.STRING,
    passengers: DataTypes.JSONB,
    seatNumber: DataTypes.STRING,
    bookingCode: DataTypes.STRING
}, {
    tableName: "booked_trains",
    timestamps: true
});

module.exports = BookedTrain;
