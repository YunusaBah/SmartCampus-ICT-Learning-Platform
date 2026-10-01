const fs = require("fs/promises");

const discardUpload = async (file) => {
    if (!file?.path) return;

    try {
        await fs.unlink(file.path);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Failed to remove rejected upload:", error);
        }
    }
};

module.exports = discardUpload;
