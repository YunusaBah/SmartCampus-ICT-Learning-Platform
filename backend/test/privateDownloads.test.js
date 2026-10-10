process.env.DB_HOST = "127.0.0.1";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const Submission = require("../src/models/Submission");
const downloadController = require("../src/controllers/downloadController");
const assignmentController = require("../src/controllers/assignmentController");

const originalFindByPk = Submission.findByPk;

afterEach(() => {
    Submission.findByPk = originalFindByPk;
});

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
    set() {
        return this;
    },
    download() {
        assert.fail("Unauthorized request must not stream the file");
    }
});

test("students cannot download another student's submission", async () => {
    Submission.findByPk = async () => ({
        studentId: 17,
        fileUrl: "/uploads/secret.pdf",
        assignment: { course: { lecturerId: 9 } }
    });
    const res = response();

    await downloadController.download({
        params: { resourceType: "submission", id: "41" },
        user: { id: 18, role: "student" }
    }, res, assert.fail);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { message: "You cannot download this submission" });
});

test("lecturers cannot download submissions from another lecturer's course", async () => {
    Submission.findByPk = async () => ({
        studentId: 17,
        fileUrl: "/uploads/secret.pdf",
        assignment: { course: { lecturerId: 9 } }
    });
    const res = response();

    await downloadController.download({
        params: { resourceType: "submission", id: "41" },
        user: { id: 10, role: "lecturer" }
    }, res, assert.fail);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { message: "You cannot download this submission" });
});

test("lecturers cannot change grades for another lecturer's submission", async () => {
    let saved = false;
    Submission.findByPk = async () => ({
        id: 41,
        studentId: 17,
        grade: "Pending",
        feedback: null,
        assignment: { course: { lecturerId: 9 } },
        save: async () => { saved = true; }
    });
    const res = response();

    await assignmentController.gradeSubmission({
        params: { id: "41" },
        body: { grade: "A" },
        user: { id: 10, role: "lecturer" }
    }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(saved, false);
});
