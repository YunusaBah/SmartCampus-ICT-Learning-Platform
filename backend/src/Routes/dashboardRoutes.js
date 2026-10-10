const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

router.get("/", authMiddleware, dashboardController.getDashboard);
router.get("/stats", authMiddleware, dashboardController.getStats);

router.get(
    "/grades",
    authMiddleware,
    requireRole("student"),
    dashboardController.getGrades
);

module.exports = router;
