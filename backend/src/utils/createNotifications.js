const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");

const createNotifications = async ({ courseId, userIds, type, title, body, resourceType, resourceId, transaction }) => {
    let recipients = userIds;
    if (!recipients && courseId) {
        const enrollments = await Enrollment.findAll({
            where: { courseId },
            attributes: ["studentId"],
            transaction
        });
        recipients = enrollments.map((enrollment) => enrollment.studentId);
    }

    const uniqueRecipients = [...new Set(recipients || [])];
    if (!uniqueRecipients.length) return [];

    return Notification.bulkCreate(uniqueRecipients.map((userId) => ({
        userId,
        type,
        title,
        body,
        resourceType: resourceType || null,
        resourceId: resourceId || null
    })), { transaction });
};

module.exports = createNotifications;
