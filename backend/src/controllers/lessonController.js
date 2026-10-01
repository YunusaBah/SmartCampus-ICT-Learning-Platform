const Lesson = require("../models/Lesson");
const Course = require("../models/Course");
const getCourseAccess = require("../utils/courseAccess");
const discardUpload = require("../utils/discardUpload");

exports.createLesson = async (req, res) => {
    try {
        const { title, content, videoUrl, courseId } = req.body;

        if (typeof title !== "string" || !title.trim() ||
            typeof content !== "string" || !content.trim() ||
            !Number.isSafeInteger(Number(courseId)) || Number(courseId) <= 0) {
            await discardUpload(req.file);
            return res.status(400).json({ message: "Title, content, and courseId are required" });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            await discardUpload(req.file);
            return res.status(404).json({ message: "Course not found" });
        }
        if (course.lecturerId !== req.user.id && req.user.role !== "admin") {
            await discardUpload(req.file);
            return res.status(403).json({ message: "You can only add lessons to your courses" });
        }

        const lesson = await Lesson.create({
            title: title.trim(),
            content: content.trim(),
            videoUrl: typeof videoUrl === "string" && videoUrl.trim() ? videoUrl.trim() : null,
            courseId,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null
        });

        res.status(201).json({
            message: "Lesson created successfully",
            lesson
        });

    } catch (error) {
        await discardUpload(req.file);
        console.error("Failed to create lesson:", error);
        res.status(500).json({ message: "Failed to create lesson" });
    }
};

exports.getLessons = async (req, res) => {
    try {
        const access = await getCourseAccess(req.params.courseId, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });

        const lessons = await Lesson.findAll({
            where: { courseId: access.course.id },
            order: [["id", "DESC"]]
        });

        res.json(lessons);

    } catch (error) {
        console.error("Failed to load lessons:", error);
        res.status(500).json({ message: "Failed to load lessons" });
    }
};
