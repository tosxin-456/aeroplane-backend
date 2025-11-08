const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ValidatedPayment = sequelize.define("ValidatedPayment", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    stripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    stripePaymentMethodId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    amount: {
        type: DataTypes.INTEGER, // Store in cents for consistency with Stripe
        allowNull: false,
    },
    charge: {
        type: DataTypes.INTEGER, // Store in cents if you're calculating a fee (e.g. 15%)
        allowNull: true,
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'succeeded', 'failed'),
        defaultValue: 'pending',
    },
    reference: {
        type: DataTypes.STRING,
        allowNull: true, // Optional external reference ID
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
    }
}, {
    tableName: "validated_payments",
    timestamps: true,
});

module.exports = ValidatedPayment;
