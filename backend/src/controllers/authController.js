const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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

const issueSession = (user, res, statusCode = 200) => {
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        return res.status(500).json({ message: "Authentication is not configured" });
    }

    res.set("Cache-Control", "no-store");
    const token = jwt.sign(
        { id: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );

    return res.status(statusCode).json({
        message: "Login successful",
        token,
        user: sanitizeUser(user)
    });
};

const verifyGoogleCredential = async (credential) => {
    if (typeof credential !== "string" || !credential || credential.length > 10000) {
        return { error: "A valid Google credential is required", status: 400 };
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error("GOOGLE_CLIENT_ID is not configured");
        return { error: "Google sign-in is not configured", status: 503 };
    }

    const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) {
        return { error: "Google sign-in could not verify your account", status: 401 };
    }

    const claims = await response.json();
    const expiresAt = Number(claims.exp);
    if (claims.aud !== process.env.GOOGLE_CLIENT_ID ||
        !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss) ||
        !(claims.email_verified === true || claims.email_verified === "true") ||
        !Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
        return { error: "Use an active, verified Google account", status: 401 };
    }

    if (typeof claims.sub !== "string" || !claims.sub) {
        return { error: "Google did not provide a valid account identifier", status: 401 };
    }

    const email = normalizeEmail(claims.email);
    if (!email) {
        return { error: "Google did not provide a valid email address", status: 401 };
    }

    const fullName = normalizeName(claims.name);
    if (!fullName) {
        return { error: "Your Google account must include your full name", status: 400 };
    }

    return { email, fullName, googleId: claims.sub };
};

exports.register = async (_req, res) => {
    return res.status(410).json({
        message: "New accounts must be created with a verified Google account."
    });
};

exports.googleRegister = async (req, res) => {
    try {
        const { credential, role, fullName, matNumber, phone } = req.body;
        if (!["student", "lecturer"].includes(role)) {
            return res.status(400).json({ message: "Choose a valid account type" });
        }

        const googleAccount = await verifyGoogleCredential(credential);
        if (googleAccount.error) {
            return res.status(googleAccount.status).json({ message: googleAccount.error });
        }

        const existingUser = await User.findOne({ where: { email: googleAccount.email } });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const normalizedName = role === "student" ? normalizeName(fullName) : googleAccount.fullName;
        if (role === "student" && !normalizedName) {
            return res.status(428).json({
                message: "Add your student details to finish creating your account.",
                profileRequired: true,
                profile: { email: googleAccount.email, fullName: googleAccount.fullName }
            });
        }
        if (!normalizedName) {
            return res.status(400).json({ message: "Enter your full name" });
        }

        let normalizedMatNumber = null;
        let normalizedPhone = null;
        if (role === "student") {
            normalizedMatNumber = normalizeStudentId(matNumber);
            normalizedPhone = normalizePhone(phone);
            if (!normalizedMatNumber || !normalizedPhone) {
                return res.status(400).json({
                    message: "Student ID number and a valid phone number are required"
                });
            }
        }

        const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
        const user = await User.create({
            fullName: normalizedName,
            email: googleAccount.email,
            googleId: googleAccount.googleId,
            passwordLoginEnabled: false,
            password: hashedPassword,
            role,
            matNumber: role === "student" ? normalizedMatNumber : null,
            phone: role === "student" ? normalizedPhone : null
        });

        return issueSession(user, res, 201);
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "An account with this email already exists" });
        }
        console.error("Registration failed:", error);
        return res.status(500).json({ message: "Registration failed" });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { credential, role } = req.body;
        if (!["student", "lecturer"].includes(role)) {
            return res.status(400).json({ message: "Choose a valid account type" });
        }

        const googleAccount = await verifyGoogleCredential(credential);
        if (googleAccount.error) {
            return res.status(googleAccount.status).json({ message: googleAccount.error });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { googleId: googleAccount.googleId },
                    { email: googleAccount.email }
                ]
            }
        });
        if (!user || user.role !== role ||
            (user.googleId && user.googleId !== googleAccount.googleId)) {
            return res.status(401).json({ message: "No account was found for this Google email and account type" });
        }

        if (!user.googleId) {
            user.googleId = googleAccount.googleId;
            await user.save();
        }

        return issueSession(user, res);
    } catch (error) {
        console.error("Google login failed:", error);
        return res.status(500).json({ message: "Google login failed" });
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
        if (!user.passwordLoginEnabled) {
            return res.status(401).json({ message: "This account signs in with Google. Continue with Google to log in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        return issueSession(user, res);

    } catch (error) {
        console.error("Login failed:", error);
        return res.status(500).json({ message: "Login failed" });
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
        if (user.googleId && normalizedEmail !== user.email) {
            return res.status(400).json({
                message: "The email address on a Google account cannot be changed here."
            });
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
        if (!user.passwordLoginEnabled) {
            return res.status(400).json({
                message: "This account uses Google sign-in and does not have a password to change."
            });
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
