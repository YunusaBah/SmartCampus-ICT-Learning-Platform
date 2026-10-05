const { sequelize } = require("../config/db");
const Quiz = require("../models/Quiz");
const QuizAssessment = require("../models/QuizAssessment");
const QuizAttempt = require("../models/QuizAttempt");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const getCourseAccess = require("../utils/courseAccess");
const createNotifications = require("../utils/createNotifications");

const validId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const validText = (value) => typeof value === "string" && value.trim().length > 0;
const publicQuestion = (question) => {
    const item = question.toJSON ? question.toJSON() : question;
    delete item.correctAnswer;
    return item;
};

const calculateScore = (questions, answers) => questions.reduce((score, question) =>
    score + (answers[String(question.id)] === question.correctAnswer.toUpperCase() ? 1 : 0), 0);

const finalizeAttempt = async (attempt, transaction, submittedAt = new Date()) => {
    const questions = await Quiz.findAll({
        where: { assessmentId: attempt.assessmentId },
        attributes: ["id", "correctAnswer"],
        transaction
    });
    attempt.score = calculateScore(questions, attempt.answers || {});
    attempt.totalQuestions = questions.length;
    attempt.submittedAt = submittedAt;
    await attempt.save({ transaction });
    return { questions, attempt };
};

const loadAttemptQuestions = async (assessmentId) => Quiz.findAll({
    where: { assessmentId },
    attributes: { exclude: ["correctAnswer"] },
    order: [["id", "ASC"]]
});

exports.createAssessment = async (req, res) => {
    const { title, instructions, timeLimitMinutes, maxAttempts = 1, courseId, questions } = req.body;
    if (!validText(title) || !validId(courseId) ||
        !Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 600 ||
        !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10 ||
        (instructions != null && typeof instructions !== "string") ||
        !Array.isArray(questions) || questions.length < 1 || questions.length > 100) {
        return res.status(400).json({ message: "Assessment details and 1-100 valid questions are required" });
    }
    for (const question of questions) {
        if (!question || typeof question !== "object" || Array.isArray(question)) {
            return res.status(400).json({ message: "Each assessment question must be an object" });
        }
        const options = [question.optionA, question.optionB, question.optionC, question.optionD];
        if (!validText(question.question) || options.some((option) => !validText(option)) ||
            typeof question.correctAnswer !== "string" || !/^[A-D]$/i.test(question.correctAnswer)) {
            return res.status(400).json({ message: "Each question requires a prompt, four options, and a correct answer" });
        }
    }
    const access = await getCourseAccess(courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    if (!access.isManager) return res.status(403).json({ message: "Only course managers can create assessments" });

    const result = await sequelize.transaction(async (transaction) => {
        const assessment = await QuizAssessment.create({
            title: title.trim(),
            instructions: instructions?.trim() || null,
            timeLimitMinutes,
            maxAttempts,
            courseId: access.course.id
        }, { transaction });
        await Quiz.bulkCreate(questions.map((question) => ({
            question: question.question.trim(),
            optionA: question.optionA.trim(),
            optionB: question.optionB.trim(),
            optionC: question.optionC.trim(),
            optionD: question.optionD.trim(),
            correctAnswer: question.correctAnswer.toUpperCase(),
            courseId: access.course.id,
            assessmentId: assessment.id
        })), { transaction, returning: true });
        const createdQuestions = await Quiz.findAll({
            where: { assessmentId: assessment.id },
            order: [["id", "ASC"]],
            transaction
        });
        await createNotifications({
            courseId: access.course.id,
            type: "assessment",
            title: `New assessment: ${assessment.title}`,
            body: "A timed assessment is available in your course.",
            resourceType: "assessment",
            resourceId: assessment.id,
            transaction
        });
        return { assessment, questions: createdQuestions };
    });
    res.status(201).json({
        ...result.assessment.toJSON(),
        questions: result.questions.map((question) => publicQuestion(question))
    });
};

exports.listAssessments = async (req, res) => {
    const access = await getCourseAccess(req.params.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const assessments = await QuizAssessment.findAll({
        where: { courseId: access.course.id },
        include: [{ model: Quiz, as: "questions", attributes: access.isManager
            ? undefined
            : { exclude: ["correctAnswer"] } }],
        order: [["createdAt", "DESC"]]
    });
    res.json(assessments);
};

exports.getAssessment = async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid assessment ID" });
    const assessment = await QuizAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const access = await getCourseAccess(assessment.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const questions = await loadAttemptQuestions(assessment.id);
    const data = assessment.toJSON();
    data.questions = access.isManager
        ? await Quiz.findAll({ where: { assessmentId: assessment.id }, order: [["id", "ASC"]] })
        : questions;
    res.json(data);
};

exports.listAssessmentAttempts = async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid assessment ID" });
    const assessment = await QuizAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const access = await getCourseAccess(assessment.courseId, req.user);
    if (access.status) return res.status(access.status).json({ message: access.message });
    if (!access.isManager) return res.status(403).json({ message: "Only course managers can view attempts" });
    const attempts = await QuizAttempt.findAll({
        where: { assessmentId: assessment.id },
        include: [{ model: User, as: "student", attributes: ["id", "fullName"] }],
        order: [["startedAt", "DESC"]]
    });
    res.json(attempts);
};

exports.startAttempt = async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Student access required" });
    const assessmentId = Number(req.params.id);
    if (!validId(assessmentId)) return res.status(400).json({ message: "Invalid assessment ID" });
    const assessment = await QuizAssessment.findByPk(assessmentId);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const enrolled = await Enrollment.findOne({
        where: { studentId: req.user.id, courseId: assessment.courseId }
    });
    if (!enrolled) return res.status(403).json({ message: "Enroll in the course first" });

    const outcome = await sequelize.transaction(async (transaction) => {
        await QuizAssessment.findByPk(assessment.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        let active = await QuizAttempt.findOne({
            where: { studentId: req.user.id, assessmentId: assessment.id, submittedAt: null },
            order: [["startedAt", "DESC"]],
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        const now = new Date();
        if (active && new Date(active.deadlineAt) <= now) {
            await finalizeAttempt(active, transaction, active.deadlineAt);
            active = null;
        }
        if (active) return { attempt: active, resumed: true };
        const attemptCount = await QuizAttempt.count({
            where: { studentId: req.user.id, assessmentId: assessment.id },
            transaction
        });
        if (attemptCount >= assessment.maxAttempts) {
            return { status: 409, message: "You have used all attempts for this assessment" };
        }
        const attempt = await QuizAttempt.create({
            studentId: req.user.id,
            assessmentId: assessment.id,
            startedAt: now,
            deadlineAt: new Date(now.getTime() + assessment.timeLimitMinutes * 60 * 1000),
            answers: {}
        }, { transaction });
        return { attempt, resumed: false };
    });
    if (outcome.status) return res.status(outcome.status).json({ message: outcome.message });
    res.status(outcome.resumed ? 200 : 201).json({
        attempt: outcome.attempt,
        questions: await loadAttemptQuestions(assessment.id)
    });
};

exports.saveAnswers = async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Student access required" });
    if (!validId(req.params.attemptId)) return res.status(400).json({ message: "Invalid attempt ID" });
    if (!req.body.answers || typeof req.body.answers !== "object" || Array.isArray(req.body.answers)) {
        return res.status(400).json({ message: "Answers must be an object keyed by question ID" });
    }
    const attemptId = Number(req.params.attemptId);
    const result = await sequelize.transaction(async (transaction) => {
        const attempt = await QuizAttempt.findByPk(attemptId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (!attempt) return { status: 404, message: "Attempt not found" };
        if (attempt.studentId !== req.user.id) return { status: 403, message: "Attempt access denied" };
        if (attempt.submittedAt) return { status: 409, message: "Attempt has already been submitted" };
        if (Date.now() >= new Date(attempt.deadlineAt).getTime()) {
            await finalizeAttempt(attempt, transaction, attempt.deadlineAt);
            return { status: 409, message: "The assessment deadline has passed", attempt };
        }

        const questionIds = new Set((await Quiz.findAll({
            where: { assessmentId: attempt.assessmentId },
            attributes: ["id"],
            transaction
        })).map((question) => String(question.id)));
        const incoming = {};
        for (const [questionId, answer] of Object.entries(req.body.answers)) {
            if (!questionIds.has(questionId) || typeof answer !== "string" || !/^[A-D]$/i.test(answer)) {
                return { status: 400, message: "Each answer must reference an assessment question and use A, B, C, or D" };
            }
            incoming[questionId] = answer.toUpperCase();
        }
        attempt.answers = { ...(attempt.answers || {}), ...incoming };
        await attempt.save({ transaction });
        return { attempt };
    });
    if (result.status) {
        return res.status(result.status).json({
            message: result.message,
            ...(result.attempt ? { attempt: result.attempt } : {})
        });
    }
    res.json({ message: "Answers saved", attempt: result.attempt });
};

exports.submitAttempt = async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Student access required" });
    if (!validId(req.params.attemptId)) return res.status(400).json({ message: "Invalid attempt ID" });
    const attemptId = Number(req.params.attemptId);
    const result = await sequelize.transaction(async (transaction) => {
        const attempt = await QuizAttempt.findByPk(attemptId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (!attempt) return { status: 404, message: "Attempt not found" };
        if (attempt.studentId !== req.user.id) return { status: 403, message: "Attempt access denied" };
        if (attempt.submittedAt) return { status: 409, message: "Attempt has already been submitted" };
        if (Date.now() >= new Date(attempt.deadlineAt).getTime()) {
            await finalizeAttempt(attempt, transaction, attempt.deadlineAt);
            return { status: 409, message: "The assessment deadline has passed", attempt };
        }
        const finalized = await finalizeAttempt(attempt, transaction);
        return { attempt: finalized.attempt, questions: finalized.questions };
    });
    if (result.status) return res.status(result.status).json({ message: result.message });
    res.json({
        message: "Assessment submitted",
        attempt: result.attempt,
        results: result.questions.map((question) => ({
            questionId: question.id,
            selectedAnswer: result.attempt.answers[String(question.id)] || null,
            correctAnswer: question.correctAnswer,
            correct: result.attempt.answers[String(question.id)] === question.correctAnswer.toUpperCase()
        }))
    });
};

exports.getMyAttempt = async (req, res) => {
    if (req.user.role !== "student") return res.status(403).json({ message: "Student access required" });
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid assessment ID" });
    const assessment = await QuizAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const enrolled = await Enrollment.findOne({
        where: { studentId: req.user.id, courseId: assessment.courseId }
    });
    if (!enrolled) return res.status(403).json({ message: "Enroll in the course first" });
    let attempt = await QuizAttempt.findOne({
        where: { studentId: req.user.id, assessmentId: assessment.id, submittedAt: null },
        order: [["startedAt", "DESC"]]
    });
    if (!attempt) {
        attempt = await QuizAttempt.findOne({
            where: { studentId: req.user.id, assessmentId: assessment.id },
            order: [["startedAt", "DESC"]]
        });
        if (!attempt) return res.status(404).json({ message: "No assessment attempt found" });
        const questions = await Quiz.findAll({
            where: { assessmentId: assessment.id },
            attributes: ["id", "correctAnswer"],
            order: [["id", "ASC"]]
        });
        return res.json({
            attempt,
            questions: questions.map((question) => ({
                id: question.id,
                selectedAnswer: attempt.answers[String(question.id)] || null,
                correctAnswer: question.correctAnswer,
                correct: attempt.answers[String(question.id)] === question.correctAnswer.toUpperCase()
            }))
        });
    }
    if (Date.now() >= new Date(attempt.deadlineAt).getTime()) {
        const completed = await sequelize.transaction(async (transaction) => {
            const locked = await QuizAttempt.findByPk(attempt.id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (locked.submittedAt) return locked;
            return (await finalizeAttempt(locked, transaction, locked.deadlineAt)).attempt;
        });
        return res.status(409).json({ message: "The assessment deadline has passed", attempt: completed });
    }
    res.json({ attempt, questions: await loadAttemptQuestions(assessment.id) });
};
