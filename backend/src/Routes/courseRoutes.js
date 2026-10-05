const express = require("express");
const router = express.Router();

const courseController = require("../controllers/courseController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const gradebookController = require("../controllers/gradebookController");
const lmsController = require("../controllers/lmsController");

router.get("/", courseController.getCourses);

router.get(
    "/my",
    authMiddleware,
    requireRole("lecturer"),
    courseController.getMyCourses
);

router.get(
    "/students",
    authMiddleware,
    requireRole("lecturer"),
    courseController.getMyStudents
);

router.patch(
    "/:id/department",
    authMiddleware,
    requireRole("lecturer"),
    lmsController.updateCourseDepartment
);

router.get(
    "/:courseId/gradebook",
    authMiddleware,
    requireRole("lecturer"),
    gradebookController.getGradebook
);

router.get(
    "/:courseId/analytics",
    authMiddleware,
    requireRole("lecturer"),
    gradebookController.getAnalytics
);

router.get(
    "/:id",
    authMiddleware,
    courseController.getCourseDetail
);

router.post(
    "/",
    authMiddleware,
    requireRole("lecturer"),
    courseController.createCourse
);

module.exports = router;
