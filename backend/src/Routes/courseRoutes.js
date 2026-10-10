const express = require("express");
const router = express.Router();

const courseController = require("../controllers/courseController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const gradebookController = require("../controllers/gradebookController");
const lmsController = require("../controllers/lmsController");
const upload = require("../config/multer");

router.get("/", authMiddleware, requireRole("student"), courseController.getCourses);

router.get(
    "/my",
    authMiddleware,
    requireRole("lecturer"),
    courseController.getMyCourses
);

router.get(
    "/my/stats",
    authMiddleware,
    requireRole("lecturer"),
    courseController.getMyCourseStats
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

router.delete(
    "/:id/students/:studentId",
    authMiddleware,
    requireRole("lecturer"),
    courseController.removeCourseStudent
);

router.patch(
    "/:id/students/:studentId/announcement-permission",
    authMiddleware,
    requireRole("lecturer"),
    courseController.updateStudentAnnouncementPermission
);

router.post(
    "/",
    authMiddleware,
    requireRole("lecturer"),
    upload.single("contentFile"),
    courseController.createCourse
);

router.patch(
    "/:id",
    authMiddleware,
    requireRole("lecturer"),
    courseController.updateCourse
);

router.post(
    "/:id/class-code/regenerate",
    authMiddleware,
    requireRole("lecturer"),
    courseController.regenerateClassCode
);

router.delete(
    "/:id",
    authMiddleware,
    requireRole("lecturer"),
    courseController.deleteCourse
);

module.exports = router;
