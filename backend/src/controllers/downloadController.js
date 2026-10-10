const fs = require("fs");
const path = require("path");

const Assignment = require("../models/Assignment");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Submission = require("../models/Submission");
const getCourseAccess = require("../utils/courseAccess");

const uploadsDirectory = require("../utils/uploadsDirectory");

const parseResourceId = (value) => {
    if (!/^[0-9]+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const resolveUploadPath = async (fileUrl) => {
    const prefix = "/uploads/";
    if (typeof fileUrl !== "string" || !fileUrl.startsWith(prefix)) return null;

    const filename = fileUrl.slice(prefix.length);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(filename)) return null;

    let uploadsRoot;
    let resolvedFile;
    try {
        uploadsRoot = await fs.promises.realpath(uploadsDirectory);
        resolvedFile = await fs.promises.realpath(path.resolve(uploadsRoot, filename));
    } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
        throw error;
    }

    const relativePath = path.relative(uploadsRoot, resolvedFile);
    if (!relativePath || relativePath === ".." ||
        relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        return null;
    }

    const fileStats = await fs.promises.stat(resolvedFile);
    return fileStats.isFile() ? resolvedFile : null;
};

exports.download = async (req, res, next) => {
    const resourceId = parseResourceId(req.params.id);
    if (!resourceId) {
        return res.status(400).json({ message: "Invalid file resource ID" });
    }

    let fileUrl;
    let downloadName;
    if (req.params.resourceType === "course-content") {
        const course = await Course.findByPk(resourceId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        const access = await getCourseAccess(course.id, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });
        fileUrl = course.contentFileUrl;
        downloadName = course.contentFileName;
    } else if (req.params.resourceType === "lesson") {
        const lesson = await Lesson.findByPk(resourceId);
        if (!lesson) return res.status(404).json({ message: "Lesson not found" });

        const access = await getCourseAccess(lesson.courseId, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });
        fileUrl = lesson.fileUrl;
        downloadName = lesson.fileName;
    } else if (req.params.resourceType === "assignment") {
        const assignment = await Assignment.findByPk(resourceId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });
        const access = await getCourseAccess(assignment.courseId, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });
        fileUrl = assignment.fileUrl;
        downloadName = assignment.fileName;
    } else if (req.params.resourceType === "submission") {
        const submission = await Submission.findByPk(resourceId, {
            include: [{
                model: Assignment,
                as: "assignment",
                include: [{ model: Course, as: "course" }]
            }]
        });
        if (!submission?.assignment?.course) {
            return res.status(404).json({ message: "Submission not found" });
        }

        const isSubmittingStudent = req.user.role === "student" &&
            submission.studentId === req.user.id;
        const isCourseLecturer = req.user.role === "lecturer" &&
            submission.assignment.course.lecturerId === req.user.id;
        if (!isSubmittingStudent && !isCourseLecturer) {
            return res.status(403).json({ message: "You cannot download this submission" });
        }
        fileUrl = submission.fileUrl;
        downloadName = submission.fileName;
    } else {
        return res.status(404).json({ message: "File resource not found" });
    }

    const filePath = await resolveUploadPath(fileUrl);
    if (!filePath) return res.status(404).json({ message: "File not found" });

    res.set("Cache-Control", "private, no-store");
    return res.download(filePath, downloadName ? path.basename(downloadName) : undefined, (error) => {
        if (!error) return;
        if (res.headersSent) return next(error);
        if (error.code === "ENOENT") {
            return res.status(404).json({ message: "File not found" });
        }
        return next(error);
    });
};
