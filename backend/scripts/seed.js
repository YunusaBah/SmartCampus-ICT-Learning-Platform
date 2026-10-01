/**
 * Run from backend folder: node scripts/seed.js
 * Creates sample lecturer, student, and a demo course.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const bcrypt = require("bcrypt");
const { sequelize } = require("../src/config/db");
require("../src/models/associations");

const User = require("../src/models/User");
const Course = require("../src/models/Course");
const Enrollment = require("../src/models/Enrollment");
const generateClassCode = require("../src/utils/generateClassCode");

const seed = async () => {
    try {
        await sequelize.sync();

        const [lecturer] = await User.findOrCreate({
            where: { email: "lecturer@smartcampus.com" },
            defaults: {
                fullName: "Dr. Jane Lecturer",
                password: await bcrypt.hash("lecturer123", 10),
                role: "lecturer"
            }
        });

        const [student] = await User.findOrCreate({
            where: { email: "student@smartcampus.com" },
            defaults: {
                fullName: "John Student",
                password: await bcrypt.hash("student123", 10),
                role: "student"
            }
        });

        const [admin] = await User.findOrCreate({
            where: { email: "admin@smartcampus.com" },
            defaults: {
                fullName: "System Admin",
                password: await bcrypt.hash("admin123", 10),
                role: "admin"
            }
        });

        const [course] = await Course.findOrCreate({
            where: { title: "Introduction to ICT" },
            defaults: {
                description: "Fundamentals of information and communication technology.",
                lecturerId: lecturer.id,
                classCode: await generateClassCode()
            }
        });

        if (!course.classCode) {
            course.classCode = await generateClassCode();
            await course.save();
        }

        await Enrollment.findOrCreate({
            where: {
                studentId: student.id,
                courseId: course.id
            }
        });

        console.log("Seed complete!");
        console.log("Lecturer: lecturer@smartcampus.com / lecturer123");
        console.log("Student:  student@smartcampus.com / student123");
        console.log("Admin:    admin@smartcampus.com / admin123");
        console.log(`Course:   ${course.title} (id ${course.id})`);

        process.exit(0);
    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    }
};

seed();
