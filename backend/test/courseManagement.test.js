process.env.DB_HOST = "127.0.0.1";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const Course = require("../src/models/Course");
const courseController = require("../src/controllers/courseController");

const originalFindOne = Course.findOne;

afterEach(() => {
    Course.findOne = originalFindOne;
});

test("course edits are scoped to the authenticated lecturer", async () => {
    Course.findOne = async (options) => {
        assert.deepEqual(options.where, { id: "41", lecturerId: 8 });
        return null;
    };

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

    await courseController.updateCourse({
        params: { id: "41" },
        user: { id: 8, role: "lecturer" },
        body: { title: "Attempted edit" }
    }, response);

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, { message: "Course not found" });
});
