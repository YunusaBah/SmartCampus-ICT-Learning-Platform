const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const authController = require("../controllers/authController");
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Try again later." }
});

/*
  AUTH ROUTES
*/
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);

module.exports = router;