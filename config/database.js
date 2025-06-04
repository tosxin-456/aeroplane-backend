const { Sequelize } = require("sequelize");

// Replace these values with your actual database credentials
const sequelize = new Sequelize("sql7783021", "sql7783021", "KSLqFZ1xsY", {
  host: "sql7.freesqldatabase.com",
  port: 3306,
  dialect: "mysql",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});


module.exports = sequelize;

// Db: jijopxgq_teechaa
// Username: jijopxgq_topyuo
// Pass:zV%v!7irePoy