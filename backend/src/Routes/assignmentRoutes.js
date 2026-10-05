const express = require("express");
const router = express.Router();

const assignmentController = require("../controllers/assignmentController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const upload = require("../config/multer");

router.post(
    "/",
    authMiddleware,
    requireRole("lecturer"),
    assignmentController.createAssignment
);

router.get(
    "/my",
    authMiddleware,
    requireRole("student"),
    assignmentController.getMyAssignments
);

router.get(
    "/my/submissions",
    authMiddleware,
    requireRole("student"),
    assignmentController.getMySubmissions
);

router.get(
    "/course/:courseId/submissions",
    authMiddleware,
    requireRole("lecturer"),
    assignmentController.getCourseSubmissions
);

router.patch(
    "/submissions/:id/grade",
    authMiddleware,
    requireRole("lecturer"),
    assignmentController.gradeSubmission
);

router.get(
    "/course/:courseId",
    authMiddleware,
    assignmentController.getAssignments
);

router.post(
    "/submit",
    authMiddleware,
    requireRole("student"),
    upload.single("file"),
    assignmentController.submitAssignment
);

module.exports = router;
