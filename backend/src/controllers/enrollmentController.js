const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

exports.joinByCode = async (req, res) => {
    try {
        const { classCode } = req.body;
        if (typeof classCode !== "string" || !classCode.trim()) {
            return res.status(400).json({ message: "Class code is required" });
        }

        const course = await Course.findOne({ where: { classCode: classCode.toUpperCase().trim() } });
        if (!course) return res.status(404).json({ message: "Invalid class code. Please check and try again." });

        const already = await Enrollment.findOne({ where: { studentId: req.user.id, courseId: course.id } });
        if (already) return res.status(409).json({ message: "You are already enrolled in this class." });

        await Enrollment.create({ studentId: req.user.id, courseId: course.id });
        const courseData = course.toJSON();
        delete courseData.classCode;
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
            include: [{ model: Course, as: "course" }]
        });
        res.json(enrollments);
    } catch (error) {
        console.error("Failed to load enrolled courses:", error);
        res.status(500).json({ message: "Failed to load enrolled courses" });
    }
};