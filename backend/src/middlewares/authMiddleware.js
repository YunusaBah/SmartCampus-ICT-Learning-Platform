const jwt = require("jsonwebtoken");
const User = require("../models/User");

require("../config/env");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch ? tokenMatch[1].trim() : authHeader.trim();
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }

    if (!payload || typeof payload !== "object" || !Number.isSafeInteger(payload.id)) {
        return res.status(401).json({ message: "Invalid token" });
    }

    try {
        const user = await User.findByPk(payload.id, { attributes: ["id", "role"] });
        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }
        req.user = { id: user.id, role: user.role };
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = authMiddleware;