import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { downloadFile } from "../utils/downloadFile";
import { useAuth } from "../hooks/useAuth";
import QuizGradingTables from "../components/QuizGradingTables";
import MaterialPreviewDialog from "../components/MaterialPreviewDialog";
import { FaUpload } from "react-icons/fa";

const Assignments = () => {
    const { isStaff } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [gradeInputs, setGradeInputs] = useState({});
    const [msg, setMsg] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedCourse, setSelectedCourse] = useState("all");
    const [activeAssignmentTab, setActiveAssignmentTab] = useState("todo");
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submissionCourseId, setSubmissionCourseId] = useState("");
    const [submissionAssignmentId, setSubmissionAssignmentId] = useState("");
    const [submissionModalFile, setSubmissionModalFile] = useState(null);
    const [submissionModalError, setSubmissionModalError] = useState("");
    const [previewAssignment, setPreviewAssignment] = useState(null);
    const [previewSubmission, setPreviewSubmission] = useState(null);
    const [submitFiles, setSubmitFiles] = useState({});
    const [submissionReplies, setSubmissionReplies] = useState({});
    const [submittingIds, setSubmittingIds] = useState([]);
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const showMsg = (text, type = "success") => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3500);
    };

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setLoadError("");
            try {
                if (isStaff) {
                    const coursesRes = await API.get("/courses/my");
                    const courses = coursesRes.data;
                    const withSubs = await Promise.all(
                        courses.map(async (course) => {
                            const [submissionResponse, gradebookResponse] = await Promise.all([
                                API.get(`/assignments/course/${course.id}/submissions`),
                                API.get(`/courses/${course.id}/gradebook`)
                            ]);
                            return {
                                ...course,
                                assignments: submissionResponse.data,
                                gradebook: gradebookResponse.data
                            };
                        })
                    );
                    if (active) setData(withSubs);
                } else {
                    const res = await API.get("/assignments/my");
                    if (active) setData(res.data);
                }
            } catch (err) {
                if (active) setLoadError(err.response?.data?.message || "Unable to load grading data.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadData();
        return () => { active = false; };
    }, [isStaff, refreshKey]);

    const handleGrade = async (submissionId) => {
        const grade = (gradeInputs[submissionId] || "").trim();
        if (!grade) { showMsg("Enter a grade first", "error"); return; }
        try {
            await API.patch(`/assignments/submissions/${submissionId}/grade`, { grade });
            showMsg("Grade saved!");
            setGradeInputs((prev) => ({ ...prev, [submissionId]: "" }));
            setRefreshKey((key) => key + 1);
        } catch (err) {
            showMsg(err.response?.data?.message || "Grading failed", "error");
        }
    };

    const handleDownload = async (submissionId) => {
        try {
            await downloadFile(`/downloads/submission/${submissionId}`, `submission-${submissionId}`);
        } catch (error) {
            showMsg(error.message, "error");
        }
    };

    const selectSubmissionFile = (assignment, file) => {
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv", "png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
            setSubmitFiles((current) => {
                const next = { ...current };
                delete next[assignment.id];
                return next;
            });
            showMsg("Choose a supported document or image file.", "error");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setSubmitFiles((current) => {
                const next = { ...current };
                delete next[assignment.id];
                return next;
            });
            showMsg("The submission file must be 10 MB or smaller.", "error");
            return;
        }
        setSubmitFiles((current) => ({ ...current, [assignment.id]: file }));
    };

    const handleAssignmentDownload = async (assignment) => {
        try {
            await downloadFile(`/downloads/assignment/${assignment.id}`, assignment.fileName || `assignment-${assignment.id}`);
        } catch (error) {
            showMsg(error.message, "error");
        }
    };

    const markRead = async (assignment) => {
        if (assignment.reads?.length) return;
        try {
            const response = await API.patch(`/assignments/${assignment.id}/read`);
            setData((current) => current.map((item) => item.id === assignment.id
                ? { ...item, reads: [{ readAt: response.data.readAt }] }
                : item));
        } catch (requestError) {
            showMsg(requestError.response?.data?.message || "Unable to mark assignment as read.", "error");
        }
    };

    const submitAssignment = async (assignment, fileOverride = null, setFeedback = () => {}) => {
        const file = fileOverride || submitFiles[assignment.id];
        const answerText = (submissionReplies[assignment.id] || "").trim();
        if (new Date(assignment.dueDate).getTime() < Date.now()) {
            const message = "You cannot submit after the due date. Contact your lecturer to reschedule or extend the deadline.";
            showMsg(message, "error");
            setFeedback(message);
            return false;
        }
        if (!file && !answerText) {
            const message = "Write a reply or attach a file to submit.";
            showMsg(message, "error");
            setFeedback(message);
            return false;
        }
        const payload = new FormData();
        payload.append("assignmentId", assignment.id);
        if (answerText) payload.append("answerText", answerText);
        if (file) payload.append("file", file);
        setSubmittingIds((current) => [...new Set([...current, assignment.id])]);
        try {
            await API.post("/assignments/submit", payload, { headers: { "Content-Type": "multipart/form-data" } });
            showMsg("Assignment submitted successfully.");
            setSubmitFiles((current) => {
                const next = { ...current };
                delete next[assignment.id];
                return next;
            });
            setSubmissionReplies((current) => {
                const next = { ...current };
                delete next[assignment.id];
                return next;
            });
            setRefreshKey((key) => key + 1);
            setFeedback("");
            return true;
        } catch (requestError) {
            const message = requestError.response?.data?.message || "Unable to submit assignment.";
            showMsg(message, "error");
            setFeedback(message);
            if (requestError.response?.status === 409) setRefreshKey((key) => key + 1);
            return false;
        } finally {
            setSubmittingIds((current) => current.filter((id) => id !== assignment.id));
        }
    };

    const studentCourses = useMemo(() => [...new Map(data
        .filter((assignment) => assignment.course)
        .map((assignment) => [assignment.course.id, assignment.course])).values()], [data]);
    const modalAssignments = useMemo(() => data.filter((assignment) =>
        String(assignment.courseId) === submissionCourseId && !assignment.submissions?.length
    ).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [data, submissionCourseId]);
    const courseAssignments = useMemo(() => data
        .filter((assignment) => selectedCourse === "all" || String(assignment.courseId) === selectedCourse)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [data, selectedCourse]);
    const assignmentCategories = useMemo(() => {
        const dueSoonLimit = currentTime + 7 * 24 * 60 * 60 * 1000;
        return {
            todo: courseAssignments.filter((assignment) =>
                !assignment.submissions?.length && new Date(assignment.dueDate).getTime() > dueSoonLimit
            ),
            due: courseAssignments.filter((assignment) =>
                !assignment.submissions?.length && new Date(assignment.dueDate).getTime() <= dueSoonLimit
            ),
            done: courseAssignments.filter((assignment) => Boolean(assignment.submissions?.length))
        };
    }, [courseAssignments, currentTime]);
    const visibleAssignments = assignmentCategories[activeAssignmentTab];

    const handleSubmitFromModal = async (event) => {
        event.preventDefault();
        const assignment = modalAssignments.find((item) => String(item.id) === submissionAssignmentId);
        if (!assignment) {
            setSubmissionModalError("Choose an assignment subject.");
            return;
        }
        if (!submissionModalFile) {
            setSubmissionModalError("Choose the assignment file you want to submit.");
            return;
        }
        const submitted = await submitAssignment(assignment, submissionModalFile, setSubmissionModalError);
        if (submitted) {
            setSubmissionModalFile(null);
            setSubmissionCourseId("");
            setSubmissionAssignmentId("");
            setSubmitModalOpen(false);
        }
    };

    if (loading) return <div className="page-content"><p>Loading...</p></div>;

    /* ── LECTURER VIEW ── */
    if (isStaff) {
        const totalPending = data.reduce((acc, course) =>
            acc + course.assignments.reduce((a2, asgn) =>
                a2 + (asgn.submissions?.filter(s => s.grade === "Pending").length || 0), 0), 0);
        const assignmentRows = data.flatMap((course) => course.assignments.flatMap((assignment) => {
            const submissions = assignment.submissions || [];
            if (!submissions.length) {
                return [{ id: `${assignment.id}-empty`, courseTitle: course.title, assignment, submission: null }];
            }
            return submissions.map((submission) => ({
                id: submission.id,
                courseTitle: course.title,
                assignment,
                submission
            }));
        }));

        return (
            <div className="page-content grading-page">
                <header>
                    <p className="eyebrow">ASSESSMENT REVIEW</p>
                    <h1>Grading</h1>
                    <p className="subtitle">Review assignments, quizzes, and timed assessment results across your classes.</p>
                </header>
                {loadError && <p className="materials-error" role="alert">{loadError}</p>}

                {msg && (
                    <p style={{ color: msg.type === "error" ? "#ff6b6b" : "#00d464", marginBottom: 16 }}>
                        {msg.text}
                    </p>
                )}

                {totalPending > 0 && (
                    <p style={{ color: "var(--theme-warm)", marginBottom: 20 }}>
                        ⚠ {totalPending} submission{totalPending !== 1 ? "s" : ""} waiting to be graded.
                    </p>
                )}

                {data.length === 0 && (
                    <div>
                        <p style={{ color: "var(--theme-muted)" }}>No grading items yet.</p>
                        <Link to="/courses" className="btn btn-inline" style={{ marginTop: 12 }}>
                            View courses
                        </Link>
                    </div>
                )}

                <section className="grading-course-section">
                    <header className="grading-course-heading"><h2>Assignment submissions</h2></header>
                    {assignmentRows.length ? (
                        <div className="grading-table-scroll">
                            <table className="grading-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Assignment / due date</th>
                                        <th scope="col">Course</th>
                                        <th scope="col">Student</th>
                                        <th scope="col">Submitted</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Grade</th>
                                        <th scope="col">Submission</th>
                                        <th scope="col">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignmentRows.map(({ id, courseTitle, assignment, submission }) => (
                                        <tr key={id}>
                                            <td>
                                                <strong>{assignment.title}</strong>
                                                <span className="records-table-secondary">
                                                    Due {new Date(assignment.dueDate).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td>{courseTitle}</td>
                                            {submission ? (
                                                <>
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
                                                        {submission.answerText && <p className="assignment-submission-reply">{submission.answerText}</p>}
                                                        {submission.fileUrl
                                                            ? <div className="grading-file-actions">
                                                                <button type="button" className="grading-table-link" onClick={() => setPreviewSubmission(submission)}>View file</button>
                                                                <button type="button" className="grading-table-link" onClick={() => handleDownload(submission.id)}>Download</button>
                                                            </div>
                                                            : !submission.answerText && "No file or reply"}
                                                    </td>
                                                    <td>
                                                        <button type="button" className="grading-save-button" onClick={() => handleGrade(submission.id)}>
                                                            Save grade
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan="6" className="grading-no-submissions">No submissions yet.</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="empty-state">No assignments available to grade.</p>
                    )}
                </section>
                <QuizGradingTables courses={data.map((course) => ({
                    title: course.title,
                    gradebook: course.gradebook
                }))} />
                {previewSubmission && <MaterialPreviewDialog
                    key={`submission-${previewSubmission.id}`}
                    resourcePath={`/downloads/submission/${previewSubmission.id}`}
                    fileName={previewSubmission.fileName || `Submission ${previewSubmission.id}`}
                    onClose={() => setPreviewSubmission(null)}
                />}
            </div>
        );
    }

    /* ── STUDENT VIEW ── */
    return (
        <div className="page-content assignments-page">
            <header className="assignments-page-header">
                <div>
                    <h1>Recent Assignments</h1>
                    <p className="subtitle">Filter by course, then use To-do for deadlines more than a week away, Due for overdue or upcoming deadlines within a week, and Done for submitted work.</p>
                </div>
                <button type="button" className="btn btn-inline assignments-submit-top-button" onClick={() => {
                    setSubmissionModalError("");
                    setSubmitModalOpen(true);
                }}>
                    <FaUpload aria-hidden="true" /> Submit assignment
                </button>
            </header>
            {loadError && <p className="materials-error" role="alert">{loadError}</p>}
            {msg && <p className={msg.type === "error" ? "materials-error" : "feature-status"} role={msg.type === "error" ? "alert" : "status"}>{msg.text}</p>}

            {data.length === 0 ? (
                <p style={{ color: "var(--theme-muted)" }}>
                    No assignments yet. <Link to="/courses">Enroll in a course</Link> first.
                </p>
            ) : (
                <>
                    <label className="materials-course-filter assignments-course-picker">
                        <span>Filter by course</span>
                        <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
                            <option value="all">All courses</option>
                            {studentCourses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                        </select>
                    </label>
                    <nav className="assignment-status-tabs" role="tablist" aria-label="Assignment status">
                        {[
                            ["todo", "To-do"],
                            ["due", "Due"],
                            ["done", "Done"]
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                id={`assignments-tab-${id}`}
                                aria-controls={`assignments-panel-${id}`}
                                aria-selected={activeAssignmentTab === id}
                                tabIndex={activeAssignmentTab === id ? 0 : -1}
                                onClick={() => setActiveAssignmentTab(id)}
                                onKeyDown={(event) => {
                                    const tabIds = ["todo", "due", "done"];
                                    const currentIndex = tabIds.indexOf(activeAssignmentTab);
                                    const nextIndex = event.key === "ArrowRight"
                                        ? (currentIndex + 1) % tabIds.length
                                        : event.key === "ArrowLeft"
                                            ? (currentIndex - 1 + tabIds.length) % tabIds.length
                                            : -1;
                                    if (nextIndex < 0) return;
                                    event.preventDefault();
                                    setActiveAssignmentTab(tabIds[nextIndex]);
                                    event.currentTarget.parentElement
                                        ?.querySelectorAll('[role="tab"]')[nextIndex]
                                        ?.focus();
                                }}
                            >
                                {label}<span>{assignmentCategories[id].length}</span>
                            </button>
                        ))}
                    </nav>
                    {visibleAssignments.length ? (
                        <div className="student-assignment-list" role="tabpanel" id={`assignments-panel-${activeAssignmentTab}`} aria-labelledby={`assignments-tab-${activeAssignmentTab}`}>
                            {visibleAssignments.map((assignment) => {
                                const submission = assignment.submissions?.[0];
                                const submitted = Boolean(submission);
                                const overdue = currentTime > new Date(assignment.dueDate).getTime();
                                const status = submission?.grade && submission.grade !== "Pending"
                                    ? "Graded"
                                    : submitted ? "Submitted"
                                        : overdue ? "Overdue"
                                            : assignment.reads?.length ? "Read" : "Not read";
                                return (
                                    <article className="student-assignment-card" key={assignment.id}>
                                        <header>
                                            <div><h2>{assignment.title}</h2><span>{assignment.course?.title}</span></div>
                                            <span className={`assignment-status-badge${submitted ? " submitted" : overdue ? " overdue" : ""}`}>{status}</span>
                                        </header>
                                        <p className="assignment-due-date">Due {new Date(assignment.dueDate).toLocaleString()}</p>
                                        <details onToggle={(event) => {
                                            if (event.currentTarget.open) markRead(assignment);
                                        }}>
                                            <summary>View assignment instructions</summary>
                                            <p className="student-assignment-description">{assignment.description}</p>
                                        </details>
                                        {assignment.fileUrl && <div className="student-assignment-file-actions">
                                            <button type="button" className="btn btn-secondary btn-inline" onClick={() => setPreviewAssignment(assignment)}>View attached file</button>
                                            <button type="button" className="btn btn-secondary btn-inline" onClick={() => handleAssignmentDownload(assignment)}>Download assignment file</button>
                                        </div>}
                                        {submission ? (
                                            <div className="student-assignment-submitted">
                                                <p>Submitted {new Date(submission.createdAt).toLocaleString()}</p>
                                                {submission.answerText && <div className="assignment-submission-reply"><strong>Your reply</strong><p>{submission.answerText}</p></div>}
                                                {submission.fileUrl && <>
                                                    <button type="button" className="btn btn-secondary btn-inline" onClick={() => setPreviewSubmission(submission)}>View your file</button>
                                                    <button type="button" className="btn btn-secondary btn-inline" onClick={() => handleDownload(submission.id)}>Download your file</button>
                                                </>}
                                                {submission.grade && submission.grade !== "Pending" && <p><strong>Grade:</strong> {submission.grade}{submission.feedback ? ` · ${submission.feedback}` : ""}</p>}
                                            </div>
                                        ) : overdue ? (
                                            <p className="assignment-deadline-error" role="status">You cannot submit after the due date. Ask your lecturer to reschedule or extend the deadline.</p>
                                        ) : (
                                            <div className="student-assignment-submit">
                                                <label>Your reply
                                                    <textarea
                                                        rows={4}
                                                        maxLength={20000}
                                                        value={submissionReplies[assignment.id] || ""}
                                                        onChange={(event) => setSubmissionReplies((current) => ({
                                                            ...current,
                                                            [assignment.id]: event.target.value
                                                        }))}
                                                        placeholder="Write your assignment response..."
                                                    />
                                                </label>
                                                <label>Choose your submission file
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
                                                        onChange={(event) => selectSubmissionFile(assignment, event.target.files?.[0])}
                                                    />
                                                    <span className="assignment-file-hint">
                                                        {submitFiles[assignment.id]?.name || "PDF, Office document, text, CSV, or image · up to 10 MB"}
                                                    </span>
                                                </label>
                                                <button type="button" className="btn btn-inline" disabled={(!submitFiles[assignment.id] && !submissionReplies[assignment.id]?.trim()) || submittingIds.includes(assignment.id)} onClick={() => submitAssignment(assignment)}>
                                                    {submittingIds.includes(assignment.id) ? "Submitting..." : "Submit assignment"}
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    ) : <div className="materials-empty">
                        <h2>{activeAssignmentTab === "done"
                            ? "No completed assignments"
                            : activeAssignmentTab === "due"
                                ? "No assignments due soon"
                                : "No to-do assignments"}</h2>
                    </div>}
                </>
            )}
            {submitModalOpen && (
                <div className="course-modal-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSubmitModalOpen(false);
                }}>
                    <section className="course-modal" role="dialog" aria-modal="true" aria-labelledby="student-submit-assignment-heading">
                        <button type="button" className="course-modal-close" aria-label="Close submission form" onClick={() => setSubmitModalOpen(false)}>×</button>
                        <h2 id="student-submit-assignment-heading">Submit assignment</h2>
                        <p className="course-modal-intro">Choose the course and assignment subject, attach your work, then submit it.</p>
                        <form className="course-create-form" onSubmit={handleSubmitFromModal}>
                            <label>Course
                                <select
                                    required
                                    value={submissionCourseId}
                                    onChange={(event) => {
                                        const nextCourseId = event.target.value;
                                        setSubmissionCourseId(nextCourseId);
                                        const firstAssignment = data.find((assignment) =>
                                            String(assignment.courseId) === nextCourseId && !assignment.submissions?.length
                                        );
                                        setSubmissionAssignmentId(firstAssignment ? String(firstAssignment.id) : "");
                                        setSubmissionModalFile(null);
                                        setSubmissionModalError("");
                                    }}
                                >
                                    <option value="">Choose a course</option>
                                    {studentCourses.map((course) => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </label>
                            <label>Assignment subject
                                <select
                                    required
                                    value={submissionAssignmentId}
                                    disabled={!submissionCourseId || modalAssignments.length === 0}
                                    onChange={(event) => {
                                        setSubmissionAssignmentId(event.target.value);
                                        setSubmissionModalFile(null);
                                        setSubmissionModalError("");
                                    }}
                                >
                                    <option value="">Choose an assignment</option>
                                    {modalAssignments.map((assignment) => (
                                        <option key={assignment.id} value={assignment.id}>{assignment.title}</option>
                                    ))}
                                </select>
                                {submissionCourseId && modalAssignments.length === 0 && (
                                    <small className="settings-field-hint">There are no unsubmitted assignments for this course.</small>
                                )}
                            </label>
                            <label>Assignment file
                                <input
                                    type="file"
                                    required
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] || null;
                                        const extension = file?.name.split(".").pop()?.toLowerCase();
                                        if (file && !["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv", "png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
                                            setSubmissionModalFile(null);
                                            setSubmissionModalError("Choose a supported document or image file.");
                                            return;
                                        }
                                        if (file && file.size > 10 * 1024 * 1024) {
                                            setSubmissionModalFile(null);
                                            setSubmissionModalError("The submission file must be 10 MB or smaller.");
                                            return;
                                        }
                                        setSubmissionModalFile(file);
                                        setSubmissionModalError("");
                                    }}
                                />
                                <small className="settings-field-hint">
                                    {submissionModalFile?.name || "PDF, Office document, text, CSV, or image · up to 10 MB"}
                                </small>
                            </label>
                            {submissionModalError && <p className="course-modal-feedback" role="alert">{submissionModalError}</p>}
                            <button
                                type="submit"
                                className="btn"
                                disabled={!submissionAssignmentId || !submissionModalFile || submittingIds.includes(Number(submissionAssignmentId))}
                            >
                                {submittingIds.includes(Number(submissionAssignmentId)) ? "Submitting..." : "Submit"}
                            </button>
                        </form>
                    </section>
                </div>
            )}
            {previewAssignment && <MaterialPreviewDialog
                key={`assignment-${previewAssignment.id}`}
                resourcePath={`/downloads/assignment/${previewAssignment.id}`}
                fileName={previewAssignment.fileName}
                onClose={() => setPreviewAssignment(null)}
            />}
            {previewSubmission && <MaterialPreviewDialog
                key={`submission-${previewSubmission.id}`}
                resourcePath={`/downloads/submission/${previewSubmission.id}`}
                fileName={previewSubmission.fileName || `Submission ${previewSubmission.id}`}
                onClose={() => setPreviewSubmission(null)}
            />}
        </div>
    );
};

export default Assignments;