require("../src/config/env");

const { sequelize } = require("../src/config/db");
const runMigrations = require("../src/utils/runMigrations");

runMigrations()
    .then(() => sequelize.close())
    .catch(async (error) => {
        console.error("Database migration failed:", error);
        await sequelize.close();
        process.exitCode = 1;
    });
