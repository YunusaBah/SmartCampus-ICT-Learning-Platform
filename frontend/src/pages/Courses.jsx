import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaBookOpen, FaSearch } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const Courses = ({ catalog = false }) => {
    const { isStaff } = useAuth();
    const [myCourses, setMyCourses] = useState([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
    const [form, setForm] = useState({ title: "", description: "" });
    const [search, setSearch] = useState("");
    const [catalogFilter, setCatalogFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
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
                } else if (catalog) {
                    const [catalogRes, enrolledRes] = await Promise.all([
                        API.get("/courses"),
                        API.get("/enrollments/my-courses")
                    ]);
                    const enrolledCourses = enrolledRes.data.map((enrollment) => enrollment.course).filter(Boolean);
                    if (active) {
                        setMyCourses(catalogRes.data);
                        setEnrolledCourseIds(enrolledCourses.map((course) => course.id));
                    }
                } else {
                    const res = await API.get("/enrollments/my-courses");
                    if (active) setMyCourses(res.data.map(e => e.course).filter(Boolean));
                }
            } catch (err) {
                if (active) setLoadError(err.response?.data?.message || "Unable to load courses.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadData();
        return () => { active = false; };
    }, [catalog, isStaff, refreshKey]);

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

    if (loading) return <div className="page-content dashboard-loading" role="status">Loading courses...</div>;
    if (loadError) return <div className="page-content"><p className="dashboard-alert" role="alert">{loadError}</p></div>;

    if (catalog && !isStaff) {
        const normalizedSearch = search.trim().toLowerCase();
        const visibleCourses = myCourses.filter((course) => {
            const matchesSearch = `${course.title} ${course.description} ${course.lecturer?.fullName || ""}`
                .toLowerCase()
                .includes(normalizedSearch);
            const matchesFilter = catalogFilter === "all" || enrolledCourseIds.includes(course.id);
            return matchesSearch && matchesFilter;
        });

        return (
            <div className="page-content catalog-page">
                <header className="catalog-header">
                    <div>
                        <p className="eyebrow">LEARN SOMETHING NEW</p>
                        <h1>Course catalog</h1>
                        <p className="subtitle">Explore courses available on SmartCampus and find your next class.</p>
                    </div>
                    <span className="catalog-count">{myCourses.length} {myCourses.length === 1 ? "course" : "courses"}</span>
                </header>

                <div className="catalog-controls">
                    <label className="catalog-search">
                        <FaSearch aria-hidden="true" />
                        <span className="sr-only">Search courses</span>
                        <input
                            type="search"
                            placeholder="Search course, topic, or lecturer"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    <div className="catalog-filters" role="group" aria-label="Filter courses">
                        <button
                            type="button"
                            className={catalogFilter === "all" ? "catalog-filter active" : "catalog-filter"}
                            aria-pressed={catalogFilter === "all"}
                            onClick={() => setCatalogFilter("all")}
                        >
                            All courses
                        </button>
                        <button
                            type="button"
                            className={catalogFilter === "enrolled" ? "catalog-filter active" : "catalog-filter"}
                            aria-pressed={catalogFilter === "enrolled"}
                            onClick={() => setCatalogFilter("enrolled")}
                        >
                            My courses
                        </button>
                    </div>
                </div>

                {visibleCourses.length ? (
                    <div className="catalog-grid">
                        {visibleCourses.map((course, index) => {
                            const isEnrolled = enrolledCourseIds.includes(course.id);
                            return (
                                <article className={`catalog-card course-accent-${index % 3}`} key={course.id}>
                                    <div className="catalog-card-art"><FaBookOpen /></div>
                                    <div className="catalog-card-content">
                                        <div className="catalog-card-meta">
                                            <span>SMARTCAMPUS COURSE</span>
                                            {isEnrolled && <span className="enrolled-badge">Enrolled</span>}
                                        </div>
                                        <h2>{course.title}</h2>
                                        <p className="catalog-description">{course.description}</p>
                                        <p className="catalog-lecturer">
                                            Lecturer <strong>{course.lecturer?.fullName || "SmartCampus faculty"}</strong>
                                        </p>
                                        <Link
                                            to={isEnrolled ? `/courses/${course.id}` : "/join"}
                                            className="catalog-link"
                                        >
                                            {isEnrolled ? "Open classroom" : "Join a class"}
                                            <FaArrowRight aria-hidden="true" />
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="catalog-empty">
                        <FaSearch aria-hidden="true" />
                        <h2>{myCourses.length ? "No courses match your search" : "No courses are available yet"}</h2>
                        <p>{myCourses.length
                            ? "Try another course name, topic, or lecturer."
                            : "When lecturers publish courses, you can explore them here."}</p>
                    </div>
                )}
            </div>
        );
    }

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