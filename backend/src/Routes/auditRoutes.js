const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const auditController = require("../controllers/auditController");

router.get("/", authMiddleware, requireRole("lecturer"), auditController.listMyAuditLogs);

module.exports = router;
