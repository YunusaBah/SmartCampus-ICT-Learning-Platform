import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import API_BASE from "../config";
import { useAuth } from "../hooks/useAuth";

const Assignments = () => {
    const { isStaff } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gradeInputs, setGradeInputs] = useState({});
    const [msg, setMsg] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const showMsg = (text, type = "success") => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3500);
    };

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                if (isStaff) {
                    const coursesRes = await API.get("/courses/my");
                    const courses = coursesRes.data;
                    const withSubs = await Promise.all(
                        courses.map(async (course) => {
                            try {
                                const res = await API.get(`/assignments/course/${course.id}/submissions`);
                                return { ...course, assignments: res.data };
                            } catch {
                                return { ...course, assignments: [] };
                            }
                        })
                    );
                    if (active) setData(withSubs);
                } else {
                    const res = await API.get("/assignments/my");
                    if (active) setData(res.data);
                }
            } catch (err) {
                console.error(err);
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

    if (loading) return <div className="page-content"><p>Loading...</p></div>;

    /* ── LECTURER VIEW ── */
    if (isStaff) {
        const totalPending = data.reduce((acc, course) =>
            acc + course.assignments.reduce((a2, asgn) =>
                a2 + (asgn.submissions?.filter(s => s.grade === "Pending").length || 0), 0), 0);

        return (
            <div className="page-content">
                <h1>Assignments & Grading</h1>
                <p className="subtitle">Review and grade student submissions across all your courses.</p>

                {msg && (
                    <p style={{ color: msg.type === "error" ? "#ff6b6b" : "#00d464", marginBottom: 16 }}>
                        {msg.text}
                    </p>
                )}

                {totalPending > 0 && (
                    <p style={{ color: "#f0a500", marginBottom: 20 }}>
                        ⚠ {totalPending} submission{totalPending !== 1 ? "s" : ""} waiting to be graded.
                    </p>
                )}

                {data.length === 0 && (
                    <div>
                        <p style={{ color: "var(--theme-muted)" }}>No courses yet.</p>
                        <Link to="/courses" className="btn btn-inline" style={{ marginTop: 12 }}>
                            Create a Course
                        </Link>
                    </div>
                )}

                {data.map((course) => (
                    <div key={course.id} style={{ marginBottom: 32 }}>
                        <h2 style={{ color: "#00d4ff", marginBottom: 12 }}>{course.title}</h2>

                        {course.assignments.length === 0 && (
                            <p style={{ color: "var(--theme-muted)", marginBottom: 8 }}>No assignments in this course yet.</p>
                        )}

                        {course.assignments.map((asgn) => (
                            <div className="card" key={asgn.id} style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                                    <div>
                                        <h3>{asgn.title}</h3>
                                        <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem", marginTop: 4 }}>{asgn.description}</p>
                                        <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                                            Due: {new Date(asgn.dueDate).toLocaleDateString()}
                                            &nbsp;|&nbsp;
                                            Submissions: <strong style={{ color: "var(--theme-text)" }}>{asgn.submissions?.length || 0}</strong>
                                            &nbsp;|&nbsp;
                                            Pending: <strong style={{ color: "#f0a500" }}>
                                            {asgn.submissions?.filter(s => s.grade === "Pending").length || 0}
                                        </strong>
                                        </p>
                                    </div>
                                    <Link to={`/courses/${course.id}`} className="btn btn-inline btn-secondary"
                                          style={{ alignSelf: "flex-start" }}>
                                        Open Course
                                    </Link>
                                </div>

                                {(!asgn.submissions || asgn.submissions.length === 0) && (
                                    <p style={{ color: "#4a6a8a", marginTop: 12, fontSize: "0.9rem" }}>
                                        No submissions yet.
                                    </p>
                                )}

                                {asgn.submissions?.map((sub) => (
                                    <div key={sub.id} style={{
                                        borderTop: "1px solid var(--theme-border)",
                                        paddingTop: 12,
                                        marginTop: 12,
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 12,
                                        alignItems: "flex-start"
                                    }}>
                                        <div style={{ flex: 1, minWidth: 180 }}>
                                            <p><strong>{sub.student?.fullName}</strong></p>
                                            <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem" }}>{sub.student?.email}</p>
                                            <span style={{
                                                display: "inline-block",
                                                marginTop: 4,
                                                padding: "2px 10px",
                                                borderRadius: 20,
                                                fontSize: "0.8rem",
                                                background: sub.grade === "Pending" ? "rgba(240,165,0,0.15)" : "rgba(0,212,255,0.12)",
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
                                                placeholder="Grade (A, B+, 85%…)"
                                                value={gradeInputs[sub.id] || ""}
                                                onChange={(e) => setGradeInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                                style={{
                                                    padding: "8px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid var(--theme-border)",
                                                    background: "var(--theme-panel-raised)",
                                                    color: "var(--theme-text)",
                                                    width: 160,
                                                    fontSize: "0.9rem"
                                                }}
                                            />
                                            <button
                                                className="btn btn-inline"
                                                style={{ background: "#f0a500", color: "var(--theme-active-text)" }}
                                                onClick={() => handleGrade(sub.id)}>
                                                Save Grade
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    /* ── STUDENT VIEW ── */
    return (
        <div className="page-content">
            <h1>My Assignments</h1>
            <p className="subtitle">Open a course classroom to submit your work.</p>

            <div className="card-grid">
                {data.length === 0 && (
                    <p style={{ color: "var(--theme-muted)" }}>
                        No assignments yet. <Link to="/courses">Enroll in a course</Link> first.
                    </p>
                )}
                {data.map((a) => (
                    <div className="card" key={a.id}>
                        <h3>{a.title}</h3>
                        <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem" }}>{a.description}</p>
                        <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginTop: 6 }}>
                            Course: {a.course?.title}
                        </p>
                        <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem" }}>
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                        </p>
                        <Link to={`/courses/${a.courseId}`} className="btn btn-inline" style={{ marginTop: 10 }}>
                            Open & Submit
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Assignments;