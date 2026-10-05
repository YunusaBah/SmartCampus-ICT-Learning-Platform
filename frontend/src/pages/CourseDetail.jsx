import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";
import API_BASE from "../config";
import { useAuth } from "../hooks/useAuth";
import AIAssistant from "../components/AIAssistant";
import { FaBookOpen, FaCheckCircle, FaClock } from "react-icons/fa";

const CourseDetail = () => {
    const { courseId } = useParams();
    const { isStaff } = useAuth();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState("materials");
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
    const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
    const [eventForm, setEventForm] = useState({ eventType: "class", title: "", description: "", startsAt: "", endsAt: "" });
    const [assessmentForm, setAssessmentForm] = useState({
        title: "", instructions: "", timeLimitMinutes: 20, maxAttempts: 1,
        questions: [{ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" }]
    });
    const [activeAttempt, setActiveAttempt] = useState(null);
    const [attemptQuestions, setAttemptQuestions] = useState([]);
    const [attemptAnswers, setAttemptAnswers] = useState({});
    const [attemptResult, setAttemptResult] = useState(null);
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [error, setError] = useState("");
    const [alertMsg, setAlertMsg] = useState(null);
    const [gradeInputs, setGradeInputs] = useState({});
    const [feedbackInputs, setFeedbackInputs] = useState({});

    const [lessonForm, setLessonForm] = useState({ title: "", content: "", videoUrl: "", file: null });
    const [quizForm, setQuizForm] = useState({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" });
    const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", dueDate: "" });
    const [quizAnswers, setQuizAnswers] = useState({});
    const [submitFiles, setSubmitFiles] = useState({});

    const showAlert = (text, type = "success") => {
        setAlertMsg({ text, type });
        setTimeout(() => setAlertMsg(null), 3500);
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
            await API.post("/lessons", formData, { headers: { "Content-Type": "multipart/form-data" } });
            setLessonForm({ title: "", content: "", videoUrl: "", file: null });
            showAlert("Lesson uploaded!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Failed to upload lesson", "error");
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
        try {
            await API.post("/assignments", { ...assignmentForm, courseId: Number(courseId) });
            setAssignmentForm({ title: "", description: "", dueDate: "" });
            showAlert("Assignment created!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Failed to create assignment", "error");
        }
    };

    const handleQuizSubmit = async (quizId) => {
        const selectedAnswer = quizAnswers[quizId];
        if (!selectedAnswer) { showAlert("Select an answer first", "error"); return; }
        try {
            const res = await API.post("/quizzes/submit", { quizId, selectedAnswer });
            showAlert(res.data.passed ? "✓ Correct! Well done." : "Submitted! Review the material and try again.");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Quiz submit failed", "error");
        }
    };

    const handleAssignmentSubmit = async (assignmentId) => {
        const file = submitFiles[assignmentId];
        if (!file) { showAlert("Choose a file first", "error"); return; }
        const formData = new FormData();
        formData.append("assignmentId", assignmentId);
        formData.append("file", file);
        try {
            await API.post("/assignments/submit", formData, { headers: { "Content-Type": "multipart/form-data" } });
            setSubmitFiles((current) => {
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
            const response = await API.post(`/courses/${courseId}/announcements`, announcementForm);
            setAnnouncements((current) => [response.data, ...current]);
            setAnnouncementForm({ title: "", body: "" });
            showAlert("Announcement published.");
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to publish announcement.", "error");
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
                questions: [{ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" }]
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
            setAttemptAnswers(response.data.attempt.answers || {});
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
        const nextAnswers = { ...attemptAnswers, [String(questionId)]: answer };
        setAttemptAnswers(nextAnswers);
        try {
            await API.put(`/quizzes/attempts/${activeAttempt.id}/answers`, { answers: nextAnswers });
        } catch (requestError) {
            showAlert(requestError.response?.data?.message || "Unable to save your answer.", "error");
        }
    };

    const submitAssessment = async () => {
        if (!activeAttempt || !window.confirm("Submit this assessment now? You cannot change answers after submission.")) return;
        try {
            const response = await API.post(`/quizzes/attempts/${activeAttempt.id}/submit`);
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

    if (error) return (
        <div className="page-content">
            <p style={{ color: "#ff6b6b", marginBottom: 12 }}>{error}</p>
            <Link to="/courses">← Back to courses</Link>
        </div>
    );

    if (!data) return <div className="page-content"><p>Loading classroom...</p></div>;

    const { course, lessons, quizzes, assignments, students, isLecturer } = data;
    const showLecturer = isLecturer || isStaff;
    const tabs = showLecturer
        ? ["materials", "quizzes", "assignments", "students", "grading", "announcements", "calendar", "gradebook"]
        : ["materials", "quizzes", "assignments", "announcements", "calendar"];

    const lessonContent = lessons.map(l => l.content).join(" ");

    return (
        <div className="page-content">
            <Link to="/courses" style={{ color: "#00d4ff", display: "inline-block", marginBottom: 12 }}>
                ← Back to courses
            </Link>
            <h1>{course.title}</h1>
            <p style={{ color: "var(--theme-muted)", marginBottom: 20 }}>{course.description}</p>
            <div className="course-detail-meta">
                {course.code && <span>{course.code}</span>}
                {course.classCode && <span>{course.classCode}</span>}
                {course.department?.name && <span>{course.department.name}</span>}
            </div>

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

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", marginBottom: 24, paddingBottom: 4 }}>
                {tabs.map(t => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                            style={{
                                padding: "10px 18px", borderRadius: 8, border: "none",
                                background: tab === t ? "var(--theme-accent)" : "var(--theme-panel-raised)",
                                color: tab === t ? "var(--theme-active-text)" : "var(--theme-text)",
                                fontWeight: tab === t ? 700 : 400,
                                cursor: "pointer", whiteSpace: "nowrap", fontSize: "0.9rem"
                            }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* MATERIALS */}
            {tab === "materials" && (
                <section>
                    {showLecturer && (
                        <>
                            <details className="feature-create-panel">
                                <summary>Create a course module</summary>
                                <form className="feature-form-grid" onSubmit={createModule}>
                                    <label>Module title<input required value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} /></label>
                                    <button className="btn btn-inline" type="submit">Add module</button>
                                </form>
                            </details>
                            <details className="feature-create-panel">
                                <summary>Upload course material</summary>
                                <form className="feature-form-grid" onSubmit={handleCreateLesson}>
                                    <label>Lesson title<input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required /></label>
                                    <label>Module
                                        <select value={lessonForm.moduleId || ""} onChange={(event) => setLessonForm({ ...lessonForm, moduleId: event.target.value })}>
                                            <option value="">Uncategorized lesson</option>
                                            {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
                                        </select>
                                    </label>
                                    <label className="feature-form-wide">Lesson content<textarea value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} required /></label>
                                    <label>Video URL (optional)<input value={lessonForm.videoUrl} onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} /></label>
                                    <label>Resource file<input type="file" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) setLessonForm(prev => ({ ...prev, file }));
                                    }} /></label>
                                    <button type="submit" className="btn btn-inline">Upload material</button>
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
                                                    <div><strong>{lesson.title}</strong><p>{lesson.content}</p>
                                                        <div className="lesson-resources">
                                                            {lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer">Watch lesson video</a>}
                                                            {lesson.fileUrl && <a href={`${API_BASE}${lesson.fileUrl}`} target="_blank" rel="noreferrer">Download resource</a>}
                                                        </div>
                                                    </div>
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
                                            <div><strong>{lesson.title}</strong><p>{lesson.content}</p></div>
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
                                            <label>Prompt<input required value={question.question} onChange={(event) => setAssessmentForm((current) => ({
                                                ...current,
                                                questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item)
                                            }))} /></label>
                                            {["A", "B", "C", "D"].map((option) => (
                                                <label key={option}>Option {option}<input required value={question[`option${option}`]} onChange={(event) => setAssessmentForm((current) => ({
                                                    ...current,
                                                    questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, [`option${option}`]: event.target.value } : item)
                                                }))} /></label>
                                            ))}
                                            <label>Correct answer<select value={question.correctAnswer} onChange={(event) => setAssessmentForm((current) => ({
                                                ...current,
                                                questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, correctAnswer: event.target.value } : item)
                                            }))}>
                                                {["A", "B", "C", "D"].map((option) => <option key={option} value={option}>{option}</option>)}
                                            </select></label>
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
                                            questions: [...current.questions, { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" }]
                                        }))}>Add question</button>
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
                                    {showLecturer && <button type="button" className="btn btn-secondary btn-inline" onClick={async () => {
                                        try {
                                            const response = await API.get(`/quizzes/assessments/${assessment.id}/attempts`);
                                            showAlert(`${response.data.length} student attempt(s) recorded.`);
                                        } catch (requestError) {
                                            showAlert(requestError.response?.data?.message || "Unable to load assessment attempts.", "error");
                                        }
                                    }}>View attempts</button>}
                                </article>
                            ))}
                        </div>
                    )}
                    {activeAttempt && (
                        <section className="active-assessment">
                            <header><div><p className="eyebrow">ASSESSMENT IN PROGRESS</p><h2>{assessments.find((assessment) => assessment.id === activeAttempt.assessmentId)?.title || "Timed assessment"}</h2></div><span className={secondsRemaining < 60 ? "assessment-timer urgent" : "assessment-timer"}><FaClock /> {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}</span></header>
                            {attemptQuestions.map((question, index) => (
                                <article className="assessment-question" key={question.id}>
                                    <h3>{index + 1}. {question.question}</h3>
                                    {["A", "B", "C", "D"].map((option) => (
                                        <label key={option} className="assessment-answer">
                                            <input type="radio" name={`attempt-${question.id}`} checked={attemptAnswers[String(question.id)] === option} onChange={() => saveAttemptAnswer(question.id, option)} />
                                            <span><strong>{option}.</strong> {question[`option${option}`]}</span>
                                        </label>
                                    ))}
                                </article>
                            ))}
                            <button type="button" className="btn btn-inline" onClick={submitAssessment}>Submit assessment</button>
                        </section>
                    )}
                    {attemptResult && (
                        <div className="attempt-result" role="status">
                            <strong>Assessment submitted</strong>
                            <span>Score: {attemptResult.attempt?.score ?? 0} / {attemptResult.attempt?.totalQuestions ?? attemptResult.results?.length ?? 0}</span>
                        </div>
                    )}
                    <div className="card-grid">
                        {quizzes.length === 0 && <p style={{ color: "var(--theme-muted)" }}>No quiz questions yet.</p>}
                        {quizzes.map(quiz => (
                            <div className="card" key={quiz.id}>
                                <h3 style={{ marginBottom: 12 }}>{quiz.question}</h3>
                                {!showLecturer ? (
                                    <>
                                        {["A", "B", "C", "D"].map(opt => (
                                            <label key={opt} style={{
                                                display: "flex", alignItems: "center", gap: 10,
                                                padding: "10px 12px", margin: "6px 0",
                                                background: quizAnswers[quiz.id] === opt ? "rgba(0,212,255,0.1)" : "var(--theme-panel-raised)",
                                                borderRadius: 8, cursor: "pointer",
                                                border: quizAnswers[quiz.id] === opt ? "1px solid var(--theme-accent)" : "1px solid transparent"
                                            }}>
                                                <input type="radio" name={`quiz-${quiz.id}`} value={opt}
                                                       checked={quizAnswers[quiz.id] === opt}
                                                       onChange={() => setQuizAnswers({ ...quizAnswers, [quiz.id]: opt })} />
                                                <strong>{opt}:</strong> {quiz[`option${opt}`]}
                                            </label>
                                        ))}
                                        <button className="btn" style={{ marginTop: 12 }}
                                                onClick={() => handleQuizSubmit(quiz.id)}>
                                            Submit Answer
                                        </button>
                                    </>
                                ) : (
                                    <ul style={{ listStyle: "none", marginTop: 8 }}>
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
                            </div>
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
                                            : submitFiles[a.id] ? "In Progress" : late ? "Late" : "Not Started";
                                    return (
                                        <>
                                <h3>{a.title}</h3>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem" }}>{a.description}</p>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginTop: 6 }}>
                                    Due: {new Date(a.dueDate).toLocaleDateString()}
                                </p>
                                {!showLecturer && <p className="assignment-status"><strong>Status:</strong> {status}</p>}
                                {!showLecturer && submission?.grade && submission.grade !== "Pending" && (
                                    <p className="assignment-feedback"><strong>Grade:</strong> {submission.grade}{submission.feedback ? ` · ${submission.feedback}` : ""}</p>
                                )}
                                {!showLecturer && (
                                    <>
                                        {!submission && <input type="file" style={{ marginTop: 12, width: "100%" }}
                                               onChange={e => {
                                                   const file = e.target.files?.[0];
                                                   if (file) setSubmitFiles(prev => ({ ...prev, [a.id]: file }));
                                               }} />
                                        }
                                        {!submission && <button className="btn" style={{ marginTop: 8 }}
                                                onClick={() => handleAssignmentSubmit(a.id)}>Submit Assignment</button>}
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
                    <h2 style={{ marginBottom: 16, color: "#00d4ff" }}>
                        Enrolled Students ({students?.length || 0})
                    </h2>
                    {(!students || students.length === 0) ? (
                        <p className="empty-state">No students are enrolled in this course yet.</p>
                    ) : (
                        <ul className="student-list">
                            {students.map((student) => (
                                <li className="student-list-item" key={student.id}>
                                    <div className="student-avatar" aria-hidden="true">
                                        {student.fullName?.trim().charAt(0).toUpperCase() || "S"}
                                    </div>
                                    <div className="student-list-details">
                                        <strong>{student.fullName}</strong>
                                        <span>{student.email}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {/* GRADING */}
            {tab === "grading" && showLecturer && (
                <section>
                    <h2 style={{ marginBottom: 16, color: "#00d4ff" }}>Grade Submissions</h2>
                    {submissions.length === 0 && (
                        <p style={{ color: "var(--theme-muted)" }}>No submissions yet.</p>
                    )}
                    {submissions.map(assignment => (
                        <div className="card" key={assignment.id} style={{ marginBottom: 16 }}>
                            <h3>{assignment.title}</h3>
                            <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                            {(!assignment.submissions || assignment.submissions.length === 0) && (
                                <p style={{ color: "#4a6a8a", marginTop: 8 }}>No submissions yet.</p>
                            )}
                            {assignment.submissions?.map(sub => (
                                <div key={sub.id} style={{
                                    borderTop: "1px solid var(--theme-border)", marginTop: 12, paddingTop: 12,
                                    display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center"
                                }}>
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <p><strong>{sub.student?.fullName || "Unknown"}</strong></p>
                                        <p style={{ color: "var(--theme-muted)", fontSize: "0.82rem" }}>
                                            {sub.student?.email || ""}
                                        </p>
                                        <span style={{
                                            display: "inline-block", marginTop: 4,
                                            padding: "2px 10px", borderRadius: 20, fontSize: "0.8rem",
                                            background: sub.grade === "Pending"
                                                ? "rgba(240,165,0,0.15)"
                                                : "rgba(0,212,255,0.12)",
                                            color: sub.grade === "Pending" ? "#f0a500" : "#00d4ff"
                                        }}>
                                            {sub.grade}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                        {sub.fileUrl && (
                                            <a href={`${API_BASE}${sub.fileUrl}`} target="_blank" rel="noreferrer"
                                               className="btn btn-inline btn-secondary">
                                                View File
                                            </a>
                                        )}
                                        <input
                                            placeholder="Grade e.g. A, 85%"
                                            value={gradeInputs[sub.id] || ""}
                                            onChange={e => setGradeInputs(prev => ({
                                                ...prev, [sub.id]: e.target.value
                                            }))}
                                            style={{
                                                padding: "8px 12px", borderRadius: 8,
                                                border: "1px solid var(--theme-border)", background: "var(--theme-panel-raised)",
                                                color: "var(--theme-text)", width: 150, fontSize: "0.88rem"
                                            }}
                                        />
                                        <textarea
                                            aria-label={`Feedback for ${sub.student?.fullName || "student"}`}
                                            placeholder="Feedback for the student (optional)"
                                            value={feedbackInputs[sub.id] || ""}
                                            onChange={e => setFeedbackInputs(prev => ({
                                                ...prev, [sub.id]: e.target.value
                                            }))}
                                            rows={2}
                                        />
                                        <button onClick={() => handleGrade(sub.id)}
                                                style={{
                                                    padding: "8px 14px", background: "#f0a500",
                                                    border: "none", borderRadius: 8,
                                                    color: "var(--theme-active-text)", fontWeight: 700, cursor: "pointer"
                                                }}>
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </section>
            )}

            {tab === "announcements" && (
                <section className="course-feature-section">
                    {showLecturer && (
                        <form className="feature-create-panel feature-form-grid" onSubmit={createAnnouncement}>
                            <h2 className="feature-form-wide">Publish a course announcement</h2>
                            <label>Title<input required value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} /></label>
                            <label className="feature-form-wide">Message<textarea required rows={4} value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} /></label>
                            <button className="btn btn-inline" type="submit">Publish announcement</button>
                        </form>
                    )}
                    {announcements.length === 0
                        ? <div className="feature-empty"><strong>No announcements yet</strong><span>Course announcements will appear here.</span></div>
                        : <div className="course-feature-list">{announcements.map((announcement) => (
                            <article className="course-feature-card" key={announcement.id}>
                                <div className="course-feature-card-heading"><h2>{announcement.title}</h2><time>{new Date(announcement.createdAt).toLocaleString()}</time></div>
                                <p>{announcement.body}</p>
                                <span className="course-feature-byline">{announcement.author?.fullName || "Course lecturer"}</span>
                            </article>
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
                                        return <td key={`assessment-${assessment.id}`}>{attempt ? `${attempt.score}/${attempt.totalQuestions}` : "—"}</td>;
                                    })}
                                </tr>
                            ))}</tbody>
                        </table></div>}
                </section>
            )}

            {/* AI Assistant — floating */}
            <AIAssistant key={course.id} courseName={course.title} lessonContent={lessonContent} />
        </div>
    );
};

export default CourseDetail;