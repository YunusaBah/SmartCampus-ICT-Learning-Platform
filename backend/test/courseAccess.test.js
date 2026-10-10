process.env.DB_HOST = "127.0.0.1";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const Course = require("../src/models/Course");
const Enrollment = require("../src/models/Enrollment");
const getCourseAccess = require("../src/utils/courseAccess");

const originalFindByPk = Course.findByPk;
const originalFindOne = Enrollment.findOne;

afterEach(() => {
    Course.findByPk = originalFindByPk;
    Enrollment.findOne = originalFindOne;
});

test("course access rejects invalid IDs without querying the database", async () => {
    Course.findByPk = async () => {
        assert.fail("Course lookup should not run for invalid IDs");
    };

    assert.deepEqual(await getCourseAccess("0", { id: 2, role: "student" }), {
        status: 400,
        message: "Invalid course ID"
    });
});

test("course access returns not found for a missing course", async () => {
    Course.findByPk = async () => null;

    assert.deepEqual(await getCourseAccess("12", { id: 2, role: "student" }), {
        status: 404,
        message: "Course not found"
    });
});

test("course access allows the course-owning lecturer", async () => {
    const course = { id: 12, lecturerId: 7 };
    Course.findByPk = async (id) => {
        assert.equal(id, 12);
        return course;
    };
    Enrollment.findOne = async () => {
        assert.fail("Lecturers do not need student enrollments");
    };

    assert.deepEqual(await getCourseAccess("12", { id: 7, role: "lecturer" }), {
        course,
        isManager: true,
        isEnrolled: false,
        enrollment: null
    });
});

test("course access denies a lecturer who does not own the course", async () => {
    Course.findByPk = async () => ({ id: 12, lecturerId: 7 });
    Enrollment.findOne = async () => null;

    assert.deepEqual(await getCourseAccess("12", { id: 8, role: "lecturer" }), {
        status: 403,
        message: "You can only access your own courses"
    });
});

test("course access allows an enrolled student", async () => {
    const course = { id: 12, lecturerId: 7 };
    Course.findByPk = async () => course;
    Enrollment.findOne = async (options) => {
        assert.deepEqual(options, { where: { studentId: 2, courseId: 12 } });
        return { studentId: 2, courseId: 12 };
    };

    assert.deepEqual(await getCourseAccess("12", { id: 2, role: "student" }), {
        course,
        isManager: false,
        isEnrolled: true,
        enrollment: { studentId: 2, courseId: 12 }
    });
});

test("course access denies a student who is not enrolled", async () => {
    Course.findByPk = async () => ({ id: 12, lecturerId: 7 });
    Enrollment.findOne = async () => null;

    assert.deepEqual(await getCourseAccess("12", { id: 2, role: "student" }), {
        status: 403,
        message: "Join this class first using the class code"
    });
});
