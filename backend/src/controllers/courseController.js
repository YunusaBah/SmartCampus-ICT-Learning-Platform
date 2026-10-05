const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Quiz = require("../models/Quiz");
const Assignment = require("../models/Assignment");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const getCourseAccess = require("../utils/courseAccess");
const generateClassCode = require("../utils/generateClassCode");
const Department = require("../models/Department");

exports.createCourse = async (req, res) => {
    try {
        const { title, description, departmentId } = req.body;
        if (typeof title !== "string" || !title.trim() ||
            typeof description !== "string" || !description.trim()) {
            return res.status(400).json({ message: "Title and description are required" });
        }
        let validDepartmentId = null;
        if (departmentId !== undefined && departmentId !== null) {
            const parsedDepartmentId = Number(departmentId);
            if (!Number.isSafeInteger(parsedDepartmentId) || parsedDepartmentId <= 0) {
                return res.status(400).json({ message: "Department not found" });
            }
            const department = await Department.findByPk(parsedDepartmentId);
            if (!department) return res.status(400).json({ message: "Department not found" });
            validDepartmentId = department.id;
        }

        const classCode = await generateClassCode();
        const course = await Course.create({
            title: title.trim(),
            description: description.trim(),
            lecturerId: req.user.id,
            classCode,
            departmentId: validDepartmentId
        });
        res.status(201).json(course);
    } catch (error) {
        console.error("Failed to create course:", error);
        res.status(500).json({ message: "Failed to create course" });
    }
};

exports.getCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            attributes: { exclude: ["classCode"] },
            include: [{
                model: User,
                as: "lecturer",
                attributes: ["id", "fullName"]
            }, {
                model: Department,
                as: "department",
                attributes: ["id", "name"]
            }],
            order: [["id", "DESC"]]
        });
        res.json(courses);
    } catch (error) {
        console.error("Failed to list courses:", error);
        res.status(500).json({ message: "Failed to load courses" });
    }
};

exports.getMyCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            where: { lecturerId: req.user.id },
            include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
            order: [["id", "DESC"]]
        });
        res.json(courses);
    } catch (error) {
        console.error("Failed to load managed courses:", error);
        res.status(500).json({ message: "Failed to load courses" });
    }
};

exports.getMyStudents = async (req, res) => {
    try {
        const courses = await Course.findAll({
            where: { lecturerId: req.user.id },
            attributes: ["id", "title"],
            include: [{
                model: Enrollment,
                as: "enrollments",
                attributes: ["createdAt"],
                include: [{
                    model: User,
                    as: "student",
                    attributes: ["id", "fullName", "email"]
                }]
            }],
            order: [["title", "ASC"], [{ model: Enrollment, as: "enrollments" }, "createdAt", "ASC"]]
        });

        const students = courses.flatMap((course) =>
            course.enrollments
                .filter((enrollment) => enrollment.student)
                .map((enrollment) => ({
                    ...enrollment.student.toJSON(),
                    courseId: course.id,
                    courseTitle: course.title,
                    enrolledAt: enrollment.createdAt
                }))
        );

        res.json(students);
    } catch (error) {
        console.error("Failed to load students:", error);
        res.status(500).json({ message: "Failed to load students" });
    }
};

exports.getCourseDetail = async (req, res) => {
    try {
        const access = await getCourseAccess(req.params.id, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });
        const { course, isManager, isEnrolled } = access;

        const lessons = await Lesson.findAll({
            where: { courseId: course.id },
            order: [["moduleId", "ASC"], ["orderIndex", "ASC"], ["id", "ASC"]]
        });

        const quizzes = await Quiz.findAll({
            where: { courseId: course.id },
            attributes: isManager ? undefined : { exclude: ["correctAnswer"] },
            order: [["id", "DESC"]]
        });

        const assignments = await Assignment.findAll({
            where: { courseId: course.id },
            order: [["dueDate", "ASC"]]
        });

        let students = [];
        if (isManager) {
            const enrollments = await Enrollment.findAll({
                where: { courseId: course.id },
                include: [{
                    model: User, as: "student",
                    attributes: ["id", "fullName", "email", "role"]
                }]
            });
            students = enrollments.map(e => e.student);
        }

        const courseData = course.toJSON();
        courseData.department = course.departmentId
            ? await Department.findByPk(course.departmentId, { attributes: ["id", "name"] })
            : null;
        if (!isManager) delete courseData.classCode;
        res.json({
            course: courseData,
            lessons,
            quizzes,
            assignments,
            students,
            isLecturer: isManager,
            isEnrolled
        });
    } catch (error) {
        console.error("Failed to load course:", error);
        res.status(500).json({ message: "Failed to load course" });
    }
};