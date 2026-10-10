const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Lesson = require("../models/Lesson");
const LessonProgress = require("../models/LessonProgress");
const { Op, fn, col } = require("sequelize");

exports.joinByCode = async (req, res) => {
    try {
        const student = await User.findByPk(req.user.id, {
            attributes: ["fullName", "email", "matNumber", "phone"]
        });
        if (!student || !student.fullName || !student.email || !student.matNumber || !student.phone) {
            return res.status(400).json({
                message: "Complete your name, email, student ID, and phone number before joining a class."
            });
        }

        const { classCode } = req.body;
        if (typeof classCode !== "string" || !classCode.trim()) {
            return res.status(400).json({ message: "Class code is required" });
        }

        const course = await Course.findOne({ where: { classCode: classCode.toUpperCase().trim() } });
        if (!course) return res.status(404).json({ message: "Invalid class code. Please check and try again." });
        if (course.status !== "active") {
            return res.status(409).json({ message: "This course is archived and no longer accepts enrollments." });
        }
        if (!course.enrollmentEnabled) {
            return res.status(409).json({ message: "Enrollment for this course is currently closed." });
        }

        const already = await Enrollment.findOne({ where: { studentId: req.user.id, courseId: course.id } });
        if (already) return res.status(409).json({ message: "You are already enrolled in this class." });

        await Enrollment.create({ studentId: req.user.id, courseId: course.id });
        const courseData = course.toJSON();
        delete courseData.classCode;
        courseData.hasContentFile = Boolean(courseData.contentFileUrl);
        delete courseData.contentFileUrl;
        res.status(201).json({ message: "Joined successfully!", course: courseData });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "You are already enrolled in this class." });
        }
        console.error("Failed to join course:", error);
        res.status(500).json({ message: "Failed to join course" });
    }
};

exports.getStudentCourses = async (req, res) => {
    try {
        const enrollments = await Enrollment.findAll({
            where: { studentId: req.user.id },
            include: [{
                model: Course,
                as: "course",
                include: [{ model: User, as: "lecturer", attributes: ["fullName"] }]
            }],
            order: [["createdAt", "DESC"]]
        });
        const courseIds = enrollments.map((enrollment) => enrollment.courseId);
        const [lessons, upcomingAssignments, progressRows] = courseIds.length
            ? await Promise.all([
                Lesson.findAll({
                    attributes: ["courseId", [fn("COUNT", col("id")), "count"]],
                    where: { courseId: courseIds },
                    group: ["courseId"],
                    raw: true
                }),
                Assignment.findAll({
                    where: { courseId: courseIds, dueDate: { [Op.gt]: new Date() } },
                    attributes: ["id", "courseId", "dueDate"]
                }),
                LessonProgress.findAll({
                    where: { studentId: req.user.id, completedAt: { [Op.ne]: null } },
                    attributes: ["id"],
                    include: [{
                        model: Lesson,
                        as: "lesson",
                        attributes: ["courseId"],
                        where: { courseId: courseIds }
                    }]
                })
            ])
            : [[], [], []];
        const lessonCounts = new Map(lessons.map((lesson) => [Number(lesson.courseId), Number(lesson.count)]));
        const completedByCourse = new Map();
        for (const progress of progressRows) {
            const courseId = progress.lesson?.courseId;
            if (courseId) completedByCourse.set(courseId, (completedByCourse.get(courseId) || 0) + 1);
        }
        const assignmentsById = upcomingAssignments.map((assignment) => assignment.id);
        const submittedIds = assignmentsById.length
            ? new Set((await Submission.findAll({
                where: { studentId: req.user.id, assignmentId: assignmentsById },
                attributes: ["assignmentId"],
                raw: true
            })).map((submission) => submission.assignmentId))
            : new Set();
        const pendingByCourse = new Map();
        const deadlinesByCourse = new Map();
        for (const assignment of upcomingAssignments) {
            if (submittedIds.has(assignment.id)) continue;
            pendingByCourse.set(assignment.courseId, (pendingByCourse.get(assignment.courseId) || 0) + 1);
            if (new Date(assignment.dueDate).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000) {
                deadlinesByCourse.set(assignment.courseId, (deadlinesByCourse.get(assignment.courseId) || 0) + 1);
            }
        }
        res.json(enrollments.map((enrollment) => {
            const data = enrollment.toJSON();
            if (data.course) {
                const hasLegacyMaterial = Boolean(data.course.contentFileUrl);
                data.course.hasContentFile = hasLegacyMaterial;
                delete data.course.contentFileUrl;
                delete data.course.classCode;
                data.course.lecturerName = data.course.lecturer?.fullName || "Lecturer";
                delete data.course.lecturer;
                data.course.materialCount = (lessonCounts.get(data.course.id) || 0) +
                    Number(hasLegacyMaterial);
                data.course.pendingAssignments = pendingByCourse.get(data.course.id) || 0;
                data.course.upcomingDeadlines = deadlinesByCourse.get(data.course.id) || 0;
                data.course.completedActivities = completedByCourse.get(data.course.id) || 0;
                data.course.enrollmentDate = data.createdAt;
            }
            return data;
        }));
    } catch (error) {
        console.error("Failed to load enrolled courses:", error);
        res.status(500).json({ message: "Failed to load enrolled courses" });
    }
};