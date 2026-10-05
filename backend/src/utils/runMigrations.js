const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const migrationName = "20261004_add_lms_features";
const followupMigrationName = "20261004_02_lms_calendar_assessment_options";
const lecturerStudentRolesMigrationName = "20261004_03_lecturer_student_roles";
const roleEnumCleanupMigrationName = "20261004_04_remove_admin_role_value";
const enforceTwoRoleEnumMigrationName = "20261004_05_enforce_two_role_enum";
const reconcileLmsSchemaMigrationName = "20261004_06_reconcile_lms_columns";
const additions = {
    Users: {
        tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    },
    Courses: {
        departmentId: { type: DataTypes.INTEGER, allowNull: true }
    },
    Lessons: {
        moduleId: { type: DataTypes.INTEGER, allowNull: true },
        orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    },
    Quizzes: {
        assessmentId: { type: DataTypes.INTEGER, allowNull: true }
    },
    Submissions: {
        feedback: { type: DataTypes.TEXT, allowNull: true }
    }
};

const getTables = async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    return new Set(tables.map((table) => (typeof table === "string" ? table : table.tableName)));
};

module.exports = async () => {
    const queryInterface = sequelize.getQueryInterface();
    let tables = await getTables(queryInterface);
    if (!tables.has("SchemaMigrations")) {
        await queryInterface.createTable("SchemaMigrations", {
            name: { type: DataTypes.STRING(100), primaryKey: true, allowNull: false },
            appliedAt: { type: DataTypes.DATE, allowNull: false }
        });
    }

    const applied = await queryInterface.select(null, "SchemaMigrations", {
        where: { name: migrationName },
        limit: 1
    });
    if (!applied.length) {
        for (const [tableName, columns] of Object.entries(additions)) {
            tables = await getTables(queryInterface);
            if (!tables.has(tableName)) continue;
            const existing = await queryInterface.describeTable(tableName);
            for (const [columnName, definition] of Object.entries(columns)) {
                if (!Object.prototype.hasOwnProperty.call(existing, columnName)) {
                    await queryInterface.addColumn(tableName, columnName, definition);
                }
            }
        }

        tables = await getTables(queryInterface);
        if (tables.has("Quizzes")) {
            const quizColumns = await queryInterface.describeTable("Quizzes");
            if (Object.prototype.hasOwnProperty.call(quizColumns, "question")) {
                await queryInterface.changeColumn("Quizzes", "question", {
                    type: DataTypes.TEXT,
                    allowNull: false
                });
            }
        }

        await queryInterface.bulkInsert("SchemaMigrations", [{
            name: migrationName,
            appliedAt: new Date()
        }]);
    }

    const followupApplied = await queryInterface.select(null, "SchemaMigrations", {
        where: { name: followupMigrationName },
        limit: 1
    });
    if (!followupApplied.length) {
        for (const [tableName, columns] of Object.entries({
            CalendarEvents: {
                eventType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "event" }
            },
            QuizAssessments: {
                maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
            }
        })) {
            tables = await getTables(queryInterface);
            if (!tables.has(tableName)) continue;
            const existing = await queryInterface.describeTable(tableName);
            for (const [columnName, definition] of Object.entries(columns)) {
                if (!Object.prototype.hasOwnProperty.call(existing, columnName)) {
                    await queryInterface.addColumn(tableName, columnName, definition);
                }
            }
        }
        await queryInterface.bulkInsert("SchemaMigrations", [{
            name: followupMigrationName,
            appliedAt: new Date()
        }]);
    }

    const rolesApplied = await queryInterface.select(null, "SchemaMigrations", {
        where: { name: lecturerStudentRolesMigrationName },
        limit: 1
    });
    if (!rolesApplied.length) {
        tables = await getTables(queryInterface);
        if (tables.has("Users")) {
            const userColumns = await queryInterface.describeTable("Users");
            if (Object.prototype.hasOwnProperty.call(userColumns, "role")) {
                const tokenVersionUpdate = Object.prototype.hasOwnProperty.call(userColumns, "tokenVersion")
                    ? ", `tokenVersion` = `tokenVersion` + 1"
                    : "";
                await queryInterface.sequelize.query(
                    `UPDATE \`Users\` SET \`role\` = 'lecturer'${tokenVersionUpdate} WHERE \`role\` = 'admin'`
                );
            }
        }
        await queryInterface.bulkInsert("SchemaMigrations", [{
            name: lecturerStudentRolesMigrationName,
            appliedAt: new Date()
        }]);
    }

    const roleEnumCleanupApplied = await queryInterface.select(null, "SchemaMigrations", {
        where: { name: roleEnumCleanupMigrationName },
        limit: 1
    });
    if (!roleEnumCleanupApplied.length) {
        tables = await getTables(queryInterface);
        if (tables.has("Users")) {
            const userColumns = await queryInterface.describeTable("Users");
            if (Object.prototype.hasOwnProperty.call(userColumns, "role")) {
                if (Object.prototype.hasOwnProperty.call(userColumns, "tokenVersion")) {
                    await queryInterface.sequelize.query(
                        "UPDATE `Users` SET `role` = 'lecturer', `tokenVersion` = `tokenVersion` + 1 WHERE `role` = 'admin'"
                    );
                } else {
                    await queryInterface.sequelize.query(
                        "UPDATE `Users` SET `role` = 'lecturer' WHERE `role` = 'admin'"
                    );
                }
                const nullable = userColumns.role.allowNull ? "NULL" : "NOT NULL";
                const defaultValue = userColumns.role.defaultValue === undefined
                    ? ""
                    : ` DEFAULT ${sequelize.escape(userColumns.role.defaultValue)}`;
                await queryInterface.sequelize.query(
                    `ALTER TABLE \`Users\` MODIFY \`role\` ENUM('student','lecturer') ${nullable}${defaultValue}`
                );
            }
        }
        await queryInterface.bulkInsert("SchemaMigrations", [{
            name: roleEnumCleanupMigrationName,
            appliedAt: new Date()
        }]);
    }

    const enforceTwoRoleEnumApplied = await queryInterface.select(null, "SchemaMigrations", {
        where: { name: enforceTwoRoleEnumMigrationName },
        limit: 1
    });
    if (!enforceTwoRoleEnumApplied.length) {
        tables = await getTables(queryInterface);
        if (tables.has("Users")) {
            const userColumns = await queryInterface.describeTable("Users");
            if (Object.prototype.hasOwnProperty.call(userColumns, "role")) {
                await queryInterface.sequelize.query(
                    "ALTER TABLE `Users` MODIFY `role` ENUM('student','lecturer') NULL DEFAULT 'student'"
                );
            }
        }
        await queryInterface.bulkInsert("SchemaMigrations", [{
            name: enforceTwoRoleEnumMigrationName,
            appliedAt: new Date()
        }]);

        const reconcileLmsSchemaApplied = await queryInterface.select(null, "SchemaMigrations", {
            where: { name: reconcileLmsSchemaMigrationName },
            limit: 1
        });
        if (!reconcileLmsSchemaApplied.length) {
            tables = await getTables(queryInterface);
            let addedTokenVersion = false;
            for (const [tableName, columns] of Object.entries({
                ...additions,
                CalendarEvents: {
                    eventType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "event" }
                },
                QuizAssessments: {
                    maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
                }
            })) {
                if (!tables.has(tableName)) continue;
                const existing = await queryInterface.describeTable(tableName);
                for (const [columnName, definition] of Object.entries(columns)) {
                    if (!Object.prototype.hasOwnProperty.call(existing, columnName)) {
                        await queryInterface.addColumn(tableName, columnName, definition);
                        if (tableName === "Users" && columnName === "tokenVersion") {
                            addedTokenVersion = true;
                        }
                    }
                }
            }
            if (addedTokenVersion) {
                await queryInterface.sequelize.query(
                    "UPDATE `Users` SET `tokenVersion` = 1"
                );
            }
            await queryInterface.bulkInsert("SchemaMigrations", [{
                name: reconcileLmsSchemaMigrationName,
                appliedAt: new Date()
            }]);
        }
    };
};
