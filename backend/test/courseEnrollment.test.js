process.env.DB_HOST = "127.0.0.1";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const Course = require("../src/models/Course");
const Enrollment = require("../src/models/Enrollment");
const User = require("../src/models/User");
const enrollmentController = require("../src/controllers/enrollmentController");

const originalCourseFindOne = Course.findOne;
const originalEnrollmentFindOne = Enrollment.findOne;
const originalEnrollmentCreate = Enrollment.create;
const originalUserFindByPk = User.findByPk;

afterEach(() => {
    Course.findOne = originalCourseFindOne;
    Enrollment.findOne = originalEnrollmentFindOne;
    Enrollment.create = originalEnrollmentCreate;
    User.findByPk = originalUserFindByPk;
});

test("course enrollment rejects archived courses before creating an enrollment", async () => {
    User.findByPk = async (id) => {
        assert.equal(id, 5);
        return { fullName: "Student Name", email: "student@example.edu", matNumber: "STU-1", phone: "12345" };
    };
    Course.findOne = async ({ where }) => {
        assert.deepEqual(where, { classCode: "ABCD1234" });
        return { id: 22, status: "archived", enrollmentEnabled: true };
    };
    Enrollment.findOne = async () => assert.fail("Archived courses must be rejected before enrollment lookup");
    Enrollment.create = async () => assert.fail("Archived courses must not create enrollment");

    const response = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };

    await enrollmentController.joinByCode({
        user: { id: 5, role: "student" },
        body: { classCode: "abcd1234" }
    }, response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.message, "This course is archived and no longer accepts enrollments.");
});
