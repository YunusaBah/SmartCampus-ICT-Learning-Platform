const { Sequelize } = require("sequelize");
require("./env");

const required = ["DB_HOST", "DB_NAME", "DB_USER"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
    throw new Error(`Missing required database configuration: ${missing.join(", ")}`);
}

const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error("DB_PORT must be a valid port number");
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: dbPort,
        dialect: "mysql",
        logging: false,
        dialectOptions: process.env.DB_SSL === "true"
            ? { ssl: { require: true, rejectUnauthorized: false } }
            : {}
    }
);

/*
  Function to test database connection
*/
const connectDB = async () => {
    await sequelize.authenticate();
    console.log("Database connected successfully");
};

module.exports = { sequelize, connectDB };