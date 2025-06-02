const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Card = sequelize.define(
  "Card",
  {
    card_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stripePaymentMethodId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    brand: {
      type: DataTypes.STRING, // e.g., "Visa"
    },
    last4: {
      type: DataTypes.STRING(4),
    },
    expMonth: {
      type: DataTypes.INTEGER,
    },
    expYear: {
      type: DataTypes.INTEGER,
    },
    country: {
      type: DataTypes.STRING,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "cards",
    timestamps: true,
  }
);

module.exports = Card;
