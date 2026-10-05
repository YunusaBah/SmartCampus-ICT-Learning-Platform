const User = require("./User");
const Course = require("./Course");
const Enrollment = require("./Enrollment");
const Lesson = require("./Lesson");
const Quiz = require("./Quiz");
const QuizResult = require("./QuizResult");
const Assignment = require("./Assignment");
const Submission = require("./Submission");
const Module = require("./Module");
const LessonProgress = require("./LessonProgress");
const QuizAssessment = require("./QuizAssessment");
const QuizAttempt = require("./QuizAttempt");
const Announcement = require("./Announcement");
const Message = require("./Message");
const Notification = require("./Notification");
const CalendarEvent = require("./CalendarEvent");
const Department = require("./Department");
const Certificate = require("./Certificate");

User.hasMany(Enrollment, { foreignKey: "studentId", as: "enrollments" });
Enrollment.belongsTo(User, { foreignKey: "studentId", as: "student" });

Course.hasMany(Enrollment, { foreignKey: "courseId", as: "enrollments" });
Enrollment.belongsTo(Course, { foreignKey: "courseId", as: "course" });

Course.belongsTo(User, { foreignKey: "lecturerId", as: "lecturer" });
User.hasMany(Course, { foreignKey: "lecturerId", as: "courses" });

Course.hasMany(Lesson, { foreignKey: "courseId", as: "lessons" });
Lesson.belongsTo(Course, { foreignKey: "courseId", as: "course" });
Course.hasMany(Module, { foreignKey: "courseId", as: "modules" });
Module.belongsTo(Course, { foreignKey: "courseId", as: "course" });
Module.hasMany(Lesson, { foreignKey: "moduleId", as: "lessons" });
Lesson.belongsTo(Module, { foreignKey: "moduleId", as: "module" });
User.hasMany(LessonProgress, { foreignKey: "studentId", as: "lessonProgress" });
LessonProgress.belongsTo(User, { foreignKey: "studentId", as: "student" });
Lesson.hasMany(LessonProgress, { foreignKey: "lessonId", as: "progress" });
LessonProgress.belongsTo(Lesson, { foreignKey: "lessonId", as: "lesson" });

Course.hasMany(Quiz, { foreignKey: "courseId", as: "quizzes" });
Quiz.belongsTo(Course, { foreignKey: "courseId", as: "course" });
Course.hasMany(QuizAssessment, { foreignKey: "courseId", as: "assessments" });
QuizAssessment.belongsTo(Course, { foreignKey: "courseId", as: "course" });
QuizAssessment.hasMany(Quiz, { foreignKey: "assessmentId", as: "questions" });
Quiz.belongsTo(QuizAssessment, { foreignKey: "assessmentId", as: "assessment" });
QuizAssessment.hasMany(QuizAttempt, { foreignKey: "assessmentId", as: "attempts" });
QuizAttempt.belongsTo(QuizAssessment, { foreignKey: "assessmentId", as: "assessment" });
User.hasMany(QuizAttempt, { foreignKey: "studentId", as: "quizAttempts" });
QuizAttempt.belongsTo(User, { foreignKey: "studentId", as: "student" });

Course.hasMany(Assignment, { foreignKey: "courseId", as: "assignments" });
Assignment.belongsTo(Course, { foreignKey: "courseId", as: "course" });

User.hasMany(Submission, { foreignKey: "studentId", as: "submissions" });
Submission.belongsTo(User, { foreignKey: "studentId", as: "student" });

Assignment.hasMany(Submission, { foreignKey: "assignmentId", as: "submissions" });
Submission.belongsTo(Assignment, { foreignKey: "assignmentId", as: "assignment" });

User.hasMany(QuizResult, { foreignKey: "studentId", as: "quizResults" });
QuizResult.belongsTo(User, { foreignKey: "studentId", as: "student" });

Quiz.hasMany(QuizResult, { foreignKey: "quizId", as: "results" });
QuizResult.belongsTo(Quiz, { foreignKey: "quizId", as: "quiz" });

Course.belongsTo(Department, { foreignKey: "departmentId", as: "department" });
Department.hasMany(Course, { foreignKey: "departmentId", as: "courses" });
Course.hasMany(Announcement, { foreignKey: "courseId", as: "announcements" });
Announcement.belongsTo(Course, { foreignKey: "courseId", as: "course" });
Announcement.belongsTo(User, { foreignKey: "createdById", as: "author" });
Course.hasMany(Message, { foreignKey: "courseId", as: "messages" });
Message.belongsTo(Course, { foreignKey: "courseId", as: "course" });
Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });
Message.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });
User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });
Course.hasMany(CalendarEvent, { foreignKey: "courseId", as: "calendarEvents" });
CalendarEvent.belongsTo(Course, { foreignKey: "courseId", as: "course" });
CalendarEvent.belongsTo(User, { foreignKey: "createdById", as: "creator" });
User.hasMany(Certificate, { foreignKey: "studentId", as: "certificates" });
Certificate.belongsTo(User, { foreignKey: "studentId", as: "student" });
Course.hasMany(Certificate, { foreignKey: "courseId", as: "certificates" });
Certificate.belongsTo(Course, { foreignKey: "courseId", as: "course" });

module.exports = {
    User,
    Course,
    Enrollment,
    Lesson,
    Quiz,
    QuizResult,
    Assignment,
    Submission,
    Module,
    LessonProgress,
    QuizAssessment,
    QuizAttempt,
    Announcement,
    Message,
    Notification,
    CalendarEvent,
    Department,
    Certificate
};
