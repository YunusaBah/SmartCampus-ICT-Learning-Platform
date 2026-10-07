const {DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

/*
  USER TABLE - stores all system users
*/
const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 255],
            notEmpty: true
        }
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            len: [3, 254]
        }
    },

    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },

    role: {
        type: DataTypes.ENUM("student", "lecturer"),
        allowNull: false,
        defaultValue: "student"
    },

    tokenVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            isInt: true
        }
    },

    matNumber: {
        type: DataTypes.STRING(50),
        allowNull: true
    },

    phone: {
        type: DataTypes.STRING(30),
        allowNull: true
    }
});

module.exports = User;