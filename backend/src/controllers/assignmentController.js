const { Op } = require("sequelize");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");
const getCourseAccess = require("../utils/courseAccess");
const discardUpload = require("../utils/discardUpload");

exports.createAssignment = async (req, res) => {
    try {
        const { title, description, dueDate, courseId } = req.body;

        if (typeof title !== "string" || !title.trim() ||
            typeof description !== "string" || !description.trim() ||
            !dueDate || !Number.isSafeInteger(Number(courseId)) || Number(courseId) <= 0 ||
            Number.isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ message: "All assignment fields are required" });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        if (course.lecturerId !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "You can only add assignments to your courses" });
        }

        const assignment = await Assignment.create({
            title: title.trim(),
            description: description.trim(),
            dueDate: new Date(dueDate),
            courseId
        });

        res.status(201).json({
            message: "Assignment created successfully",
            assignment
        });

    } catch (error) {
        console.error("Failed to create assignment:", error);
        res.status(500).json({ message: "Failed to create assignment" });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        const access = await getCourseAccess(req.params.courseId, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });

        const assignments = await Assignment.findAll({
            where: { courseId: access.course.id },
            order: [["dueDate", "ASC"]]
        });

        res.json(assignments);

    } catch (error) {
        console.error("Failed to load assignments:", error);
        res.status(500).json({ message: "Failed to load assignments" });
    }
};

exports.getMyAssignments = async (req, res) => {
    try {
        const enrollments = await Enrollment.findAll({
            where: { studentId: req.user.id },
            attributes: ["courseId"]
        });

        const courseIds = enrollments.map((e) => e.courseId);

        if (courseIds.length === 0) {
            return res.json([]);
        }

        const assignments = await Assignment.findAll({
            where: { courseId: { [Op.in]: courseIds } },
            include: [
                {
                    model: Course,
                    as: "course",
                    attributes: ["id", "title"]
                }
            ],
            order: [["dueDate", "ASC"]]
        });

        res.json(assignments);

    } catch (error) {
        console.error("Failed to load student assignments:", error);
        res.status(500).json({ message: "Failed to load assignments" });
    }
};

exports.getCourseSubmissions = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.courseId);

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        if (course.lecturerId !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const assignments = await Assignment.findAll({
            where: { courseId: course.id },
            include: [
                {
                    model: Submission,
                    as: "submissions",
                    include: [
                        {
                            model: User,
                            as: "student",
                            attributes: ["id", "fullName", "email"]
                        }
                    ]
                }
            ]
        });

        res.json(assignments);

    } catch (error) {
        console.error("Failed to load course submissions:", error);
        res.status(500).json({ message: "Failed to load submissions" });
    }
};

exports.gradeSubmission = async (req, res) => {
    try {
        const { grade } = req.body;

        if (typeof grade !== "string" || !grade.trim() || grade.trim().length > 50) {
            return res.status(400).json({ message: "Grade is required" });
        }

        const submission = await Submission.findByPk(req.params.id, {
            include: [
                {
                    model: Assignment,
                    as: "assignment",
                    include: [{ model: Course, as: "course" }]
                }
            ]
        });

        if (!submission) {
            return res.status(404).json({ message: "Submission not found" });
        }

        const course = submission.assignment?.course;
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        if (course.lecturerId !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        submission.grade = grade.trim();
        await submission.save();

        res.json({
            message: "Grade updated",
            submission
        });

    } catch (error) {
        console.error("Failed to grade submission:", error);
        res.status(500).json({ message: "Failed to update grade" });
    }
};

exports.submitAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.body;

        if (!assignmentId || !Number.isSafeInteger(Number(assignmentId)) || Number(assignmentId) <= 0) {
            await discardUpload(req.file);
            return res.status(400).json({ message: "assignmentId is required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Assignment file is required" });
        }

        const assignment = await Assignment.findByPk(assignmentId);
        if (!assignment) {
            await discardUpload(req.file);
            return res.status(404).json({ message: "Assignment not found" });
        }

        const enrolled = await Enrollment.findOne({
            where: {
                studentId: req.user.id,
                courseId: assignment.courseId
            }
        });

        if (!enrolled) {
            await discardUpload(req.file);
            return res.status(403).json({ message: "Enroll in the course first" });
        }

        const submission = await Submission.create({
            studentId: req.user.id,
            assignmentId,
            fileUrl: `/uploads/${req.file.filename}`
        });

        res.status(201).json({
            message: "Assignment submitted successfully",
            submission
        });

    } catch (error) {
        await discardUpload(req.file);
        console.error("Failed to submit assignment:", error);
        res.status(500).json({ message: "Failed to submit assignment" });
    }
};
