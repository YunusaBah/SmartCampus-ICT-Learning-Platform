const path = require("path");

module.exports = path.resolve(
    process.env.UPLOADS_DIR || path.join(__dirname, "../../uploads")
);
