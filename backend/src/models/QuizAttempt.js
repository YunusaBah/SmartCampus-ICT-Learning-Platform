const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

module.exports = sequelize.define("QuizAttempt", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    assessmentId: { type: DataTypes.INTEGER, allowNull: false },
    startedAt: { type: DataTypes.DATE, allowNull: false },
    deadlineAt: { type: DataTypes.DATE, allowNull: false },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    answers: { type: DataTypes.JSON, allowNull: false },
    score: { type: DataTypes.INTEGER, allowNull: true },
    totalQuestions: { type: DataTypes.INTEGER, allowNull: true }
}, {
    indexes: [{ fields: ["studentId", "assessmentId", "submittedAt"] }]
});
