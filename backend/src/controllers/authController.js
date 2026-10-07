const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sanitizeUser = require("../utils/sanitizeUser");
const {
    normalizeEmail,
    normalizeName,
    normalizePhone,
    normalizeStudentId,
    validatePassword
} = require("../utils/authValidation");

require("../config/env");

exports.register = async (req, res) => {
    try {
        const { fullName, email, password, lecturerCode, matNumber, phone, role: requestedRole } = req.body;
        const normalizedName = normalizeName(fullName);
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedName) {
            return res.status(400).json({ message: "Enter a name between 2 and 255 characters" });
        }
        if (!normalizedEmail) {
            return res.status(400).json({ message: "Enter a valid email address" });
        }
        if (typeof password !== "string" || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ message: "Password must be no more than 72 bytes" });
        }

        const existingUser = await User.findOne({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        let role = "student";

        if (requestedRole !== undefined && !["student", "lecturer"].includes(requestedRole)) {
            return res.status(400).json({ message: "Choose a valid account type" });
        }
        if (requestedRole === "lecturer" ||
            (requestedRole === undefined && lecturerCode !== undefined)) {
            if (typeof lecturerCode !== "string" || !lecturerCode.trim() ||
                !process.env.LECTURER_CODE || lecturerCode !== process.env.LECTURER_CODE) {
                return res.status(400).json({ message: "A valid lecturer code is required" });
            }
            role = "lecturer";
        }

        const normalizedMatNumber = normalizeStudentId(matNumber);
        const normalizedPhone = normalizePhone(phone);
        if (role === "student" && (!normalizedMatNumber || !normalizedPhone)) {
            return res.status(400).json({ message: "Student ID number and phone number are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            fullName: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role,
            matNumber: role === "student" ? normalizedMatNumber : null,
            phone: role === "student" ? normalizedPhone : null
        });

        res.status(201).json({
            message: "User registered successfully",
            user: sanitizeUser(user)
        });

    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "An account with this email already exists" });
        }
        console.error("Registration failed:", error);
        res.status(500).json({ message: "Registration failed" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || typeof password !== "string" || !password ||
            Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "Enter a valid email and password" });
        }
        if (role !== undefined && !["student", "lecturer"].includes(role)) {
            return res.status(400).json({ message: "Choose a valid account type" });
        }

        const user = await User.findOne({ where: { email: normalizedEmail } });

        if (!user || (role && user.role !== role)) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({ message: "Authentication is not configured" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: sanitizeUser(user)
        });

    } catch (error) {
        console.error("Login failed:", error);
        res.status(500).json({ message: "Login failed" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email, matNumber, phone } = req.body;
        const normalizedName = normalizeName(fullName);
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedName || !normalizedEmail) {
            return res.status(400).json({ message: "Name and email are required" });
        }

        const existingUser = await User.findOne({
            where: {
                email: normalizedEmail,
                id: { [Op.ne]: req.user.id }
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.fullName = normalizedName;
        user.email = normalizedEmail;
        if (user.role === "student") {
            const normalizedMatNumber = normalizeStudentId(matNumber);
            const normalizedPhone = normalizePhone(phone);
            if (!normalizedMatNumber || !normalizedPhone) {
                return res.status(400).json({ message: "Student ID number and phone number are required" });
            }
            user.matNumber = normalizedMatNumber;
            user.phone = normalizedPhone;
        }
        await user.save();

        return res.json({
            message: "Profile updated successfully",
            user: sanitizeUser(user)
        });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "An account with this email already exists" });
        }
        console.error("Failed to update profile:", error);
        return res.status(500).json({ message: "Failed to update profile" });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== "string" || !currentPassword ||
            typeof newPassword !== "string" || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required" });
        }

        if (Buffer.byteLength(currentPassword, "utf8") > 72) {
            return res.status(400).json({ message: "Current password is invalid" });
        }
        if (newPassword.length < 6 || !validatePassword(newPassword)) {
            return res.status(400).json({ message: "New password must be 6-72 bytes" });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const matches = await bcrypt.compare(currentPassword, user.password);
        if (!matches) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
        await user.save();
        return res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Failed to update password:", error);
        return res.status(500).json({ message: "Failed to update password" });
    }
};
