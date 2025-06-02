const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ValidatedPayment = sequelize.define("ValidatedPayments", {
    payment_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: DataTypes.INTEGER,
    amount: DataTypes.FLOAT, // Total amount including charge
    charge: DataTypes.FLOAT, // 15% service charge
    currency: DataTypes.STRING,
    paymentMethod: DataTypes.STRING,
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending' // or 'successful', 'failed'
    },
    reference: DataTypes.STRING,
    metadata: DataTypes.JSONB
}, {
    tableName: "validated_payments",
    timestamps: true
});

module.exports = ValidatedPayment;
