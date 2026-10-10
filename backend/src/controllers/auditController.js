const AuditLog = require("../models/AuditLog");

exports.listMyAuditLogs = async (req, res) => {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 25);
    if (!Number.isSafeInteger(page) || page < 1 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ message: "Page must be positive and pageSize must be between 1 and 100" });
    }

    const { count, rows } = await AuditLog.findAndCountAll({
        where: { actorId: req.user.id },
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        limit: pageSize,
        offset: (page - 1) * pageSize
    });
    return res.json({
        items: rows,
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize)
    });
};
