const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Customer = sequelize.define(
    "Customers",
    {
        customer_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        travelerId: {
            type: DataTypes.STRING,
            allowNull: true, // optional internal reference
        },

        travelerType: {
            type: DataTypes.ENUM("ADULT", "CHILD", "INFANT"),
            defaultValue:"ADULT",
            allowNull: false,
        },

        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        gender: {
            type: DataTypes.ENUM("MALE", "FEMALE"),
            allowNull: false,
        },

        dateOfBirth: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        emailAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        documentType: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        documentNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        expiryDate: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        issuanceCountry: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        nationality: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: "customers",
        timestamps: true,
    }
);

module.exports = Customer;
