const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Quiz = sequelize.define("Quiz", {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    question: {
        type: DataTypes.TEXT,
        allowNull: false
    },

    optionA: {
        type: DataTypes.STRING,
        allowNull: false
    },

    optionB: {
        type: DataTypes.STRING,
        allowNull: false
    },

    optionC: {
        type: DataTypes.STRING,
        allowNull: false
    },

    optionD: {
        type: DataTypes.STRING,
        allowNull: false
    },

    correctAnswer: {
        type: DataTypes.STRING,
        allowNull: false
    },

    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    assessmentId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }

});

module.exports = Quiz;