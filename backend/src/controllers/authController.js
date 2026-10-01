const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sanitizeUser = require("../utils/sanitizeUser");

require("../config/env");

exports.register = async (req, res) => {
    try {
        const { fullName, email, password, lecturerCode } = req.body;

        if (typeof fullName !== "string" || !fullName.trim() ||
            typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
            return res.status(400).json({ message: "Enter a valid email address" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "Password must be no more than 72 bytes" });
        }

        const existingUser = await User.findOne({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let role = "student";

        if (
            lecturerCode &&
            process.env.LECTURER_CODE &&
            lecturerCode === process.env.LECTURER_CODE
        ) {
            role = "lecturer";
        }

        const user = await User.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role
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
        const { email, password } = req.body;

        if (typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });

        if (!user) {
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
            { id: user.id, role: user.role },
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
