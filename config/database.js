const { Sequelize } = require("sequelize");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(
  isProduction ? process.env.PROD_DB_NAME : process.env.DEV_DB_NAME,
  isProduction ? process.env.PROD_DB_USER : process.env.DEV_DB_USER,
  isProduction ? process.env.PROD_DB_PASS : process.env.DEV_DB_PASS,
  {
    host: isProduction ? process.env.PROD_DB_HOST : process.env.DEV_DB_HOST,
    port: isProduction ? process.env.PROD_DB_PORT : process.env.DEV_DB_PORT,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
