const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Assignment = require("../models/Assignment");
const Lesson = require("../models/Lesson");
const Module = require("../models/Module");
const LessonProgress = require("../models/LessonProgress");
const Announcement = require("../models/Announcement");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const CalendarEvent = require("../models/CalendarEvent");
const Department = require("../models/Department");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const getCourseAccess = require("../utils/courseAccess");
const createNotifications = require("../utils/createNotifications");

const idValue = (value) => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const nonEmpty = (value, max = 255) =>
    typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

const accessResponse = (res, access) =>
    access.status ? res.status(access.status).json({ message: access.message }) : null;

const managerAccess = async (courseId, user, res) => {
    const access = await getCourseAccess(courseId, user);
    if (access.status) {
        accessResponse(res, access);
        return null;
    }
    if (!access.isManager) {
        res.status(403).json({ message: "Only the course lecturer can manage this resource" });
        return null;
    }
    return access;
};

const courseParticipant = async (courseId, user) => {
    return getCourseAccess(courseId, user);
};

exports.listModules = async (req, res) => {
    const access = await courseParticipant(req.params.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const modules = await Module.findAll({
        where: { courseId: access.course.id },
        include: [{ model: Lesson, as: "lessons" }],
        order: [
            ["orderIndex", "ASC"],
            ["id", "ASC"],
            [{ model: Lesson, as: "lessons" }, "orderIndex", "ASC"],
            [{ model: Lesson, as: "lessons" }, "id", "ASC"]
        ]
    });
    res.json(modules);
};

exports.createModule = async (req, res) => {
    const access = await managerAccess(req.params.courseId, req.user, res);
    if (!access) return;
    const { title, description, orderIndex } = req.body;
    if (!nonEmpty(title) || (description != null && typeof description !== "string") ||
        (orderIndex != null && (!Number.isInteger(orderIndex) || orderIndex < 0))) {
        return res.status(400).json({ message: "A title and valid module details are required" });
    }
    const module = await Module.create({
        title: title.trim(),
        description: typeof description === "string" ? description.trim() : null,
        orderIndex: orderIndex ?? 0,
        courseId: access.course.id
    });
    res.status(201).json(module);
};

exports.updateModule = async (req, res) => {
    const module = await Module.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found" });
    const access = await managerAccess(module.courseId, req.user, res);
    if (!access) return;
    const { title, description, orderIndex } = req.body;
    if (title !== undefined && !nonEmpty(title)) return res.status(400).json({ message: "Invalid module title" });
    if (description !== undefined && description !== null && typeof description !== "string") {
        return res.status(400).json({ message: "Invalid module description" });
    }
    if (orderIndex !== undefined && (!Number.isInteger(orderIndex) || orderIndex < 0)) {
        return res.status(400).json({ message: "Invalid module order" });
    }
    if (title !== undefined) module.title = title.trim();
    if (description !== undefined) module.description = description?.trim() || null;
    if (orderIndex !== undefined) module.orderIndex = orderIndex;
    await module.save();
    res.json(module);
};

exports.deleteModule = async (req, res) => {
    const module = await Module.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found" });
    const access = await managerAccess(module.courseId, req.user, res);
    if (!access) return;
    await sequelize.transaction(async (transaction) => {
        await Lesson.update({ moduleId: null }, { where: { moduleId: module.id }, transaction });
        await module.destroy({ transaction });
    });
    res.json({ message: "Module deleted; lessons remain in the course" });
};

exports.setLessonOrder = async (req, res) => {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const access = await managerAccess(lesson.courseId, req.user, res);
    if (!access) return;
    const { orderIndex, moduleId } = req.body;
    if (orderIndex !== undefined && (!Number.isInteger(orderIndex) || orderIndex < 0)) {
        return res.status(400).json({ message: "Invalid lesson order" });
    }
    if (moduleId !== undefined && moduleId !== null) {
        const module = await Module.findOne({ where: { id: idValue(moduleId), courseId: lesson.courseId } });
        if (!module) return res.status(400).json({ message: "Module must belong to the lesson course" });
        lesson.moduleId = module.id;
    } else if (moduleId === null) {
        lesson.moduleId = null;
    }
    if (orderIndex !== undefined) lesson.orderIndex = orderIndex;
    await lesson.save();
    res.json(lesson);
};

exports.completeLesson = async (req, res) => {
    const lesson = await Lesson.findByPk(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    if (req.user.role !== "student") return res.status(403).json({ message: "Student access required" });
    const enrollment = await Enrollment.findOne({
        where: { studentId: req.user.id, courseId: lesson.courseId }
    });
    if (!enrollment) return res.status(403).json({ message: "Enroll in the course first" });
    const [progress] = await LessonProgress.findOrCreate({
        where: { studentId: req.user.id, lessonId: lesson.id },
        defaults: { completedAt: new Date() }
    });
    if (!progress.completedAt) {
        progress.completedAt = new Date();
        await progress.save();
    }
    res.json({ lessonId: lesson.id, completed: true, completedAt: progress.completedAt });
};

exports.getCourseProgress = async (req, res) => {
    const access = await courseParticipant(req.params.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const lessons = await Lesson.findAll({
        where: { courseId: access.course.id },
        attributes: ["id", "title"],
        order: [["moduleId", "ASC"], ["orderIndex", "ASC"], ["id", "ASC"]]
    });
    if (access.isManager && !req.query.studentId) {
        const enrollments = await Enrollment.findAll({
            where: { courseId: access.course.id },
            include: [{ model: User, as: "student", attributes: ["id", "fullName"] }]
        });
        const progressRows = await LessonProgress.findAll({
            where: { lessonId: { [Op.in]: lessons.map((lesson) => lesson.id) } }
        });
        const completedByStudent = new Map();
        for (const row of progressRows) {
            completedByStudent.set(row.studentId, (completedByStudent.get(row.studentId) || 0) + 1);
        }
        return res.json({
            courseId: access.course.id,
            totalLessons: lessons.length,
            students: enrollments.filter((item) => item.student).map((item) => {
                const completedLessons = completedByStudent.get(item.studentId) || 0;
                return {
                    student: item.student,
                    completedLessons,
                    totalLessons: lessons.length,
                    completionPercent: lessons.length ? Math.round(completedLessons * 100 / lessons.length) : 0
                };
            })
        });
    }

    const studentId = access.isManager ? idValue(req.query.studentId) : req.user.id;
    if (!studentId) return res.status(400).json({ message: "Invalid student ID" });
    const enrollment = await Enrollment.findOne({
        where: { courseId: access.course.id, studentId }
    });
    if (!enrollment) return res.status(404).json({ message: "Student is not enrolled in this course" });
    const progressRows = await LessonProgress.findAll({
        where: { studentId, lessonId: { [Op.in]: lessons.map((lesson) => lesson.id) } }
    });
    const completed = new Map(progressRows.map((row) => [row.lessonId, row.completedAt]));
    const completedLessons = completed.size;
    res.json({
        courseId: access.course.id,
        studentId,
        totalLessons: lessons.length,
        completedLessons,
        completionPercent: lessons.length ? Math.round(completedLessons * 100 / lessons.length) : 0,
        lessons: lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            completed: completed.has(lesson.id),
            completedAt: completed.get(lesson.id) || null
        }))
    });
};

exports.listAnnouncements = async (req, res) => {
    const access = await courseParticipant(req.params.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    res.json(await Announcement.findAll({
        where: { courseId: access.course.id },
        include: [{ model: User, as: "author", attributes: ["id", "fullName"] }],
        order: [["createdAt", "DESC"]]
    }));
};

exports.listMyAnnouncements = async (req, res) => {
    const enrollments = await Enrollment.findAll({
        where: { studentId: req.user.id },
        attributes: ["courseId"]
    });
    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    if (!courseIds.length) return res.json([]);
    const announcements = await Announcement.findAll({
        where: { courseId: { [Op.in]: courseIds } },
        include: [
            { model: User, as: "author", attributes: ["id", "fullName"] },
            { model: Course, as: "course", attributes: ["id", "title"] }
        ],
        order: [["createdAt", "DESC"]]
    });
    res.json(announcements.map((announcement) => ({
        ...announcement.toJSON(),
        courseId: announcement.course.id,
        courseTitle: announcement.course.title
    })));
};

const publishAnnouncement = async ({ course, title, body, authorId, transaction }) => {
    const announcement = await Announcement.create({
        title: title.trim(),
        body: body.trim(),
        courseId: course.id,
        createdById: authorId
    }, { transaction });
    await createNotifications({
        courseId: course.id,
        type: "announcement",
        title: `Announcement: ${announcement.title}`,
        body: announcement.body.slice(0, 500),
        resourceType: "announcement",
        resourceId: announcement.id,
        transaction
    });
    return announcement;
};

exports.createAnnouncement = async (req, res) => {
    const access = await courseParticipant(req.params.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const { title, body } = req.body;
    if (!nonEmpty(title) || !nonEmpty(body, 20000)) {
        return res.status(400).json({ message: "Announcement title and body are required" });
    }
    const announcement = await sequelize.transaction((transaction) =>
        publishAnnouncement({
            course: access.course,
            title,
            body,
            authorId: req.user.id,
            transaction
        })
    );
    res.status(201).json(announcement);
};

exports.broadcastAnnouncement = async (req, res) => {
    const { title, body } = req.body;
    if (!nonEmpty(title) || !nonEmpty(body, 20000)) {
        return res.status(400).json({ message: "Announcement title and body are required" });
    }
    const courses = await Course.findAll({
        where: { lecturerId: req.user.id },
        order: [["id", "ASC"]]
    });
    if (!courses.length) {
        return res.status(400).json({ message: "Create a course before broadcasting an announcement" });
    }
    const announcements = await sequelize.transaction(async (transaction) => {
        const published = [];
        for (const course of courses) {
            published.push(await publishAnnouncement({
                course,
                title,
                body,
                authorId: req.user.id,
                transaction
            }));
        }
        return published;
    });
    res.status(201).json({ message: "Announcement sent to all your courses", announcements });
};

exports.updateAnnouncement = async (req, res) => {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    const access = await managerAccess(announcement.courseId, req.user, res);
    if (!access) return;
    const { title, body } = req.body;
    if ((title !== undefined && !nonEmpty(title)) || (body !== undefined && !nonEmpty(body, 20000))) {
        return res.status(400).json({ message: "Invalid announcement details" });
    }
    if (title !== undefined) announcement.title = title.trim();
    if (body !== undefined) announcement.body = body.trim();
    await announcement.save();
    res.json(announcement);
};

exports.deleteAnnouncement = async (req, res) => {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    const access = await managerAccess(announcement.courseId, req.user, res);
    if (!access) return;
    await announcement.destroy();
    res.json({ message: "Announcement deleted" });
};

const getStudentMessageRoom = async (courseId, user, otherId = null) => {
    if (user.role !== "student") {
        return { error: { status: 403, message: "Student messaging is only available to students" } };
    }
    const enrollment = await Enrollment.findOne({
        where: { courseId, studentId: user.id }
    });
    if (!enrollment) {
        return { error: { status: 403, message: "Join this class before messaging classmates" } };
    }
    const classEnrollments = await Enrollment.findAll({
        where: { courseId },
        attributes: ["studentId"]
    });
    const classmateIds = classEnrollments
        .map((item) => item.studentId)
        .filter((studentId) => studentId !== user.id);
    if (otherId != null && !classmateIds.includes(otherId)) {
        return { error: { status: 403, message: "You can only message students in this class" } };
    }
    return { classmateIds };
};

exports.listConversations = async (req, res) => {
    const courseId = idValue(req.params.courseId);
    if (!courseId) return res.status(400).json({ message: "Invalid course ID" });
    const room = await getStudentMessageRoom(courseId, req.user);
    if (room.error) return accessResponse(res, room.error);
    if (!room.classmateIds.length) return res.json([]);
    const messages = await Message.findAll({
        where: {
            courseId,
            [Op.or]: [
                { senderId: req.user.id, recipientId: { [Op.in]: room.classmateIds } },
                { recipientId: req.user.id, senderId: { [Op.in]: room.classmateIds } }
            ]
        },
        include: [
            { model: User, as: "sender", attributes: ["id", "fullName", "role"] },
            { model: User, as: "recipient", attributes: ["id", "fullName", "role"] }
        ],
        order: [["createdAt", "DESC"]]
    });
    const grouped = new Map();
    const classmates = await User.findAll({
        where: { id: { [Op.in]: room.classmateIds } },
        attributes: ["id", "fullName", "role"],
        order: [["fullName", "ASC"]]
    });
    for (const classmate of classmates) {
        grouped.set(classmate.id, { participant: classmate, latestMessage: null });
    }
    for (const message of messages) {
        const otherId = message.senderId === req.user.id ? message.recipientId : message.senderId;
        const conversation = grouped.get(otherId);
        if (conversation && !conversation.latestMessage) {
            conversation.latestMessage = message;
        }
    }
    res.json([...grouped.values()]);
};

exports.listMessages = async (req, res) => {
    const courseId = idValue(req.params.courseId);
    const otherId = idValue(req.params.userId);
    if (!courseId || !otherId) return res.status(400).json({ message: "Invalid conversation" });
    const room = await getStudentMessageRoom(courseId, req.user, otherId);
    if (room.error) return accessResponse(res, room.error);
    const messages = await Message.findAll({
        where: { courseId, [Op.or]: [
            { senderId: req.user.id, recipientId: otherId },
            { senderId: otherId, recipientId: req.user.id }
        ] },
        order: [["createdAt", "ASC"]]
    });
    const readAt = new Date();
    await Message.update({ readAt }, {
        where: { courseId, senderId: otherId, recipientId: req.user.id, readAt: null }
    });
    for (const message of messages) {
        if (message.senderId === otherId && !message.readAt) message.readAt = readAt;
    }
    res.json(messages);
};

exports.sendMessage = async (req, res) => {
    const courseId = idValue(req.params.courseId);
    const recipientId = idValue(req.body.recipientId);
    if (!courseId || !recipientId || !nonEmpty(req.body.body, 20000)) {
        return res.status(400).json({ message: "Recipient and message body are required" });
    }
    const room = await getStudentMessageRoom(courseId, req.user, recipientId);
    if (room.error) return accessResponse(res, room.error);
    const message = await sequelize.transaction(async (transaction) => {
        const created = await Message.create({
            courseId,
            senderId: req.user.id,
            recipientId,
            body: req.body.body.trim()
        }, { transaction });
        await createNotifications({
            userIds: [recipientId],
            type: "message",
            title: "New course message",
            body: req.body.body.trim().slice(0, 500),
            resourceType: "message",
            resourceId: created.id,
            transaction
        });
        return created;
    });
    res.status(201).json(message);
};

exports.listNotifications = async (req, res) => {
    res.json(await Notification.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
        limit: 100
    }));
};

exports.markNotificationRead = async (req, res) => {
    const notification = await Notification.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    if (!notification.readAt) {
        notification.readAt = new Date();
        await notification.save();
    }
    res.json(notification);
};

exports.markAllNotificationsRead = async (req, res) => {
    const [updated] = await Notification.update({ readAt: new Date() }, {
        where: { userId: req.user.id, readAt: null }
    });
    res.json({ updated });
};

exports.listCalendarEvents = async (req, res) => {
    const access = await courseParticipant(req.params.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    res.json(await CalendarEvent.findAll({
        where: { courseId: access.course.id },
        order: [["startsAt", "ASC"]]
    }));
};

exports.listMyCalendar = async (req, res) => {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) ||
        (from && to && from > to)) {
        return res.status(400).json({ message: "Invalid calendar date range" });
    }

    let courses;
    if (req.user.role === "student") {
        const enrollments = await Enrollment.findAll({
            where: { studentId: req.user.id },
            attributes: ["courseId"]
        });
        courses = await Course.findAll({
            where: { id: { [Op.in]: enrollments.map((enrollment) => enrollment.courseId) } },
            attributes: ["id", "title"]
        });
    } else {
        courses = await Course.findAll({
            where: { lecturerId: req.user.id },
            attributes: ["id", "title"]
        });
    }

    const courseIds = courses.map((course) => course.id);
    if (!courseIds.length) return res.json([]);
    const courseTitles = new Map(courses.map((course) => [course.id, course.title]));
    const [events, assignments] = await Promise.all([
        CalendarEvent.findAll({
            where: {
                courseId: { [Op.in]: courseIds },
                ...(from || to ? {
                    startsAt: {
                        ...(from ? { [Op.gte]: from } : {}),
                        ...(to ? { [Op.lte]: to } : {})
                    }
                } : {})
            },
            order: [["startsAt", "ASC"]]
        }),
        Assignment.findAll({
            where: {
                courseId: { [Op.in]: courseIds },
                ...(from || to ? {
                    dueDate: {
                        ...(from ? { [Op.gte]: from } : {}),
                        ...(to ? { [Op.lte]: to } : {})
                    }
                } : {})
            },
            order: [["dueDate", "ASC"]]
        })
    ]);

    const agenda = [
        ...events.map((event) => ({
            id: `event-${event.id}`,
            type: event.eventType,
            title: event.title,
            description: event.description,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            courseId: event.courseId,
            courseTitle: courseTitles.get(event.courseId)
        })),
        ...assignments.map((assignment) => ({
            id: `assignment-${assignment.id}`,
            type: "assignment",
            title: assignment.title,
            description: assignment.description,
            startsAt: assignment.dueDate,
            endsAt: assignment.dueDate,
            courseId: assignment.courseId,
            courseTitle: courseTitles.get(assignment.courseId)
        }))
    ];
    agenda.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    res.json(agenda);
};

const validEventTimes = (startsAt, endsAt) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
};

exports.createCalendarEvent = async (req, res) => {
    const access = await managerAccess(req.params.courseId, req.user, res);
    if (!access) return;
    const { title, description, startsAt, endsAt, eventType = "event" } = req.body;
    const validTypes = ["event", "class", "exam", "deadline", "other"];
    if (!nonEmpty(title) || !validEventTimes(startsAt, endsAt) ||
        !validTypes.includes(eventType) ||
        (description != null && typeof description !== "string")) {
        return res.status(400).json({ message: "Valid title, start, and end times are required" });
    }
    const event = await sequelize.transaction(async (transaction) => {
        const created = await CalendarEvent.create({
            courseId: access.course.id, createdById: req.user.id, eventType, title: title.trim(),
            description: description?.trim() || null, startsAt: new Date(startsAt), endsAt: new Date(endsAt)
        }, { transaction });
        await createNotifications({
            courseId: access.course.id,
            type: "calendar",
            title: `New course event: ${created.title}`,
            body: created.description || created.startsAt.toISOString(),
            resourceType: "calendarEvent",
            resourceId: created.id,
            transaction
        });
        return created;
    });
    res.status(201).json(event);
};

exports.updateCalendarEvent = async (req, res) => {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    const access = await managerAccess(event.courseId, req.user, res);
    if (!access) return;
    const startsAt = req.body.startsAt ?? event.startsAt;
    const endsAt = req.body.endsAt ?? event.endsAt;
    const validTypes = ["event", "class", "exam", "deadline", "other"];
    if (!validEventTimes(startsAt, endsAt) ||
        (req.body.eventType !== undefined && !validTypes.includes(req.body.eventType)) ||
        (req.body.title !== undefined && !nonEmpty(req.body.title)) ||
        (req.body.description !== undefined && req.body.description !== null && typeof req.body.description !== "string")) {
        return res.status(400).json({ message: "Invalid calendar event details" });
    }
    if (req.body.title !== undefined) event.title = req.body.title.trim();
    if (req.body.eventType !== undefined) event.eventType = req.body.eventType;
    if (req.body.description !== undefined) event.description = req.body.description?.trim() || null;
    event.startsAt = startsAt;
    event.endsAt = endsAt;
    await event.save();
    res.json(event);
};

exports.deleteCalendarEvent = async (req, res) => {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    const access = await managerAccess(event.courseId, req.user, res);
    if (!access) return;
    await event.destroy();
    res.json({ message: "Calendar event deleted" });
};

exports.listDepartments = async (req, res) => {
    res.json(await Department.findAll({ order: [["name", "ASC"]] }));
};

exports.listCertificates = async (req, res) => {
    res.json(await Certificate.findAll({
        where: { studentId: req.user.id },
        include: [{ model: Course, as: "course", attributes: ["id", "title"] }],
        order: [["issuedAt", "DESC"]]
    }));
};

exports.issueCertificate = async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Student access required" });
    const courseId = idValue(req.params.courseId);
    if (!courseId) return res.status(400).json({ message: "Invalid course ID" });
    const enrollment = await Enrollment.findOne({ where: { studentId: req.user.id, courseId } });
    if (!enrollment) return res.status(403).json({ message: "Enroll in the course first" });
    const lessons = await Lesson.findAll({ where: { courseId }, attributes: ["id"] });
    if (!lessons.length) return res.status(409).json({ message: "Complete all course lessons before requesting a certificate" });
    const completed = await LessonProgress.count({
        where: { studentId: req.user.id, lessonId: { [Op.in]: lessons.map((lesson) => lesson.id) }, completedAt: { [Op.ne]: null } }
    });
    if (completed !== lessons.length) {
        return res.status(409).json({ message: "Complete all course lessons before requesting a certificate" });
    }
    const code = `${courseId}-${req.user.id}-${require("crypto").randomUUID()}`;
    const [certificate, created] = await Certificate.findOrCreate({
        where: { studentId: req.user.id, courseId },
        defaults: { studentId: req.user.id, courseId, certificateCode: code, issuedAt: new Date() }
    });
    res.status(created ? 201 : 200).json(certificate);
};

exports.updateCourseDepartment = async (req, res) => {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const access = await managerAccess(course.id, req.user, res);
    if (!access) return;
    const departmentId = req.body.departmentId;
    if (departmentId !== null && departmentId !== undefined) {
        const id = idValue(departmentId);
        if (!id || !(await Department.findByPk(id))) {
            return res.status(400).json({ message: "Department not found" });
        }
        course.departmentId = id;
    } else {
        course.departmentId = null;
    }
    await course.save();
    res.json(course);
};
