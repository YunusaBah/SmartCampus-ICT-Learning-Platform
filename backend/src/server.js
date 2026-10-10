require("./config/env");

const fs = require("fs");
const path = require("path");

const app = require("./app");
const { sequelize, connectDB } = require("./config/db");
require("./models/associations");
const runMigrations = require("./utils/runMigrations");
const sendDeadlineReminders = require("./utils/deadlineReminders");

const uploadsDir = require("./utils/uploadsDirectory");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (process.env.NODE_ENV === "production" && !process.env.UPLOADS_DIR) {
    console.warn("UPLOADS_DIR is unset; uploaded course and submission files are on ephemeral local storage.");
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

const validateEnvironment = () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
        process.env.JWT_SECRET === "change_this_to_a_long_random_secret") {
        throw new Error("Set JWT_SECRET to a random value of at least 32 characters");
    }
    if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
        throw new Error("PORT must be a valid port number");
    }
};

const startServer = async () => {
    try {
        validateEnvironment();
        await connectDB();
        await runMigrations();
        await sequelize.sync();
        console.log("Database synced");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
        const runReminderSweep = () => {
            sendDeadlineReminders().catch((error) => {
                console.error("Deadline reminder sweep failed:", error.message);
            });
        };
        runReminderSweep();
        const reminderTimer = setInterval(runReminderSweep, 15 * 60 * 1000);
        reminderTimer.unref();
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
