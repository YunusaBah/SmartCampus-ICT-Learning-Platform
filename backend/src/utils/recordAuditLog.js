const AuditLog = require("../models/AuditLog");

const recordAuditLog = ({
    actorId,
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    transaction
}) => AuditLog.create({
    actorId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues
}, { transaction });

module.exports = recordAuditLog;
