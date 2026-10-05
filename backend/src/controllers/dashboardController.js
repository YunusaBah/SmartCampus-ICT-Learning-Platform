const { Op } = require("sequelize");
const Enrollment = require("../models/Enrollment");
const Assignment = require("../models/Assignment");
const QuizResult = require("../models/QuizResult");
const Submission = require("../models/Submission");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");

exports.getStats = async (req, res) => {
    try {
        if (req.user.role === "lecturer") {
            const courses = await Course.findAll({
                where: { lecturerId: req.user.id }
            });

            const courseIds = courses.map((c) => c.id);

            let students = 0;
            let pendingGrades = 0;

            if (courseIds.length > 0) {
                students = await Enrollment.count({
                    where: { courseId: { [Op.in]: courseIds } }
                });

                const assignments = await Assignment.findAll({
                    where: { courseId: { [Op.in]: courseIds } },
                    attributes: ["id"]
                });

                const assignmentIds = assignments.map((a) => a.id);

                if (assignmentIds.length > 0) {
                    pendingGrades = await Submission.count({
                        where: {
                            assignmentId: { [Op.in]: assignmentIds },
                            grade: "Pending"
                        }
                    });
                }
            }

            return res.json({
                role: req.user.role,
                totalCourses: courses.length,
                students,
                assignments: await Assignment.count({
                    where: courseIds.length
                        ? { courseId: { [Op.in]: courseIds } }
                        : { id: -1 }
                }),
                pendingGrades
            });
        }

        const enrollments = await Enrollment.findAll({
            where: { studentId: req.user.id }
        });

        const courseIds = enrollments.map((e) => e.courseId);

        let assignmentCount = 0;
        if (courseIds.length > 0) {
            assignmentCount = await Assignment.count({
                where: { courseId: { [Op.in]: courseIds } }
            });
        }

        const quizResults = await QuizResult.findAll({
            where: { studentId: req.user.id }
        });

        const quizAverage = quizResults.length
            ? Math.round(
                (quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length) * 100
            )
            : 0;

        const submissions = await Submission.findAll({
            where: { studentId: req.user.id }
        });

        res.json({
            role: "student",
            totalCourses: enrollments.length,
            assignments: assignmentCount,
            completedCourses: enrollments.length,
            quizAverage,
            gradedAssignments: submissions.filter((s) => s.grade !== "Pending").length
        });

    } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        res.status(500).json({ message: "Failed to load dashboard stats" });
    }
};

exports.getGrades = async (req, res) => {
    try {
        const quizResults = await QuizResult.findAll({
            where: { studentId: req.user.id },
            include: [{
                model: Quiz,
                as: "quiz",
                attributes: { exclude: ["correctAnswer"] }
            }],
            order: [["id", "DESC"]]
        });

        const submissions = await Submission.findAll({
            where: { studentId: req.user.id },
            include: [
                {
                    model: Assignment,
                    as: "assignment",
                    include: [{ model: Course, as: "course", attributes: ["title"] }]
                }
            ],
            order: [["id", "DESC"]]
        });

        res.json({ quizResults, submissions });

    } catch (error) {
        console.error("Failed to load grades:", error);
        res.status(500).json({ message: "Failed to load grades" });
    }
};
