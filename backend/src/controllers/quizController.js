const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const getCourseAccess = require("../utils/courseAccess");

exports.createQuiz = async (req, res) => {
    try {
        const {
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            courseId
        } = req.body;

        const options = [optionA, optionB, optionC, optionD];
        if (typeof question !== "string" || !question.trim() ||
            options.some(option => typeof option !== "string" || !option.trim()) ||
            typeof correctAnswer !== "string" || !/^[A-D]$/i.test(correctAnswer) ||
            !courseId) {
            return res.status(400).json({ message: "All quiz fields are required" });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        if (course.lecturerId !== req.user.id) {
            return res.status(403).json({ message: "You can only add quizzes to your courses" });
        }

        const quiz = await Quiz.create({
            question: question.trim(),
            optionA: optionA.trim(),
            optionB: optionB.trim(),
            optionC: optionC.trim(),
            optionD: optionD.trim(),
            correctAnswer: correctAnswer.toUpperCase(),
            courseId
        });

        res.status(201).json({
            message: "Quiz created successfully",
            quiz
        });

    } catch (error) {
        console.error("Failed to create quiz:", error);
        res.status(500).json({ message: "Failed to create quiz" });
    }
};

exports.getCourseQuizzes = async (req, res) => {
    try {
        const access = await getCourseAccess(req.params.courseId, req.user);
        if (access.status) return res.status(access.status).json({ message: access.message });

        const quizzes = await Quiz.findAll({
            where: { courseId: access.course.id },
            attributes: access.isManager ? undefined : { exclude: ["correctAnswer"] },
            order: [["id", "DESC"]]
        });

        res.json(quizzes);

    } catch (error) {
        console.error("Failed to load quizzes:", error);
        res.status(500).json({ message: "Failed to load quizzes" });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { quizId, selectedAnswer } = req.body;

        if (!quizId || typeof selectedAnswer !== "string" || !/^[A-D]$/i.test(selectedAnswer)) {
            return res.status(400).json({ message: "quizId and selectedAnswer are required" });
        }

        const quiz = await Quiz.findByPk(quizId);

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        const enrolled = await Enrollment.findOne({
            where: {
                studentId: req.user.id,
                courseId: quiz.courseId
            }
        });

        if (!enrolled) {
            return res.status(403).json({ message: "Enroll in the course first" });
        }

        let score = 0;

        if (selectedAnswer.toUpperCase() === quiz.correctAnswer.toUpperCase()) {
            score = 1;
        }

        const result = await QuizResult.create({
            studentId: req.user.id,
            quizId,
            selectedAnswer: selectedAnswer.toUpperCase(),
            score
        });

        res.json({
            message: "Quiz submitted",
            result,
            passed: score === 1
        });

    } catch (error) {
        console.error("Failed to submit quiz:", error);
        res.status(500).json({ message: "Failed to submit quiz" });
    }
};
