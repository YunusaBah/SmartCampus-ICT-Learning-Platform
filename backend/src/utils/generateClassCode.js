const { randomInt } = require("crypto");
const Course = require("../models/Course");

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateClassCode = async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join("");
        const exists = await Course.findOne({ where: { classCode: code } });
        if (!exists) return code;
    }

    throw new Error("Unable to generate a unique class code");
};

module.exports = generateClassCode;
