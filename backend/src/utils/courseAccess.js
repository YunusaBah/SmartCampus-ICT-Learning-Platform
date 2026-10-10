const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

const getCourseAccess = async (courseId, user) => {
    const id = Number(courseId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return { status: 400, message: "Invalid course ID" };
    }

    const course = await Course.findByPk(id);
    if (!course) {
        return { status: 404, message: "Course not found" };
    }

    const isManager = user.role === "lecturer" && course.lecturerId === user.id;
    const enrollment = user.role === "student"
        ? await Enrollment.findOne({ where: { studentId: user.id, courseId: id } })
        : null;
    const isEnrolled = Boolean(enrollment);

    if (!isManager && !isEnrolled) {
        return {
            status: 403,
            message: user.role === "student"
                ? "Join this class first using the class code"
                : "You can only access your own courses"
        };
    }

    return { course, isManager, isEnrolled, enrollment };
};

module.exports = getCourseAccess;
