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

const createResponse = () => ({
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
});

afterEach(() => {
    Course.findByPk = originalFindByPk;
    Lesson.create = originalCreate;
});

test("a lecturer cannot add material to another lecturer's course", async () => {
    Course.findByPk = async () => ({ id: 9, lecturerId: 22 });
    Lesson.create = async () => {
        throw new Error("Unauthorized material was created");
    };
    const response = createResponse();

    await lessonController.createLesson({
        body: { title: "Notes", content: "Week one", courseId: "9" },
        params: {},
        user: { id: 12, role: "lecturer" }
    }, response);

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { message: "You can only add lessons to your courses" });
});

test("a lecturer can create material containing only an HTTP resource link", async () => {
    Course.findByPk = async () => ({ id: 9, lecturerId: 12 });
    Lesson.create = async (lesson) => ({ toJSON: () => ({ id: 3, ...lesson }) });
    const response = createResponse();

    await lessonController.createLesson({
        body: { title: "Recommended reading", videoUrl: "https://example.com/book", courseId: "9" },
        params: {},
        user: { id: 12, role: "lecturer" }
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.lesson.content, "");
    assert.equal(response.body.lesson.videoUrl, "https://example.com/book");
});

test("a lecturer cannot create material with a non-HTTP resource link", async () => {
    Course.findByPk = async () => {
        throw new Error("Invalid resource link reached course lookup");
    };
    const response = createResponse();

    await lessonController.createLesson({
        body: { title: "Unsafe resource", videoUrl: "javascript:alert(1)", courseId: "9" },
        params: {},
        user: { id: 12, role: "lecturer" }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { message: "Resource link must be a valid HTTP or HTTPS URL" });
});
