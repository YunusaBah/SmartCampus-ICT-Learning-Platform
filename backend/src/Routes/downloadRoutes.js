const express = require("express");
const router = express.Router();

const downloadController = require("../controllers/downloadController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/:resourceType/:id", authMiddleware, downloadController.download);

module.exports = router;
