const { Sequelize } = require("sequelize");

// Replace these values with your actual database credentials
const sequelize = new Sequelize("aeroplane", "root", "", {
    host: "127.0.0.1",
    port: "3306",
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