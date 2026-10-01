const User = require("../models/User");
const sanitizeUser = require("../utils/sanitizeUser");

exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ["id", "fullName", "email", "role"],
            order: [["id", "DESC"]]
        });
        res.json(users);
    } catch (error) {
        console.error("Failed to load users:", error);
        res.status(500).json({ message: "Failed to load users" });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const allowed = ["student", "lecturer", "admin"];

        if (typeof role !== "string" || !allowed.includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const userId = Number(req.params.id);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "admin" && role !== "admin" &&
            await User.count({ where: { role: "admin" } }) <= 1) {
            return res.status(409).json({ message: "The last administrator cannot be demoted" });
        }

        user.role = role;
        await user.save();

        res.json({
            message: "Role updated",
            user: sanitizeUser(user)
        });

    } catch (error) {
        console.error("Failed to update user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
    }
};
