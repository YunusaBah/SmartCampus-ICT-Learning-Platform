process.env.DB_HOST = "127.0.0.1";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const Assignment = require("../src/models/Assignment");
const Enrollment = require("../src/models/Enrollment");
const Submission = require("../src/models/Submission");
const assignmentController = require("../src/controllers/assignmentController");

const originals = {
    assignmentFindByPk: Assignment.findByPk,
    enrollmentFindOne: Enrollment.findOne,
    submissionFindOne: Submission.findOne,
    submissionCreate: Submission.create
};

test.afterEach(() => {
    Assignment.findByPk = originals.assignmentFindByPk;
    Enrollment.findOne = originals.enrollmentFindOne;
    Submission.findOne = originals.submissionFindOne;
    Submission.create = originals.submissionCreate;
});

test("rejects assignment submission after the due date and removes the uploaded file", async () => {
    let checkedForExistingSubmission = false;
    Assignment.findByPk = async () => ({ id: 4, courseId: 2, dueDate: new Date(Date.now() - 1000) });
    Enrollment.findOne = async () => ({ studentId: 8, courseId: 2 });
    Submission.findOne = async () => {
        checkedForExistingSubmission = true;
        return null;
    };

    const req = {
        body: { assignmentId: "4", answerText: "My assignment reply" },
        user: { id: 8, role: "student" },
        file: { path: path.join(os.tmpdir(), `missing-assignment-${process.pid}.pdf`) }
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

    await assignmentController.submitAssignment(req, response);

    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /cannot submit.*after its due date/i);
    assert.equal(checkedForExistingSubmission, false);
});

test("accepts a text-only assignment reply before the due date", async () => {
    let submissionValues = null;
    Assignment.findByPk = async () => ({ id: 4, courseId: 2, dueDate: new Date(Date.now() + 60_000) });
    Enrollment.findOne = async () => ({ studentId: 8, courseId: 2 });
    Submission.findOne = async () => null;
    Submission.create = async (values) => {
        submissionValues = values;
        return values;
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

    await assignmentController.submitAssignment({
        body: { assignmentId: "4", answerText: "  My written answer  " },
        user: { id: 8, role: "student" }
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(submissionValues.answerText, "My written answer");
    assert.equal(submissionValues.fileUrl, null);
});

test("rejects an empty assignment reply when no file is attached", async () => {
    let assignmentLookedUp = false;
    Assignment.findByPk = async () => {
        assignmentLookedUp = true;
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

    await assignmentController.submitAssignment({
        body: { assignmentId: "4", answerText: "  " },
        user: { id: 8, role: "student" }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(assignmentLookedUp, false);
});
