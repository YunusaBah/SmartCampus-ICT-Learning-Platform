import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const Courses = () => {
    const { isStaff } = useAuth();
    const [myCourses, setMyCourses] = useState([]);
    const [form, setForm] = useState({ title: "", description: "" });
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(null);
    const [msg, setMsg] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            try {
                if (isStaff) {
                    const res = await API.get("/courses/my");
                    if (active) setMyCourses(res.data);
                } else {
                    const res = await API.get("/enrollments/my-courses");
                    if (active) setMyCourses(res.data.map(e => e.course).filter(Boolean));
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

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post("/courses", form);
            setForm({ title: "", description: "" });
            setMsg("Course created successfully!");
            setTimeout(() => setMsg(""), 3000);
            setRefreshKey((key) => key + 1);
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to create course");
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) return <div className="page-content"><p>Loading...</p></div>;

    /* ── LECTURER VIEW ── */
    if (isStaff) {
        return (
            <div className="page-content">
                <h1>My Courses</h1>
                <p className="subtitle">Create courses and share the class code with your students.</p>

                {msg && <p style={{ color: msg.includes("success") ? "#00d464" : "#ff6b6b", marginBottom: 16 }}>{msg}</p>}

                <form className="panel-form" onSubmit={handleCreate}>
                    <h3>Create New Course</h3>
                    <input
                        placeholder="Course title"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        required
                    />
                    <textarea
                        placeholder="Course description"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        required
                    />
                    <button type="submit" className="btn">Create Course</button>
                </form>

                <div className="card-grid">
                    {myCourses.length === 0 && <p style={{ color: "var(--theme-muted)" }}>No courses yet. Create your first one above.</p>}
                    {myCourses.map(course => (
                        <div className="card" key={course.id}>
                            <h3>{course.title}</h3>
                            <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem", margin: "6px 0 12px" }}>{course.description}</p>

                            {/* Class code box */}
                            {course.classCode && (
                                <div style={{
                                    background: "var(--theme-bg)", borderRadius: 8,
                                    padding: "10px 14px", marginBottom: 12,
                                    display: "flex", alignItems: "center", justifyContent: "space-between"
                                }}>
                                    <div>
                                        <p style={{ color: "var(--theme-muted)", fontSize: "0.75rem", marginBottom: 2 }}>CLASS CODE</p>
                                        <p style={{ color: "#00d4ff", fontWeight: 700, letterSpacing: "0.25em", fontSize: "1.2rem" }}>
                                            {course.classCode}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => copyCode(course.classCode)}
                                        style={{
                                            background: copied === course.classCode ? "#00d464" : "var(--theme-panel-raised)",
                                            border: "none", borderRadius: 6, padding: "6px 12px",
                                            color: "var(--theme-text)", cursor: "pointer", fontSize: "0.8rem"
                                        }}>
                                        {copied === course.classCode ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            )}

                            <Link to={`/courses/${course.id}`} className="btn btn-inline">Manage Course</Link>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ── STUDENT VIEW ── */
    return (
        <div className="page-content">
            <h1>My Classes</h1>
            <p className="subtitle">
                Your enrolled classes. Use <Link to="/join">+ Join a Class</Link> to join a new one with a code.
            </p>

            <div className="card-grid">
                {myCourses.length === 0 && (
                    <div style={{ color: "var(--theme-muted)" }}>
                        <p>You haven't joined any classes yet.</p>
                        <Link to="/join" className="btn btn-inline" style={{ marginTop: 12 }}>
                            + Join a Class
                        </Link>
                    </div>
                )}
                {myCourses.map(course => (
                    <div className="card" key={course.id}>
                        <h3>{course.title}</h3>
                        <p style={{ color: "var(--theme-muted)", fontSize: "0.9rem", margin: "6px 0 12px" }}>{course.description}</p>
                        <Link to={`/courses/${course.id}`} className="btn btn-inline">Open Classroom</Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Courses;