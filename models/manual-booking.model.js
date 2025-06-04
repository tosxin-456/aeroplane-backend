const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ManualFlightBooking = sequelize.define(
    "ManualFlightBooking",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        bookingReference: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: "PNR or Amadeus reference",
        },

        flightOfferId: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        airlineCode: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        origin: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        destination: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        departureTime: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        arrivalTime: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        travelerCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        travelersInfo: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: "Only the traveler objects from Amadeus",
        },

        paymentDetails: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: "Amadeus payment info (paymentMethods, contacts, etc.)",
        },

        ticketingOption: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "e.g., DELAY_TO_CANCEL, IMMEDIATE",
        },

        latestTicketingDate: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        amadeusBookingData: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: "The entire Amadeus booking response",
        },

        status: {
            type: DataTypes.ENUM("pending", "manually_confirmed", "failed"),
            defaultValue: "pending",
        },

        confirmedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        checkInLink: {
            type: DataTypes.TEXT,
            allowNull: true,
        }
    },
    {
        tableName: "manual_flight_bookings",
        timestamps: true,
    }
);

module.exports = ManualFlightBooking;
