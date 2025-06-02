const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("Users", {
    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: DataTypes.STRING,
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: "users",
    timestamps: true
});

module.exports = User;
