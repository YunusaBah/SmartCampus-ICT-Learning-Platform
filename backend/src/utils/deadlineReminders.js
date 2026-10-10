const { Op } = require("sequelize");
const Assignment = require("../models/Assignment");
const Enrollment = require("../models/Enrollment");
const DeadlineReminder = require("../models/DeadlineReminder");
const createNotifications = require("./createNotifications");
const { sequelize } = require("../config/db");

const HOUR = 60 * 60 * 1000;

const sendDeadlineReminders = async (now = new Date()) => {
    const dueWithin24Hours = new Date(now.getTime() + 24 * HOUR);
    const assignments = await Assignment.findAll({
        where: {
            dueDate: { [Op.gt]: now, [Op.lte]: dueWithin24Hours }
        },
        attributes: ["id", "courseId", "title", "dueDate"]
    });
    let createdCount = 0;

    for (const assignment of assignments) {
        const dueDate = new Date(assignment.dueDate);
        const window = dueDate.getTime() <= now.getTime() + HOUR ? "1h" : "24h";
        const enrollments = await Enrollment.findAll({
            where: { courseId: assignment.courseId },
            attributes: ["studentId"]
        });
        const userIds = enrollments.map((enrollment) => enrollment.studentId);
        if (!userIds.length) continue;

        for (const userId of userIds) {
            await sequelize.transaction(async (transaction) => {
                const [, created] = await DeadlineReminder.findOrCreate({
                    where: { assignmentId: assignment.id, userId, window },
                    defaults: { assignmentId: assignment.id, userId, window },
                    transaction
                });
                if (!created) return;

                await createNotifications({
                    userIds: [userId],
                    type: "deadline-reminder",
                    title: `Assignment due ${window === "1h" ? "within one hour" : "within 24 hours"}`,
                    body: `${assignment.title} is due ${dueDate.toLocaleString()}.`,
                    resourceType: "assignment",
                    resourceId: assignment.id,
                    transaction
                });
                createdCount += 1;
            });
        }
    }
    return createdCount;
};

module.exports = sendDeadlineReminders;
