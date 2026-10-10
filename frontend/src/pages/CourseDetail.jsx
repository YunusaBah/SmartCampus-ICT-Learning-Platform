import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import API from "../services/api";
import { downloadFile } from "../utils/downloadFile";
import { useAuth } from "../hooks/useAuth";
import AIAssistant from "../components/AIAssistant";
import MaterialPreviewDialog from "../components/MaterialPreviewDialog";
import QuizGradingTables from "../components/QuizGradingTables";
import QuestionImportDialog from "../components/QuestionImportDialog";
import AnnouncementCard from "../components/AnnouncementCard";
import {
    FaBookOpen,
    FaBullhorn,
    FaChartBar,
    FaCheckCircle,
    FaClipboardList,
    FaClock,
    FaCog,
    FaQuestionCircle,
    FaSearch,
    FaUsers
} from "react-icons/fa";

const CourseDetail = () => {
    const { courseId } = useParams();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { isStaff } = useAuth();
    const [data, setData] = useState(null);
    const tab = searchParams.get("section") || "materials";
    const [submissions, setSubmissions] = useState([]);
    const [mySubmissions, setMySubmissions] = useState([]);
    const [modules, setModules] = useState([]);
    const [progress, setProgress] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [gradebook, setGradebook] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [extendedError, setExtendedError] = useState("");
    const [moduleTitle, setModuleTitle] = useState("");
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [studentSearch, setStudentSearch] = useState("");
    const [studentSort, setStudentSort] = useState("name");
    const [announcementRoleInputs, setAnnouncementRoleInputs] = useState({});
    const [roleStudentId, setRoleStudentId] = useState("");
    const [roleNameDraft, setRoleNameDraft] = useState("");
    const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
    const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
    const [eventForm, setEventForm] = useState({ eventType: "class", title: "", description: "", startsAt: "", endsAt: "" });
    const [assessmentForm, setAssessmentForm] = useState({
        title: "", instructions: "", timeLimitMinutes: 20, maxAttempts: 1,
        questions: [{ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "", questionType: "MCQ", marks: 1 }]
    });
    const [questionImportOpen, setQuestionImportOpen] = useState(false);
    const [assessmentAttempts, setAssessmentAttempts] = useState([]);
    const [gradingAssessment, setGradingAssessment] = useState(null);
    const [gradingSaving, setGradingSaving] = useState("");
    const [activeAttempt, setActiveAttempt] = useState(null);
    const [attemptQuestions, setAttemptQuestions] = useState([]);
    const [attemptAnswers, setAttemptAnswers] = useState({});
    const [attemptResult, setAttemptResult] = useState(null);
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [error, setError] = useState("");
    const [alertMsg, setAlertMsg] = useState(null);
    const [routeSuccess] = useState(location.state?.successMessage || "");
    const [gradeInputs, setGradeInputs] = useState({});
    const [feedbackInputs, setFeedbackInputs] = useState({});
    const [previewLesson, setPreviewLesson] = useState(null);

    const [lessonForm, setLessonForm] = useState({ title: "", content: "", videoUrl: "", file: null });
    const [quizForm, setQuizForm] = useState({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" });
    const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", dueDate: "", file: null });
    const [quizAnswers, setQuizAnswers] = useState({});
    const [submittingQuizIds, setSubmittingQuizIds] = useState([]);
    const [submitFiles, setSubmitFiles] = useState({});
    const [assignmentReplies, setAssignmentReplies] = useState({});

    const showAlert = (text, type = "success") => {
        setAlertMsg({ text, type });
        setTimeout(() => setAlertMsg(null), 3500);
    };

    const handleDownload = async (resourceType, resourceId, fallbackName) => {
        try {
            await downloadFile(`/downloads/${resourceType}/${resourceId}`, fallbackName);
        } catch (downloadError) {
            showAlert(downloadError.message, "error");
        }
    };

    const handleView = (resourceId, fileName) => {
        setPreviewLesson({ id: resourceId, fileName, resourceType: "lesson" });
    };

    const loadCourse = useCallback(() => {
        API.get(`/courses/${courseId}`)
            .then(res => {
                setData(res.data);
                setError("");
            })
            .catch(err => {
                setError(err.response?.data?.message || "Cannot load course");
            });
    }, [courseId]);

    const loadSubmissions = useCallback(() => {
        API.get(`/assignments/course/${courseId}/submissions`)
            .then(res => setSubmissions(res.data))
            .catch(err => console.error(err));
    }, [courseId]);

    useEffect(() => {
        loadCourse();
    }, [loadCourse]);

    useEffect(() => {
        let active = true;
        const loadLmsData = async () => {
            setExtendedError("");
            try {
                const requests = [
                    API.get(`/courses/${courseId}/modules`),
                    API.get(`/courses/${courseId}/progress`),
                    API.get(`/courses/${courseId}/announcements`),
                    API.get(`/courses/${courseId}/calendar`),
                    API.get(`/quizzes/assessments/course/${courseId}`)
                ];
                if (isStaff) {
                    requests.push(API.get(`/courses/${courseId}/gradebook`));
                    requests.push(API.get(`/courses/${courseId}/analytics`));
                }
                const results = await Promise.all(requests);
                if (!active) return;
                setModules(results[0].data);
                setProgress(results[1].data);
                setAnnouncements(results[2].data);
                setCalendarEvents(results[3].data);
                setAssessments(results[4].data);
                if (isStaff) {
                    setGradebook(results[5].data);
                    setAnalytics(results[6].data);
                }
            } catch (requestError) {
                if (active) setExtendedError(requestError.response?.data?.message || "Some course tools could not be loaded.");
            }
        };
        loadLmsData();
        return () => { active = false; };
    }, [courseId, isStaff]);

    useEffect(() => {
        if (data?.isLecturer && tab === "grading") {
            loadSubmissions();
        }
    }, [data?.isLecturer, tab, loadSubmissions]);

    useEffect(() => {
        if (!data || isStaff) return;
        let active = true;
        API.get("/assignments/my/submissions")
            .then((response) => {
                if (active) setMySubmissions(response.data.filter((submission) => submission.assignment?.courseId === Number(courseId)));
            })
            .catch((requestError) => {
                if (active) setExtendedError(requestError.response?.data?.message || "Unable to load your submissions.");
            });
        return () => { active = false; };
    }, [courseId, data, isStaff]);

    useEffect(() => {
        if (!activeAttempt) return undefined;
        const updateRemaining = () => setSecondsRemaining(Math.max(
            0,
            Math.ceil((new Date(activeAttempt.deadlineAt).getTime() - Date.now()) / 1000)
        ));
        updateRemaining();
        const timer = window.setInterval(updateRemaining, 1000);
        return () => window.clearInterval(timer);
    }, [activeAttempt]);

    const handleCreateLesson = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("title", lessonForm.title);
        formData.append("content", lessonForm.content);
        formData.append("videoUrl", lessonForm.videoUrl);
        formData.append("courseId", courseId);
        if (lessonForm.moduleId) formData.append("moduleId", lessonForm.moduleId);
        if (lessonForm.file) formData.append("file", lessonForm.file);
        try {
            if (editingLessonId) {
                await API.patch(`/lessons/${editingLessonId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                await API.post("/lessons", formData, { headers: { "Content-Type": "multipart/form-data" } });
            }
            setLessonForm({ title: "", content: "", videoUrl: "", file: null });
            setEditingLessonId(null);
            showAlert(editingLessonId ? "Course material updated!" : "Lesson uploaded!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Failed to upload lesson", "error");
        }
    };

    const editLesson = (lesson) => {
        setEditingLessonId(lesson.id);
        setLessonForm({
            title: lesson.title,
            content: lesson.content || "",
            videoUrl: lesson.videoUrl || "",
            moduleId: lesson.moduleId || "",
            file: null
        });
    };

    const deleteLesson = async (lesson) => {
        if (!window.confirm(`Delete "${lesson.title}"? Student progress for this material will also be removed.`)) return;
        try {
            await API.delete(`/lessons/${lesson.id}`);
            showAlert("Course material deleted.");
            loadCourse();
        } catch (deleteError) {
            showAlert(deleteError.response?.data?.message || "Unable to delete course material.", "error");
        }
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            await API.post("/quizzes", { ...quizForm, courseId: Number(courseId) });
            setQuizForm({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" });
            showAlert("Quiz question created!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Failed to create quiz", "error");
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        const payload = new FormData();
        payload.append("title", assignmentForm.title);
        payload.append("description", assignmentForm.description);
        payload.append("dueDate", assignmentForm.dueDate);
        payload.append("courseId", courseId);
        if (assignmentForm.file) payload.append("file", assignmentForm.file);
        try {
            await API.post("/assignments", payload, { headers: { "Content-Type": "multipart/form-data" } });
            setAssignmentForm({ title: "", description: "", dueDate: "", file: null });
            showAlert("Assignment created!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Failed to create assignment", "error");
        }
    };

    const handleQuizSubmit = async (quizId) => {
        const selectedAnswer = quizAnswers[quizId];
        if (quizzes.find((quiz) => quiz.id === quizId)?.submitted) {
            showAlert("You have already submitted this quiz question. Submissions are final.", "error");
            return;
        }
        if (!selectedAnswer) { showAlert("Select an answer first", "error"); return; }
        setSubmittingQuizIds((current) => [...new Set([...current, quizId])]);
        try {
            const res = await API.post("/quizzes/submit", { quizId, selectedAnswer });
            setData((current) => ({
                ...current,
                quizzes: current.quizzes.map((quiz) => quiz.id === quizId
                    ? { ...quiz, submitted: true }
                    : quiz)
            }));
            setQuizAnswers((current) => {
                const next = { ...current };
                delete next[quizId];
                return next;
            });
            showAlert(res.data.passed ? "✓ Correct! Your submission is final." : "Submitted. Your submission is final.");
            loadCourse();
        } catch (err) {
            if (err.response?.status === 409) loadCourse();
            showAlert(err.response?.data?.message || "Quiz submit failed", "error");
        } finally {
            setSubmittingQuizIds((current) => current.filter((id) => id !== quizId));
        }
    };

    const handleAssignmentSubmit = async (assignment) => {
        const assignmentId = assignment.id;
        const file = submitFiles[assignmentId];
        const answerText = (assignmentReplies[assignmentId] || "").trim();
        if (Date.now() > new Date(assignment.dueDate).getTime()) {
            showAlert("You cannot submit after the due date. Ask your lecturer to reschedule or extend the deadline.", "error");
            return;
        }
        if (!file && !answerText) {
            showAlert("Write a reply or attach a file to submit.", "error");
            return;
        }
        const formData = new FormData();
        formData.append("assignmentId", assignmentId);
        if (answerText) formData.append("answerText", answerText);
        if (file) formData.append("file", file);
        try {
            await API.post("/assignments/submit", formData, { headers: { "Content-Type": "multipart/form-data" } });
            setSubmitFiles((current) => {
                const next = { ...current };
                delete next[assignmentId];
                return next;
            });
            setAssignmentReplies((current) => {
                const next = { ...current };
                delete next[assignmentId];
                return next;
            });
            showAlert("Assignment submitted!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Submit failed", "error");
            return;
        }
        try {
            const response = await API.get("/assignments/my/submissions");
            setMySubmissions(response.data.filter((submission) => submission.assignment?.courseId === Number(courseId)));
        } catch (requestError) {
            setExtendedError(requestError.response?.data?.message || "Submission saved, but the submission list could not be refreshed.");
        }
    };

    const handleGrade = async (submissionId) => {
        const grade = (gradeInputs[submissionId] || "").trim();
        if (!grade) { showAlert("Enter a grade first", "error"); return; }
        try {
            await API.patch(`/assignments/submissions/${submissionId}/grade`, {
                grade,
                feedback: feedbackInputs[submissionId] || ""
            });
            showAlert("Grade saved!");
            setGradeInputs(prev => ({ ...prev, [submissionId]: "" }));
            setFeedbackInputs(prev => ({ ...prev, [submissionId]: "" }));
            loadSubmissions();
        } catch (err) {
            showAlert(err.response?.data?.message || "Grading failed", "error");
        }
    };

    const refreshLmsData = async () => {
        const requests = [
            API.get(`/courses/${courseId}/modules`),
            API.get(`/courses/${courseId}/progress`),
            API.get(`/courses/${courseId}/announcements`),
            API.get(`/courses/${courseId}/calendar`),
            API.get(`/quizzes/assessments/course/${courseId}`)
        ];
        if (isStaff) {
            requests.push(API.get(`/courses/${courseId}/gradebook`));
            requests.push(API.get(`/courses/${courseId}/analytics`));
        }
        const results = await Promise.all(requests);
        setModules(results[0].data);
        setProgress(results[1].data);
        setAnnouncements(results[2].data);
        setCalendarEvents(results[3].data);
        setAssessments(results[4].data);
        if (isStaff) {
            setGradebook(results[5].data);
            setAnalytics(results[6].data);
        }
    };

    const createModule = async (event) => {
        event.preventDefault();
        try {
            await API.post(`/courses/${courseId}/modules`, { title: moduleTitle, orderIndex: modules.length });
            setModuleTitle("");
            await refreshLmsData();
            showAlert("Course module created.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to create module.", "error");
        }
    };

    const completeLesson = async (lessonId) => {
        try {
            await API.post(`/lessons/${lessonId}/progress`);
            await refreshLmsData();
            showAlert("Lesson marked complete.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to save lesson progress.", "error");
        }
    };

    const createAnnouncement = async (event) => {
        event.preventDefault();
        try {
            if (editingAnnouncementId) {
                const response = await API.patch(`/announcements/${editingAnnouncementId}`, announcementForm);
                setAnnouncements((current) => current.map((item) =>
                    item.id === editingAnnouncementId ? { ...item, ...response.data } : item
                ));
                showAlert("Announcement updated.");
            } else {
                const response = await API.post(`/courses/${courseId}/announcements`, announcementForm);
                setAnnouncements((current) => [{
                    ...response.data,
                    author: { fullName: "You" }
                }, ...current]);
                showAlert("Announcement published.");
            }
            setAnnouncementForm({ title: "", body: "" });
            setEditingAnnouncementId(null);
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to save announcement.", "error");
        }
    };

    const removeEnrolledStudent = async (student) => {
        if (!window.confirm(`Remove ${student.fullName} from ${data.course.title}? Their SmartCampus account will not be affected.`)) return;
        try {
            await API.delete(`/courses/${courseId}/students/${student.id}`);
            setData((current) => ({
                ...current,
                students: current.students.filter((item) => item.id !== student.id)
            }));
            showAlert("Student removed from this course.");
            window.dispatchEvent(new Event("smartcampus:dashboard-refresh"));
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to remove student.", "error");
        }
    };

    const saveAnnouncementRole = async (student, canPostAnnouncements, requestedRoleName) => {
        const roleName = (requestedRoleName ?? announcementRoleInputs[student.id] ?? student.announcementRoleName ?? "").trim();
        if (canPostAnnouncements && !roleName) {
            showAlert("Enter a role name such as Class Rep.", "error");
            return;
        }
        try {
            const response = await API.patch(`/courses/${courseId}/students/${student.id}/announcement-permission`, {
                canPostAnnouncements,
                roleName: canPostAnnouncements ? roleName : null
            });
            setData((current) => ({
                ...current,
                students: current.students.map((item) => item.id === student.id
                    ? {
                        ...item,
                        canPostAnnouncements: response.data.canPostAnnouncements,
                        announcementRoleName: response.data.announcementRoleName
                    }
                    : item)
            }));
            showAlert(canPostAnnouncements
                ? `${student.fullName} can post announcements as ${roleName}.`
                : `${student.fullName}'s announcement permission was removed.`);
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to update announcement permission.", "error");
        }
    };

    const removeAnnouncement = async (announcement) => {
        if (!window.confirm(`Delete announcement "${announcement.title}"?`)) return;
        try {
            await API.delete(`/announcements/${announcement.id}`);
            setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
            showAlert("Announcement deleted.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to delete announcement.", "error");
        }
    };

    const createCalendarEvent = async (event) => {
        event.preventDefault();
        try {
            const response = await API.post(`/courses/${courseId}/calendar`, {
                ...eventForm,
                startsAt: new Date(eventForm.startsAt).toISOString(),
                endsAt: new Date(eventForm.endsAt).toISOString()
            });
            setCalendarEvents((current) => [...current, response.data].sort((a, b) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
            ));
            setEventForm({ eventType: "class", title: "", description: "", startsAt: "", endsAt: "" });
            showAlert("Course event created.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to create course event.", "error");
        }
    };

    const createAssessment = async (event) => {
        event.preventDefault();
        try {
            await API.post("/quizzes/assessments", {
                ...assessmentForm,
                courseId: Number(courseId),
                timeLimitMinutes: Number(assessmentForm.timeLimitMinutes),
                maxAttempts: Number(assessmentForm.maxAttempts)
            });
            setAssessmentForm({
                title: "", instructions: "", timeLimitMinutes: 20, maxAttempts: 1,
                questions: [{ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", questionType: "MCQ", marks: 1 }]
            });
            await refreshLmsData();
            showAlert("Timed assessment created.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to create assessment.", "error");
        }
    };

    const startAssessment = async (assessmentId) => {
        setAttemptResult(null);
        try {
            const response = await API.post(`/quizzes/assessments/${assessmentId}/attempts`);
            setActiveAttempt({ ...response.data.attempt, assessmentId });
            setAttemptQuestions(response.data.questions);
            setAttemptAnswers({ ...(response.data.attempt.answers || {}), ...(response.data.answers || {}) });
        } catch (requestError) {
            if (requestError.response?.status === 409) {
                try {
                    const previous = await API.get(`/quizzes/assessments/${assessmentId}/attempt`);
                    setAttemptResult({ attempt: previous.data.attempt, results: previous.data.questions });
                } catch (attemptError) {
                    showAlert(attemptError.response?.data?.message || requestError.response.data.message, "error");
                }
                return;
            }
            showAlert(requestError.response?.data?.message || "Unable to start assessment.", "error");
        }
    };

    const saveAttemptAnswer = async (questionId, answer) => {
        const key = String(questionId);
        setAttemptAnswers((current) => ({ ...current, [key]: answer }));
        try {
            await API.put(`/quizzes/attempts/${activeAttempt.id}/answers`, { answers: { [key]: answer } });
        } catch (requestError) {
            if (requestError.response?.status !== 409) {
                showAlert(requestError.response?.data?.message || "Unable to save your answer.", "error");
            }
        }
    };

    const submitAssessment = async () => {
        if (!activeAttempt || !window.confirm("Submit this assessment now? You cannot change answers after submission.")) return;
        try {
            const response = await API.post(`/quizzes/attempts/${activeAttempt.id}/submit`, { answers: attemptAnswers });
            setAttemptResult(response.data);
            setActiveAttempt(null);
            await refreshLmsData();
        } catch (requestError) {
            if (requestError.response?.status === 409 && requestError.response.data.attempt) {
                setAttemptResult({ attempt: requestError.response.data.attempt, results: [] });
                setActiveAttempt(null);
                return;
            }
            showAlert(requestError.response?.data?.message || "Unable to submit assessment.", "error");
        }
    };

    const importAssessmentQuestions = (importedQuestions) => {
        const filledCount = assessmentForm.questions.filter((question) => question.question.trim()).length;
        if (filledCount + importedQuestions.length > 100) {
            return "An assessment can contain at most 100 questions. Remove some questions before importing.";
        }
        setAssessmentForm((current) => ({
            ...current,
            questions: [...current.questions.filter((question) => question.question.trim()), ...importedQuestions]
        }));
        return true;
    };

    const loadAssessmentAttempts = async (assessment) => {
        try {
            const response = await API.get(`/quizzes/assessments/${assessment.id}/attempts`);
            setAssessmentAttempts(response.data);
            setGradingAssessment(assessment);
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to load assessment attempts.", "error");
        }
    };

    const saveTheoryGrade = async (attempt, question) => {
        const key = `${attempt.id}:${question.id}`;
        const response = attempt.responses.find((item) => item.question.id === question.id)?.response;
        if (gradeInputs[key] === undefined || gradeInputs[key] === "") {
            showAlert("Enter a mark for this theory question.", "error");
            return;
        }
        setGradingSaving(key);
        try {
            const result = await API.put(`/quizzes/attempts/${attempt.id}/questions/${question.id}/grade`, {
                marksAwarded: Number(gradeInputs[key]),
                feedback: feedbackInputs[key] ?? response?.feedback ?? ""
            });
            setAssessmentAttempts((current) => current.map((item) => item.id === attempt.id ? {
                ...item,
                ...result.data.attempt,
                responses: item.responses.map((entry) => entry.question.id === question.id
                    ? { ...entry, response: result.data.response }
                    : entry)
            } : item));
            showAlert("Theory response graded.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to save theory grade.", "error");
        } finally {
            setGradingSaving("");
        }
    };

    const filteredCourseStudents = useMemo(() => (data?.students || [])
        .filter((student) =>
            `${student.fullName} ${student.email} ${student.matNumber || ""}`
                .toLowerCase()
                .includes(studentSearch.trim().toLowerCase())
        )
        .sort((left, right) => {
            const leftValue = studentSort === "matNumber" ? left.matNumber || "" : left.fullName || "";
            const rightValue = studentSort === "matNumber" ? right.matNumber || "" : right.fullName || "";
            return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
        }), [data?.students, studentSearch, studentSort]);

    if (error) return (
        <div className="page-content">
            <p style={{ color: "#ff6b6b", marginBottom: 12 }}>{error}</p>
            <Link to="/courses">← Back to courses</Link>
        </div>
    );

    if (!data) return <div className="page-content"><p>Loading classroom...</p></div>;

    const { course, lessons, quizzes, assignments, students, classmates, isLecturer } = data;
    const showLecturer = isLecturer || isStaff;
    const lessonContent = lessons.map(l => l.content).join(" ");

    if (tab === "settings" && showLecturer) {
        return <Navigate to="/settings" replace state={{ courseId: Number(courseId) }} />;
    }

    return (
        <div className="page-content">
            <Link to="/courses" style={{ color: "var(--theme-accent)", display: "inline-block", marginBottom: 12 }}>
                ← Back to courses
            </Link>
            <h1>{course.title}</h1>
            {course.description && <p style={{ color: "var(--theme-muted)", marginBottom: 20 }}>{course.description}</p>}
            {course.hasContentFile && (
                <p style={{ marginBottom: 20 }}>
                    <button
                        type="button"
                        className="course-content-file"
                        style={{ border: 0, padding: 0, background: "none", cursor: "pointer", font: "inherit", textAlign: "left" }}
                        onClick={() => handleDownload("course-content", course.id, `course-content-${course.id}`)}
                    >
                        View {course.contentFileName || "course contents"}
                    </button>
                </p>
            )}
            <div className="course-detail-meta">
                {course.academicCode && <span>{course.academicCode}</span>}
                {course.classCode && <span>{course.classCode}</span>}
                {course.department?.name && <span>{course.department.name}</span>}
                {course.category && <span>{course.category}</span>}
            </div>

            {routeSuccess && !alertMsg && <p className="feature-status success" role="status">{routeSuccess}</p>}
            {alertMsg && (
                <p style={{
                    color: alertMsg.type === "error" ? "#ff6b6b" : "#00d464",
                    marginBottom: 16, padding: "10px 14px",
                    background: alertMsg.type === "error" ? "rgba(255,107,107,0.1)" : "rgba(0,212,100,0.1)",
                    borderRadius: 8
                }}>
                    {alertMsg.text}
                </p>
            )}
            {extendedError && <p className="feature-status error" role="alert">{extendedError}</p>}

            {tab === "overview" && (
                <section className="course-overview">
                    <div className="course-stat-grid">
                        <article><span>Enrolled students</span><strong>{analytics?.enrolledStudents ?? "—"}</strong></article>
                        <article><span>Learning materials</span><strong>{lessons.length}</strong></article>
                        <article><span>Assignments</span><strong>{analytics?.assignmentCount ?? assignments.length}</strong></article>
                        {showLecturer && <article><span>Pending submissions</span><strong>{analytics ? analytics.submissionCount - analytics.gradedSubmissionCount : "—"}</strong></article>}
                    </div>
                    <div className="course-workspace-links">
                        <Link to="?section=materials"><FaBookOpen /> Materials</Link>
                        <Link to="?section=assignments"><FaClipboardList /> Assignments</Link>
                        <Link to="?section=quizzes"><FaQuestionCircle /> Quizzes</Link>
                        {showLecturer && <Link to="?section=students"><FaUsers /> Students</Link>}
                        <Link to="?section=announcements"><FaBullhorn /> Announcements</Link>
                        {showLecturer && <Link to="?section=grading"><FaChartBar /> Grades</Link>}
                        {showLecturer && <Link to="/settings" state={{ courseId: Number(courseId) }}><FaCog /> Course Settings</Link>}
                    </div>
                    <div className="course-overview-panels">
                        <section className="course-overview-lecturer">
                            <div>
                                <h2>Upcoming assignments</h2>
                                {assignments.filter((assignment) => new Date(assignment.dueDate) >= new Date())
                                    .slice(0, 3).map((assignment) => (
                                        <p key={assignment.id}>
                                            <Link to="?section=assignments">{assignment.title}</Link>
                                            {" · "}{new Date(assignment.dueDate).toLocaleDateString()}
                                        </p>
                                    ))}
                                {!assignments.some((assignment) => new Date(assignment.dueDate) >= new Date()) &&
                                    <p>No upcoming assignment deadlines.</p>}
                            </div>
                        </section>
                        <section className="course-overview-lecturer">
                            <div>
                                <h2>Recent announcements</h2>
                                {announcements.slice(0, 3).map((announcement) => (
                                    <p key={announcement.id}>
                                        <Link to="?section=announcements">{announcement.title}</Link>
                                        {" · "}{new Date(announcement.createdAt).toLocaleDateString()}
                                    </p>
                                ))}
                                {!announcements.length && <p>No course announcements yet.</p>}
                            </div>
                        </section>
                    </div>
                    {!showLecturer && (
                        <section className="course-overview-lecturer">
                            <h2>Course lecturer</h2>
                            <p>{course.lecturer?.fullName || "Your lecturer"}</p>
                        </section>
                    )}
                    {!showLecturer && classmates?.length > 0 && (
                        <section className="course-overview-lecturer course-classmates">
                            <div>
                                <h2>Classmates</h2>
                                <ul>{classmates.slice(0, 12).map((classmate) => (
                                    <li key={classmate.id}>{classmate.fullName}</li>
                                ))}</ul>
                                {classmates.length > 12 && <p>{classmates.length - 12} more classmates</p>}
                            </div>
                        </section>
                    )}
                </section>
            )}

            {/* MATERIALS */}
            {tab === "materials" && (
                <section>
                    {showLecturer && (
                        <>
                            <details className="feature-create-panel" open={Boolean(editingLessonId)}>
                                <summary>Create a course module</summary>
                                <form className="feature-form-grid" onSubmit={createModule}>
                                    <label>Module title<input required value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} /></label>
                                    <button className="btn btn-inline" type="submit">Add module</button>
                                </form>
                            </details>
                            <details className="feature-create-panel">
                                <summary>{editingLessonId ? "Edit course material" : "Upload course material"}</summary>
                                <form className="feature-form-grid" onSubmit={handleCreateLesson}>
                                    <label>Lesson title<input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required /></label>
                                    <label>Module
                                        <select value={lessonForm.moduleId || ""} onChange={(event) => setLessonForm({ ...lessonForm, moduleId: event.target.value })}>
                                            <option value="">Uncategorized lesson</option>
                                            {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
                                        </select>
                                    </label>
                                    <label className="feature-form-wide">Written content (optional if a file is attached)<textarea value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} /></label>
                                    <label>Video URL (optional)<input value={lessonForm.videoUrl} onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} /></label>
                                    <label>Resource file<input type="file" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) setLessonForm(prev => ({ ...prev, file }));
                                    }} /></label>
                                    <button type="submit" className="btn btn-inline">{editingLessonId ? "Save material" : "Upload material"}</button>
                                    {editingLessonId && <button type="button" className="btn btn-secondary" onClick={() => {
                                        setEditingLessonId(null);
                                        setLessonForm({ title: "", content: "", videoUrl: "", file: null });
                                    }}>Cancel edit</button>}
                                </form>
                            </details>
                        </>
                    )}
                    {!showLecturer && progress && (
                        <div className="course-progress-summary">
                            <div><strong>Course progress</strong><span>{progress.completedLessons} of {progress.totalLessons} lessons · {progress.completionPercent}%</span></div>
                            <div className="course-progress-track"><span style={{ width: `${progress.completionPercent}%` }} /></div>
                        </div>
                    )}
                    {!lessons.length ? <div className="feature-empty"><FaBookOpen /><strong>No course materials yet</strong><span>Lessons uploaded by the lecturer will be organized here.</span></div> : (
                        <div className="course-curriculum">
                            {modules.map((module) => {
                                const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id);
                                return (
                                    <section className="curriculum-module" key={module.id}>
                                        <header><span>MODULE {module.orderIndex + 1}</span><h2>{module.title}</h2></header>
                                        {moduleLessons.map((lesson) => {
                                            const completed = progress?.lessons?.some((item) => item.id === lesson.id && item.completed);
                                            return (
                                                <article className="curriculum-lesson" key={lesson.id}>
                                                    <span className={completed ? "lesson-status complete" : "lesson-status"}><FaCheckCircle /></span>
                                                    <div><strong>{lesson.title}</strong>
                                                        {lesson.createdAt && <time className="course-material-date">Added {new Date(lesson.createdAt).toLocaleDateString()}</time>}
                                                        <p>{lesson.content}</p>
                                                        {lesson.videoUrl && <div className="lesson-resources"><a href={lesson.videoUrl} target="_blank" rel="noreferrer">Watch lesson video</a></div>}
                                                    </div>
                                                    {lesson.hasFile && <div className="lesson-file-actions">
                                                        <button type="button" onClick={() => handleDownload("lesson", lesson.id, lesson.fileName || `lesson-${lesson.id}`)}>Download</button>
                                                        <button type="button" onClick={() => handleView(lesson.id, lesson.fileName || lesson.title)}>View</button>
                                                    </div>}
                                                    {showLecturer && <div className="course-material-actions">
                                                        <button type="button" onClick={() => editLesson(lesson)}>Edit</button>
                                                        <button type="button" onClick={() => deleteLesson(lesson)}>Remove</button>
                                                    </div>}
                                                    {!showLecturer && (
                                                        <button type="button" className="lesson-complete-button" disabled={completed} onClick={() => completeLesson(lesson.id)}>
                                                            {completed ? "Completed" : "Mark complete"}
                                                        </button>
                                                    )}
                                                </article>
                                            );
                                        })}
                                        {!moduleLessons.length && <p className="module-empty">No lessons in this module yet.</p>}
                                    </section>
                                );
                            })}
                            {lessons.filter((lesson) => !lesson.moduleId).length > 0 && (
                                <section className="curriculum-module">
                                    <header><span>COURSE MATERIALS</span><h2>Other lessons</h2></header>
                                    {lessons.filter((lesson) => !lesson.moduleId).map((lesson) => (
                                        <article className="curriculum-lesson" key={lesson.id}>
                                            <span className={progress?.lessons?.some((item) => item.id === lesson.id && item.completed) ? "lesson-status complete" : "lesson-status"}><FaBookOpen /></span>
                                            <div><strong>{lesson.title}</strong>
                                                {lesson.createdAt && <time className="course-material-date">Added {new Date(lesson.createdAt).toLocaleDateString()}</time>}
                                                <p>{lesson.content}</p>
                                            </div>
                                            {lesson.hasFile && <div className="lesson-file-actions">
                                                <button type="button" onClick={() => handleDownload("lesson", lesson.id, lesson.fileName || `lesson-${lesson.id}`)}>Download</button>
                                                <button type="button" onClick={() => handleView(lesson.id, lesson.fileName || lesson.title)}>View</button>
                                            </div>}
                                            {showLecturer && <div className="course-material-actions">
                                                <button type="button" onClick={() => editLesson(lesson)}>Edit</button>
                                                <button type="button" onClick={() => deleteLesson(lesson)}>Remove</button>
                                            </div>}
                                            {!showLecturer && <button type="button" className="lesson-complete-button" disabled={progress?.lessons?.some((item) => item.id === lesson.id && item.completed)} onClick={() => completeLesson(lesson.id)}>
                                                {progress?.lessons?.some((item) => item.id === lesson.id && item.completed) ? "Completed" : "Mark complete"}
                                            </button>}
                                        </article>
                                    ))}
                                </section>
                            )}
                        </div>
                    )}
                    {showLecturer && analytics && (
                        <div className="course-analytics-strip">
                            <span>{analytics.enrolledStudents} students</span>
                            <span>{analytics.lessonCount} lessons</span>
                            <span>{analytics.assignmentCount} assignments</span>
                            <span>{analytics.gradedSubmissionCount}/{analytics.submissionCount} submissions graded</span>
                        </div>
                    )}
                </section>
            )}

            {/* QUIZZES */}
            {tab === "quizzes" && (
                <section>
                    {showLecturer && (
                        <>
                            <details className="feature-create-panel">
                                <summary>Create a timed assessment</summary>
                                <form className="feature-form-grid" onSubmit={createAssessment}>
                                    <label>Assessment title<input required value={assessmentForm.title} onChange={(event) => setAssessmentForm({ ...assessmentForm, title: event.target.value })} /></label>
                                    <label>Time limit (minutes)<input type="number" min="1" max="600" required value={assessmentForm.timeLimitMinutes} onChange={(event) => setAssessmentForm({ ...assessmentForm, timeLimitMinutes: event.target.value })} /></label>
                                    <label>Maximum attempts<input type="number" min="1" max="10" required value={assessmentForm.maxAttempts} onChange={(event) => setAssessmentForm({ ...assessmentForm, maxAttempts: event.target.value })} /></label>
                                    <label className="feature-form-wide">Instructions<textarea rows={2} value={assessmentForm.instructions} onChange={(event) => setAssessmentForm({ ...assessmentForm, instructions: event.target.value })} /></label>
                                    {assessmentForm.questions.map((question, index) => (
                                        <fieldset className="assessment-question-form feature-form-wide" key={index}>
                                            <legend>Question {index + 1}</legend>
                                            <label>Prompt<textarea rows={3} required value={question.question} onChange={(event) => setAssessmentForm((current) => ({
                                                ...current,
                                                questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item)
                                            }))} /></label>
                                            <div className="quiz-question-controls">
                                                <label>Type<select value={question.questionType} onChange={(event) => setAssessmentForm((current) => ({
                                                    ...current,
                                                    questions: current.questions.map((item, itemIndex) => itemIndex === index ? {
                                                        ...item,
                                                        questionType: event.target.value,
                                                        correctAnswer: event.target.value === "THEORY" ? null : ""
                                                    } : item)
                                                }))}>
                                                    <option value="MCQ">Multiple choice</option>
                                                    <option value="THEORY">Theory</option>
                                                </select></label>
                                                <label>Marks<input type="number" min="0.01" step="0.01" required value={question.marks} onChange={(event) => setAssessmentForm((current) => ({
                                                    ...current,
                                                    questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, marks: event.target.value } : item)
                                                }))} /></label>
                                            </div>
                                            {question.questionType === "MCQ" && <>
                                                {["A", "B", "C", "D"].map((option) => (
                                                    <label key={option}>Option {option}<input value={question[`option${option}`]} onChange={(event) => setAssessmentForm((current) => ({
                                                        ...current,
                                                        questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, [`option${option}`]: event.target.value } : item)
                                                    }))} /></label>
                                                ))}
                                                <label>Correct answer<select required value={question.correctAnswer || ""} onChange={(event) => setAssessmentForm((current) => ({
                                                    ...current,
                                                    questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, correctAnswer: event.target.value } : item)
                                                }))}>
                                                    <option value="">Select answer</option>
                                                    {["A", "B", "C", "D"].filter((option) => question[`option${option}`].trim()).map((option) => <option key={option} value={option}>{option}</option>)}
                                                </select></label>
                                            </>}
                                            {assessmentForm.questions.length > 1 && (
                                                <button type="button" className="text-button" onClick={() => setAssessmentForm((current) => ({
                                                    ...current,
                                                    questions: current.questions.filter((_, itemIndex) => itemIndex !== index)
                                                }))}>Remove question</button>
                                            )}
                                        </fieldset>
                                    ))}
                                    <div className="assessment-form-actions">
                                        <button type="button" className="btn btn-secondary btn-inline" disabled={assessmentForm.questions.length >= 100} onClick={() => setAssessmentForm((current) => ({
                                            ...current,
                                            questions: [...current.questions, { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "", questionType: "MCQ", marks: 1 }]
                                        }))}>Add question</button>
                                        <button type="button" className="btn btn-secondary btn-inline" disabled={assessmentForm.questions.length >= 100} onClick={() => setQuestionImportOpen(true)}>Import Questions</button>
                                        <button type="submit" className="btn btn-inline">Publish assessment</button>
                                    </div>
                                </form>
                            </details>
                            <details className="feature-create-panel">
                                <summary>Add a quick quiz question</summary>
                                <form className="feature-form-grid" onSubmit={handleCreateQuiz}>
                                    <label className="feature-form-wide">Question<input value={quizForm.question} onChange={e => setQuizForm({ ...quizForm, question: e.target.value })} required /></label>
                                    {["A", "B", "C", "D"].map(opt => (
                                        <label key={opt}>Option {opt}<input value={quizForm[`option${opt}`]} onChange={e => setQuizForm({ ...quizForm, [`option${opt}`]: e.target.value })} required /></label>
                                    ))}
                                    <label>Correct answer<select value={quizForm.correctAnswer} onChange={e => setQuizForm({ ...quizForm, correctAnswer: e.target.value })}>
                                        {["A", "B", "C", "D"].map((option) => <option key={option} value={option}>{option}</option>)}
                                    </select></label>
                                    <button type="submit" className="btn btn-inline">Add question</button>
                                </form>
                            </details>
                        </>
                    )}
                    {assessments.length > 0 && (
                        <div className="feature-assessment-list">
                            <div className="section-heading"><div><p className="eyebrow">TIMED QUIZZES</p><h2>Assessments</h2></div></div>
                            {assessments.map((assessment) => (
                                <article className="feature-assessment-card" key={assessment.id}>
                                    <div><h3>{assessment.title}</h3><p>{assessment.instructions || "Answer each question before the timer expires."}</p><span><FaClock /> {assessment.timeLimitMinutes} min · {assessment.questions?.length || 0} questions · {assessment.maxAttempts} attempt(s)</span></div>
                                    {!showLecturer && <button type="button" className="btn btn-inline" onClick={() => startAssessment(assessment.id)}>Start / resume</button>}
                                    {showLecturer && <button type="button" className="btn btn-secondary btn-inline" onClick={() => loadAssessmentAttempts(assessment)}>View attempts / grade</button>}
                                </article>
                            ))}
                        </div>
                    )}
                    {activeAttempt && (
                        <section className="active-assessment">
                            <header><div><p className="eyebrow">ASSESSMENT IN PROGRESS</p><h2>{assessments.find((assessment) => assessment.id === activeAttempt.assessmentId)?.title || "Timed assessment"}</h2></div><span className={secondsRemaining < 60 ? "assessment-timer urgent" : "assessment-timer"}><FaClock /> {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}</span></header>
                            {attemptQuestions.map((question, index) => (
                                <article className="assessment-question" key={question.id}>
                                    <h3>{index + 1}. {question.question} <small>({question.marks} marks)</small></h3>
                                    {question.questionType === "THEORY" ? (
                                        <textarea
                                            className="assessment-theory-answer"
                                            aria-label={`Written answer for question ${index + 1}`}
                                            placeholder="Write your answer here..."
                                            maxLength={20000}
                                            rows={7}
                                            value={attemptAnswers[String(question.id)] || ""}
                                            onChange={(event) => setAttemptAnswers((current) => ({
                                                ...current,
                                                [String(question.id)]: event.target.value
                                            }))}
                                            onBlur={() => saveAttemptAnswer(question.id, attemptAnswers[String(question.id)] || "")}
                                        />
                                    ) : (
                                        <div className="assessment-answer-list">
                                            {["A", "B", "C", "D"].filter((option) => question[`option${option}`]).map((option) => (
                                                <label key={option} className="assessment-answer">
                                                    <input type="radio" name={`attempt-${question.id}`} checked={attemptAnswers[String(question.id)] === option} onChange={() => saveAttemptAnswer(question.id, option)} />
                                                    <span><strong>{option}.</strong> {question[`option${option}`]}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))}
                            <button type="button" className="btn btn-inline" onClick={submitAssessment}>Submit assessment</button>
                        </section>
                    )}
                    {attemptResult && (
                        <div className="attempt-result" role="status">
                            <strong>Assessment submitted</strong>
                            <span>Score: {attemptResult.attempt?.score ?? 0} / {attemptResult.attempt?.totalMarks ?? attemptResult.attempt?.totalQuestions ?? attemptResult.results?.length ?? 0} marks</span>
                            {attemptResult.attempt?.theoryPending && <span>Theory answers are awaiting lecturer marking; this score is provisional.</span>}
                        </div>
                    )}
                    {gradingAssessment && (
                        <div className="course-modal-backdrop" onMouseDown={(event) => {
                            if (event.target === event.currentTarget && !gradingSaving) setGradingAssessment(null);
                        }}>
                            <section className="course-modal theory-grading-modal" role="dialog" aria-modal="true" aria-labelledby="theory-grading-heading">
                                <button type="button" className="course-modal-close" aria-label="Close attempts" disabled={Boolean(gradingSaving)} onClick={() => setGradingAssessment(null)}>Close</button>
                                <h2 id="theory-grading-heading">{gradingAssessment.title} attempts</h2>
                                {!assessmentAttempts.length && <p>No student attempts recorded yet.</p>}
                                {assessmentAttempts.map((attempt) => (
                                    <article className="theory-attempt-card" key={attempt.id}>
                                        <h3>{attempt.student?.fullName || "Student"} · {attempt.submittedAt ? "Submitted" : "In progress"}</h3>
                                        {attempt.submittedAt && <p>
                                            Score: {attempt.score ?? 0} / {attempt.totalMarks ?? 0} marks
                                            {attempt.theoryPending && " · Theory marking pending"}
                                        </p>}
                                        {!attempt.submittedAt && <p>Unsubmitted attempt answers are not available for grading.</p>}
                                        {attempt.submittedAt && attempt.responses.map(({ question, response }) => (
                                            <section className="theory-response" key={`${attempt.id}-${question.id}`}>
                                            <h4>{question.question} ({question.marks} marks)</h4>
                                            <p className="theory-student-answer">{response?.answer || "No answer submitted."}</p>
                                            <div className="theory-grade-fields">
                                                <label>Marks awarded
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={question.marks}
                                                        step="0.01"
                                                        value={gradeInputs[`${attempt.id}:${question.id}`] ?? response?.marksAwarded ?? ""}
                                                        onChange={(event) => setGradeInputs((current) => ({ ...current, [`${attempt.id}:${question.id}`]: event.target.value }))}
                                                    />
                                                </label>
                                                <label>Feedback
                                                    <textarea
                                                        rows={2}
                                                        value={feedbackInputs[`${attempt.id}:${question.id}`] ?? response?.feedback ?? ""}
                                                        onChange={(event) => setFeedbackInputs((current) => ({ ...current, [`${attempt.id}:${question.id}`]: event.target.value }))}
                                                    />
                                                </label>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-inline"
                                                disabled={Boolean(gradingSaving)}
                                                onClick={() => saveTheoryGrade(attempt, question)}
                                            >
                                                {gradingSaving === `${attempt.id}:${question.id}` ? "Saving..." : "Save grade"}
                                            </button>
                                            </section>
                                        ))}
                                    </article>
                                ))}
                            </section>
                        </div>
                    )}
                    <div className="quick-quiz-list">
                        {quizzes.length === 0 && <p style={{ color: "var(--theme-muted)" }}>No quiz questions yet.</p>}
                        {quizzes.map(quiz => (
                            <article className="quick-quiz-row" key={quiz.id}>
                                <h3>{quiz.question}</h3>
                                {!showLecturer ? (
                                    <>
                                        {quiz.submitted ? (
                                            <p className="quick-quiz-submitted" role="status">Submitted · final</p>
                                        ) : (
                                            <>
                                                <div className="quick-quiz-options">
                                                    {["A", "B", "C", "D"].map((opt) => quiz[`option${opt}`] && (
                                                        <label key={opt} className={`quick-quiz-option${quizAnswers[quiz.id] === opt ? " selected" : ""}`}>
                                                            <input type="radio" name={`quiz-${quiz.id}`} value={opt}
                                                                checked={quizAnswers[quiz.id] === opt}
                                                                onChange={() => setQuizAnswers((current) => ({ ...current, [quiz.id]: opt }))} />
                                                            <strong>{opt}:</strong>
                                                            <span>{quiz[`option${opt}`]}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <button type="button" className="btn btn-inline quick-quiz-submit"
                                                    disabled={!quizAnswers[quiz.id] || submittingQuizIds.includes(quiz.id)}
                                                    onClick={() => handleQuizSubmit(quiz.id)}>
                                                    {submittingQuizIds.includes(quiz.id) ? "Submitting..." : "Submit answer"}
                                                </button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <ul className="quick-quiz-lecturer-options">
                                        {["A", "B", "C", "D"].map(opt => (
                                            <li key={opt} style={{
                                                padding: "6px 0",
                                                color: quiz.correctAnswer === opt ? "var(--theme-accent)" : "var(--theme-muted)",
                                                fontWeight: quiz.correctAnswer === opt ? 700 : 400
                                            }}>
                                                {quiz.correctAnswer === opt ? "✓ " : ""}{opt}: {quiz[`option${opt}`]}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* ASSIGNMENTS */}
            {tab === "assignments" && (
                <section>
                    {showLecturer && (
                        <form className="panel-form" onSubmit={handleCreateAssignment}>
                            <h3>Create Assignment</h3>
                            <input placeholder="Title" value={assignmentForm.title}
                                   onChange={e => setAssignmentForm({ ...assignmentForm, title: e.target.value })} required />
                            <textarea placeholder="Description" value={assignmentForm.description}
                                      onChange={e => setAssignmentForm({ ...assignmentForm, description: e.target.value })} required />
                            <label style={{ color: "var(--theme-muted)", fontSize: "0.85rem" }}>Due Date</label>
                            <input type="date" value={assignmentForm.dueDate}
                                   onChange={e => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })} required />
                            <label>Assignment file (optional)<input type="file" onChange={(event) => setAssignmentForm((current) => ({
                                ...current,
                                file: event.target.files?.[0] || null
                            }))} /></label>
                            <button type="submit" className="btn" style={{ marginTop: 10 }}>Create Assignment</button>
                        </form>
                    )}
                    <div className="card-grid">
                        {assignments.length === 0 && <p style={{ color: "var(--theme-muted)" }}>No assignments yet.</p>}
                        {assignments.map(a => (
                            <div className="card" key={a.id}>
                                {(() => {
                                    const submission = mySubmissions.find((item) => item.assignmentId === a.id);
                                    const late = new Date(a.dueDate).getTime() < Date.now();
                                    const status = submission?.grade && submission.grade !== "Pending"
                                        ? "Graded"
                                        : submission
                                            ? new Date(submission.createdAt).getTime() > new Date(a.dueDate).getTime() ? "Late" : "Submitted"
                                            : submitFiles[a.id] || assignmentReplies[a.id]?.trim() ? "In Progress" : late ? "Late" : "Not Started";
                                    return (
                                        <>
                                <h3>{a.title}</h3>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem" }}>{a.description}</p>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginTop: 6 }}>
                                    Due: {new Date(a.dueDate).toLocaleDateString()}
                                </p>
                                {a.fileUrl && <div className="student-assignment-file-actions">
                                    <button type="button" className="btn btn-inline btn-secondary" onClick={() => setPreviewLesson({
                                        id: a.id,
                                        fileName: a.fileName || a.title,
                                        resourceType: "assignment"
                                    })}>View assignment file</button>
                                    <button type="button" className="btn btn-inline btn-secondary" onClick={() => handleDownload("assignment", a.id, a.fileName || a.title)}>Download assignment file</button>
                                </div>}
                                {!showLecturer && <p className="assignment-status"><strong>Status:</strong> {status}</p>}
                                {!showLecturer && submission?.fileUrl && (
                                    <div className="student-assignment-file-actions">
                                        <button type="button" className="btn btn-inline btn-secondary" onClick={() => setPreviewLesson({
                                            id: submission.id,
                                            fileName: submission.fileName || `Submission ${submission.id}`,
                                            resourceType: "submission"
                                        })}>View your submission</button>
                                        <button type="button" className="btn btn-inline btn-secondary" onClick={() => handleDownload("submission", submission.id, submission.fileName || `submission-${submission.id}`)}>
                                            Download your submission
                                        </button>
                                    </div>
                                )}
                                {!showLecturer && submission?.answerText && (
                                    <div className="assignment-submission-reply"><strong>Your reply</strong><p>{submission.answerText}</p></div>
                                )}
                                {!showLecturer && submission?.grade && submission.grade !== "Pending" && (
                                    <p className="assignment-feedback"><strong>Grade:</strong> {submission.grade}{submission.feedback ? ` · ${submission.feedback}` : ""}</p>
                                )}
                                {!showLecturer && !submission && late && (
                                    <p className="assignment-deadline-error" role="status">
                                        You cannot submit after the due date. Ask your lecturer to reschedule or extend the deadline.
                                    </p>
                                )}
                                {!showLecturer && (
                                    <>
                                        {!submission && <div className="student-assignment-submit">
                                            <label>Your reply
                                                <textarea
                                                    rows={4}
                                                    maxLength={20000}
                                                    value={assignmentReplies[a.id] || ""}
                                                    onChange={(event) => setAssignmentReplies((current) => ({
                                                        ...current,
                                                        [a.id]: event.target.value
                                                    }))}
                                                    placeholder="Write your assignment response..."
                                                />
                                            </label>
                                            <label>Attach a file (optional)
                                                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
                                               onChange={e => {
                                                   const file = e.target.files?.[0];
                                                   if (file) setSubmitFiles(prev => ({ ...prev, [a.id]: file }));
                                               }} />
                                            </label>
                                            <button className="btn" style={{ marginTop: 8 }}
                                                disabled={(!submitFiles[a.id] && !assignmentReplies[a.id]?.trim()) || late}
                                                onClick={() => handleAssignmentSubmit(a)}>Submit Assignment</button>
                                        </div>}
                                    </>
                                )}
                                        </>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* STUDENTS */}
            {tab === "students" && showLecturer && (
                <section>
                    <h2 style={{ marginBottom: 16, color: "var(--theme-accent)" }}>
                        Enrolled Students ({students?.length || 0})
                    </h2>
                    <div className="student-list-controls">
                        <label className="catalog-search course-student-search">
                            <FaSearch aria-hidden="true" />
                            <span className="sr-only">Search enrolled students</span>
                            <input
                                type="search"
                                placeholder="Search by name, email, or matric number"
                                value={studentSearch}
                                onChange={(event) => setStudentSearch(event.target.value)}
                            />
                        </label>
                        <label className="materials-course-filter">
                            <span>Sort by</span>
                            <select value={studentSort} onChange={(event) => setStudentSort(event.target.value)}>
                                <option value="name">Name (A-Z)</option>
                                <option value="matNumber">Matric number</option>
                            </select>
                        </label>
                    </div>
                    {(!students || students.length === 0) ? (
                        <p className="empty-state">No students are enrolled in this course yet.</p>
                    ) : filteredCourseStudents.length ? (
                        <div className="student-table-scroll">
                            <table className="student-table">
                                <thead>
                                    <tr>
                                        <th scope="col">No.</th>
                                        <th scope="col">Full name</th>
                                        <th scope="col">Mat. number</th>
                                        <th scope="col">Email</th>
                                        <th scope="col">Enrolled</th>
                                        <th scope="col">Announcement posting</th>
                                        <th scope="col">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourseStudents.map((student, index) => (
                                        <tr key={student.id}>
                                            <td>{index + 1}</td>
                                            <td>{student.fullName}</td>
                                            <td>{student.matNumber || "Not provided"}</td>
                                            <td><a href={`mailto:${student.email}`}>{student.email}</a></td>
                                            <td>{student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : "—"}</td>
                                            <td className="student-announcement-role-cell">
                                                <input
                                                    type="text"
                                                    maxLength={80}
                                                    aria-label={`Announcement role for ${student.fullName}`}
                                                    placeholder="Role name (e.g. Class Rep)"
                                                    value={announcementRoleInputs[student.id] ?? student.announcementRoleName ?? ""}
                                                    onChange={(event) => setAnnouncementRoleInputs((current) => ({
                                                        ...current,
                                                        [student.id]: event.target.value
                                                    }))}
                                                />
                                                <div>
                                                    <button type="button" className="course-student-remove" onClick={() => saveAnnouncementRole(student, true)}>
                                                        {student.canPostAnnouncements ? "Save role" : "Allow"}
                                                    </button>
                                                    {student.canPostAnnouncements && (
                                                        <button type="button" className="course-student-remove" onClick={() => saveAnnouncementRole(student, false)}>
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button type="button" className="course-student-remove" onClick={() => removeEnrolledStudent(student)}>
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="empty-state">No students match your search.</p>
                    )}
                </section>
            )}

            {/* GRADING */}
            {tab === "grading" && showLecturer && (
                <section>
                    <Link className="course-content-file" to="?section=gradebook">Open gradebook</Link>
                    <h2 style={{ marginBottom: 16, color: "var(--theme-accent)" }}>Grade Submissions</h2>
                    {submissions.length === 0 && (
                        <p style={{ color: "var(--theme-muted)" }}>No submissions yet.</p>
                    )}
                    {submissions.length > 0 && (
                        <div className="grading-table-scroll">
                            <table className="grading-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Assignment</th>
                                        <th scope="col">Student</th>
                                        <th scope="col">Submitted</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Grade</th>
                                        <th scope="col">Feedback</th>
                                        <th scope="col">File</th>
                                        <th scope="col">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.flatMap((assignment) => {
                                        const assignmentSubmissions = assignment.submissions || [];
                                        if (!assignmentSubmissions.length) {
                                            return [(
                                                <tr key={`${assignment.id}-empty`}>
                                                    <td><strong>{assignment.title}</strong></td>
                                                    <td colSpan="8" className="grading-no-submissions">No submissions yet.</td>
                                                </tr>
                                            )];
                                        }
                                        return assignmentSubmissions.map((submission) => (
                                            <tr key={submission.id}>
                                                <td>
                                                    <strong>{assignment.title}</strong>
                                                    <span className="records-table-secondary">Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                                </td>
                                                <td>
                                                    <strong>{submission.student?.fullName || "Unknown student"}</strong>
                                                    <span className="records-table-secondary">{submission.student?.email}</span>
                                                </td>
                                                <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : "—"}</td>
                                                <td><span className={submission.grade === "Pending" ? "grading-status pending" : "grading-status graded"}>
                                                    {submission.grade === "Pending" ? "Needs grading" : "Graded"}
                                                </span></td>
                                                <td>
                                                    <input
                                                        className="grading-grade-input"
                                                        aria-label={`Grade for ${submission.student?.fullName || "student"} on ${assignment.title}`}
                                                        placeholder={submission.grade === "Pending" ? "Enter grade" : submission.grade}
                                                        value={gradeInputs[submission.id] || ""}
                                                        onChange={(event) => setGradeInputs((previous) => ({
                                                            ...previous,
                                                            [submission.id]: event.target.value
                                                        }))}
                                                    />
                                                </td>
                                                <td>
                                                    <textarea
                                                        className="grading-feedback-input"
                                                        aria-label={`Feedback for ${submission.student?.fullName || "student"}`}
                                                        placeholder="Optional feedback"
                                                        value={feedbackInputs[submission.id] || ""}
                                                        onChange={(event) => setFeedbackInputs((previous) => ({
                                                            ...previous,
                                                            [submission.id]: event.target.value
                                                        }))}
                                                        rows={2}
                                                    />
                                                </td>
                                                <td>
                                                    {submission.answerText && <p className="assignment-submission-reply">{submission.answerText}</p>}
                                                    {submission.fileUrl
                                                    ? <div className="grading-file-actions">
                                                        <button type="button" className="grading-table-link" onClick={() => setPreviewLesson({
                                                            id: submission.id,
                                                            fileName: submission.fileName || `Submission ${submission.id}`,
                                                            resourceType: "submission"
                                                        })}>View</button>
                                                        <button type="button" className="grading-table-link" onClick={() => handleDownload("submission", submission.id, submission.fileName || `submission-${submission.id}`)}>Download</button>
                                                    </div>
                                                    : !submission.answerText && "No file or reply"}
                                                </td>
                                                <td>
                                                    <button type="button" className="grading-save-button" onClick={() => handleGrade(submission.id)}>Save grade</button>
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <QuizGradingTables gradebook={gradebook} />
                </section>
            )}

            {tab === "announcements" && (
                <section className="course-feature-section">
                    {showLecturer && (
                        <details className="feature-create-panel">
                            <summary>Assign announcement publishing role</summary>
                            <div className="feature-form-grid">
                                <label>Available students
                                    <select
                                        value={roleStudentId}
                                        onChange={(event) => {
                                            const nextId = event.target.value;
                                            const selected = students.find((student) => String(student.id) === nextId);
                                            setRoleStudentId(nextId);
                                            setRoleNameDraft(selected?.announcementRoleName || "");
                                        }}
                                    >
                                        <option value="">Choose a student</option>
                                        {students.map((student) => (
                                            <option key={student.id} value={student.id}>
                                                {student.fullName}{student.announcementRoleName ? ` · ${student.announcementRoleName}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>Role name
                                    <input
                                        maxLength={80}
                                        value={roleNameDraft}
                                        onChange={(event) => setRoleNameDraft(event.target.value)}
                                        placeholder="For example, Class Rep"
                                    />
                                </label>
                                {(() => {
                                    const selectedStudent = students.find((student) => String(student.id) === roleStudentId);
                                    return selectedStudent ? (
                                        <div className="feature-form-wide">
                                            <button type="button" className="btn btn-inline" onClick={() => saveAnnouncementRole(
                                                selectedStudent,
                                                true,
                                                roleNameDraft
                                            )}>
                                                {selectedStudent.canPostAnnouncements ? "Save role" : "Allow this student to post"}
                                            </button>
                                            {selectedStudent.canPostAnnouncements && (
                                                <button type="button" className="btn btn-secondary" onClick={() => saveAnnouncementRole(selectedStudent, false)}>
                                                    Revoke role
                                                </button>
                                            )}
                                        </div>
                                    ) : null;
                                })()}
                                {!students.length && <p className="feature-status">Enroll students in this course before assigning a role.</p>}
                            </div>
                        </details>
                    )}
                    {(showLecturer || data.canPostAnnouncements) && (
                        <form className="feature-create-panel feature-form-grid" onSubmit={createAnnouncement}>
                            <h2 className="feature-form-wide">{editingAnnouncementId ? "Edit announcement" : "Publish a course announcement"}</h2>
                            <label>Title<input required value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} /></label>
                            <label className="feature-form-wide">Message<textarea required rows={4} value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} /></label>
                            <button className="btn btn-inline" type="submit">{editingAnnouncementId ? "Save announcement" : "Publish announcement"}</button>
                            {editingAnnouncementId && <button type="button" className="btn btn-secondary" onClick={() => {
                                setEditingAnnouncementId(null);
                                setAnnouncementForm({ title: "", body: "" });
                            }}>Cancel edit</button>}
                        </form>
                    )}
                    {announcements.length === 0
                        ? <div className="feature-empty"><strong>No announcements yet</strong><span>Course announcements will appear here.</span></div>
                        : <div className="course-feature-list announcement-list">{announcements.map((announcement) => (
                            <AnnouncementCard key={announcement.id} announcement={announcement} isStaff={showLecturer} actions={showLecturer && <div className="course-material-actions">
                                    <button type="button" onClick={() => {
                                        setEditingAnnouncementId(announcement.id);
                                        setAnnouncementForm({ title: announcement.title, body: announcement.body });
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}>Edit</button>
                                    <button type="button" onClick={() => removeAnnouncement(announcement)}>Delete</button>
                                </div>} />
                        ))}</div>}
                </section>
            )}

            {tab === "calendar" && (
                <section className="course-feature-section">
                    {showLecturer && (
                        <form className="feature-create-panel feature-form-grid" onSubmit={createCalendarEvent}>
                            <h2 className="feature-form-wide">Add a course event</h2>
                            <label>Event type<select value={eventForm.eventType} onChange={(event) => setEventForm({ ...eventForm, eventType: event.target.value })}>
                                {["event", "class", "exam", "deadline", "other"].map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
                            </select></label>
                            <label>Title<input required value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} /></label>
                            <label>Starts<input type="datetime-local" required value={eventForm.startsAt} onChange={(event) => setEventForm({ ...eventForm, startsAt: event.target.value })} /></label>
                            <label>Ends<input type="datetime-local" required value={eventForm.endsAt} onChange={(event) => setEventForm({ ...eventForm, endsAt: event.target.value })} /></label>
                            <label className="feature-form-wide">Details<textarea rows={2} value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} /></label>
                            <button className="btn btn-inline" type="submit">Add event</button>
                        </form>
                    )}
                    {calendarEvents.length === 0
                        ? <div className="feature-empty"><FaClock /><strong>No course events scheduled</strong><span>Assignment due dates and course events will appear here.</span></div>
                        : <div className="course-feature-list">{calendarEvents.map((event) => (
                            <article className="course-feature-card calendar-course-event" key={event.id}>
                                <span className="course-event-type">{event.eventType}</span>
                                <div><h2>{event.title}</h2><time>{new Date(event.startsAt).toLocaleString()}</time>{event.description && <p>{event.description}</p>}</div>
                            </article>
                        ))}</div>}
                </section>
            )}

            {tab === "gradebook" && showLecturer && (
                <section className="course-feature-section">
                    <Link className="course-content-file" to="?section=grading">Back to grading</Link>
                    {analytics && (
                        <div className="course-analytics-strip">
                            <span>{analytics.enrolledStudents} students</span>
                            <span>{analytics.assignmentCount} assignments</span>
                            <span>{analytics.submissionCount} submissions</span>
                            <span>{analytics.gradedSubmissionCount} graded</span>
                            <span>{analytics.assessmentCount + analytics.quizQuestionCount} quiz items</span>
                        </div>
                    )}
                    {!gradebook?.students?.length
                        ? <div className="feature-empty"><strong>No enrolled students</strong><span>Student grades will appear when learners join the course.</span></div>
                        : <div className="course-gradebook-scroll"><table className="course-gradebook">
                            <thead><tr>
                                <th>Student</th>
                                {gradebook.assignmentColumns.map((assignment) => <th key={`assignment-${assignment.id}`}>{assignment.title}</th>)}
                                {gradebook.legacyQuizQuestions.map((quiz) => <th key={`quiz-${quiz.id}`}>{quiz.question}</th>)}
                                {gradebook.assessmentColumns.map((assessment) => <th key={`assessment-${assessment.id}`}>{assessment.title}</th>)}
                            </tr></thead>
                            <tbody>{gradebook.students.map((student) => (
                                <tr key={student.id}>
                                    <th scope="row"><strong>{student.fullName}</strong><span>{student.email}</span></th>
                                    {gradebook.assignmentColumns.map((assignment) => {
                                        const grade = student.assignments.find((item) => item.assignmentId === assignment.id)?.submission?.grade;
                                        return <td key={`assignment-${assignment.id}`}>{grade && grade !== "Pending" ? grade : "—"}</td>;
                                    })}
                                    {gradebook.legacyQuizQuestions.map((quiz) => {
                                        const result = student.quizResults.find((item) => item.quizId === quiz.id);
                                        return <td key={`quiz-${quiz.id}`}>{result ? (result.score > 0 ? "Correct" : "Incorrect") : "—"}</td>;
                                    })}
                                    {gradebook.assessmentColumns.map((assessment) => {
                                        const attempt = student.assessmentAttempts.find((item) => item.assessmentId === assessment.id && item.submittedAt);
                                        return <td key={`assessment-${assessment.id}`}>{attempt
                                            ? attempt.theoryPending
                                                ? "Pending theory marking"
                                                : `${attempt.score}/${attempt.totalMarks ?? attempt.totalQuestions}`
                                            : "—"}</td>;
                                    })}
                                </tr>
                            ))}</tbody>
                        </table></div>}
                </section>
            )}

            {/* AI Assistant — floating */}
            <AIAssistant key={course.id} courseName={course.title} lessonContent={lessonContent} />
            {previewLesson && <MaterialPreviewDialog
                key={`${previewLesson.resourceType}-${previewLesson.id}`}
                resourcePath={`/downloads/${previewLesson.resourceType}/${previewLesson.id}`}
                fileName={previewLesson.fileName}
                onClose={() => setPreviewLesson(null)}
            />}
            {questionImportOpen && <QuestionImportDialog
                onClose={() => setQuestionImportOpen(false)}
                onImport={importAssessmentQuestions}
            />}
        </div>
    );
};

export default CourseDetail;