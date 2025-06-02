const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BookedHotel = sequelize.define("BookedHotels", {
    hotel_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: DataTypes.INTEGER,
    hotelName: DataTypes.STRING,
    offerId: DataTypes.STRING,
    cityCode: DataTypes.STRING,
    checkInDate: DataTypes.STRING,
    checkOutDate: DataTypes.STRING,
    guests: DataTypes.JSONB,
    payments: DataTypes.JSONB,
    rawOfferData: DataTypes.JSONB
}, {
    tableName: "booked_hotels",
    timestamps: true
});

module.exports = BookedHotel;
