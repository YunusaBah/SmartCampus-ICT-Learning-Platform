const express = require("express");
const router = express.Router();

const courseController = require("../controllers/courseController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");

router.get("/", courseController.getCourses);

router.get(
    "/my",
    authMiddleware,
    requireRole("lecturer", "admin"),
    courseController.getMyCourses
);

router.get(
    "/students",
    authMiddleware,
    requireRole("lecturer", "admin"),
    courseController.getMyStudents
);

router.get(
    "/:id",
    authMiddleware,
    courseController.getCourseDetail
);

router.post(
    "/",
    authMiddleware,
    requireRole("lecturer", "admin"),
    courseController.createCourse
);

module.exports = router;
