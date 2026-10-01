import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";
import API_BASE from "../config";
import { useAuth } from "../hooks/useAuth";
import AIAssistant from "../components/AIAssistant";

const CourseDetail = () => {
    const { courseId } = useParams();
    const { isStaff } = useAuth();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState("materials");
    const [submissions, setSubmissions] = useState([]);
    const [error, setError] = useState("");
    const [alertMsg, setAlertMsg] = useState(null);
    const [gradeInputs, setGradeInputs] = useState({});

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
        if (data?.isLecturer && tab === "grading") {
            loadSubmissions();
        }
    }, [data?.isLecturer, tab, loadSubmissions]);

    const handleCreateLesson = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("title", lessonForm.title);
        formData.append("content", lessonForm.content);
        formData.append("videoUrl", lessonForm.videoUrl);
        formData.append("courseId", courseId);
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
            showAlert("Assignment submitted!");
            loadCourse();
        } catch (err) {
            showAlert(err.response?.data?.message || "Submit failed", "error");
        }
    };

    const handleGrade = async (submissionId) => {
        const grade = (gradeInputs[submissionId] || "").trim();
        if (!grade) { showAlert("Enter a grade first", "error"); return; }
        try {
            await API.patch(`/assignments/submissions/${submissionId}/grade`, { grade });
            showAlert("Grade saved!");
            setGradeInputs(prev => ({ ...prev, [submissionId]: "" }));
            loadSubmissions();
        } catch (err) {
            showAlert(err.response?.data?.message || "Grading failed", "error");
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
        ? ["materials", "quizzes", "assignments", "students", "grading"]
        : ["materials", "quizzes", "assignments"];

    const lessonContent = lessons.map(l => l.content).join(" ");

    return (
        <div className="page-content">
            <Link to="/courses" style={{ color: "#00d4ff", display: "inline-block", marginBottom: 12 }}>
                ← Back to courses
            </Link>
            <h1>{course.title}</h1>
            <p style={{ color: "var(--theme-muted)", marginBottom: 20 }}>{course.description}</p>

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
                        <form className="panel-form" onSubmit={handleCreateLesson}>
                            <h3>Upload Course Material</h3>
                            <input placeholder="Lesson title" value={lessonForm.title}
                                   onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required />
                            <textarea placeholder="Lesson content / notes" value={lessonForm.content}
                                      onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} required />
                            <input placeholder="Video URL (optional)" value={lessonForm.videoUrl}
                                   onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} />
                            <input type="file"
                                   onChange={e => {
                                       const file = e.target.files?.[0];
                                       if (file) setLessonForm(prev => ({ ...prev, file }));
                                   }} />
                            <button type="submit" className="btn" style={{ marginTop: 10 }}>Upload Material</button>
                        </form>
                    )}
                    <div className="card-grid">
                        {lessons.length === 0 && <p style={{ color: "var(--theme-muted)" }}>No materials uploaded yet.</p>}
                        {lessons.map(lesson => (
                            <div className="card" key={lesson.id}>
                                <h3>{lesson.title}</h3>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem" }}>{lesson.content}</p>
                                {lesson.videoUrl && (
                                    <a href={lesson.videoUrl} target="_blank" rel="noreferrer"
                                       style={{ display: "inline-block", marginTop: 8 }}>
                                        ▶ Watch Video
                                    </a>
                                )}
                                {lesson.fileUrl && (
                                    <a href={`${API_BASE}${lesson.fileUrl}`} target="_blank" rel="noreferrer"
                                       style={{ display: "inline-block", marginTop: 8, marginLeft: 12 }}>
                                        ↓ Download
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* QUIZZES */}
            {tab === "quizzes" && (
                <section>
                    {showLecturer && (
                        <form className="panel-form" onSubmit={handleCreateQuiz}>
                            <h3>Add Quiz Question</h3>
                            <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginBottom: 8 }}>
                                Tip: Ask the 🤖 AI assistant to generate questions for you!
                            </p>
                            <input placeholder="Question" value={quizForm.question}
                                   onChange={e => setQuizForm({ ...quizForm, question: e.target.value })} required />
                            {["A", "B", "C", "D"].map(opt => (
                                <input key={opt} placeholder={`Option ${opt}`}
                                       value={quizForm[`option${opt}`]}
                                       onChange={e => setQuizForm({ ...quizForm, [`option${opt}`]: e.target.value })} required />
                            ))}
                            <select value={quizForm.correctAnswer}
                                    onChange={e => setQuizForm({ ...quizForm, correctAnswer: e.target.value })}>
                                <option value="A">Correct Answer: A</option>
                                <option value="B">Correct Answer: B</option>
                                <option value="C">Correct Answer: C</option>
                                <option value="D">Correct Answer: D</option>
                            </select>
                            <button type="submit" className="btn" style={{ marginTop: 10 }}>Add Question</button>
                        </form>
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
                                <h3>{a.title}</h3>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem" }}>{a.description}</p>
                                <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginTop: 6 }}>
                                    Due: {new Date(a.dueDate).toLocaleDateString()}
                                </p>
                                {!showLecturer && (
                                    <>
                                        <input type="file" style={{ marginTop: 12, width: "100%" }}
                                               onChange={e => {
                                                   const file = e.target.files?.[0];
                                                   if (file) setSubmitFiles(prev => ({ ...prev, [a.id]: file }));
                                               }} />
                                        <button className="btn" style={{ marginTop: 8 }}
                                                onClick={() => handleAssignmentSubmit(a.id)}>
                                            Submit Assignment
                                        </button>
                                    </>
                                )}
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

            {/* AI Assistant — floating */}
            <AIAssistant key={course.id} courseName={course.title} lessonContent={lessonContent} />
        </div>
    );
};

export default CourseDetail;