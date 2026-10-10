process.env.DB_HOST = "127.0.0.1";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const Course = require("../src/models/Course");
const Lesson = require("../src/models/Lesson");
const lessonController = require("../src/controllers/lessonController");

const originalFindByPk = Course.findByPk;
const originalCreate = Lesson.create;

afterEach(() => {
    Course.findByPk = originalFindByPk;
    Lesson.create = originalCreate;
});

test("a lecturer cannot add material to another lecturer's course", async () => {
    Course.findByPk = async () => ({ id: 9, lecturerId: 22 });
    Lesson.create = async () => {
        throw new Error("Unauthorized material was created");
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

    await lessonController.createLesson({
        body: { title: "Notes", content: "Week one", courseId: "9" },
        params: {},
        user: { id: 12, role: "lecturer" }
    }, response);

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { message: "You can only add lessons to your courses" });
});
