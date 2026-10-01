import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
    const { user, isStaff } = useAuth();
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        API.get("/dashboard/stats")
            .then((res) => setStats(res.data))
            .catch((err) => setError(err.response?.data?.message || "Failed to load stats"));
    }, []);

    if (error) return (
        <div className="page-content">
            <p style={{ color: "#ff6b6b" }}>{error}</p>
        </div>
    );

    if (!stats) return <div className="page-content"><p>Loading dashboard...</p></div>;

    /* ── LECTURER DASHBOARD ── */
    if (isStaff) {
        return (
            <div className="page-content">
                <h1>Welcome, {user?.fullName}</h1>
                <p className="subtitle">Lecturer dashboard</p>

                <div className="card-grid">
                    <div className="card">
                        <h3>My Courses</h3>
                        <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.totalCourses}</p>
                    </div>
                    <div className="card">
                        <h3>Students Enrolled</h3>
                        <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.students}</p>
                    </div>
                    <div className="card">
                        <h3>Assignments</h3>
                        <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.assignments}</p>
                    </div>
                    <div className="card">
                        <h3>Pending Grades</h3>
                        <p style={{ fontSize: "2rem", fontWeight: 700, color: stats.pendingGrades > 0 ? "#f0a500" : "var(--theme-text)" }}>
                            {stats.pendingGrades}
                        </p>
                    </div>
                </div>

                <div className="action-bar">
                    <Link to="/courses" className="btn btn-inline">Manage Courses</Link>
                    <Link to="/assignments" className="btn btn-inline btn-secondary">
                        Assignments & Grading
                    </Link>
                </div>
            </div>
        );
    }

    /* ── STUDENT DASHBOARD ── */
    return (
        <div className="page-content">
            <h1>Welcome, {user?.fullName}</h1>
            <p className="subtitle">Student dashboard</p>

            <div className="card-grid">
                <div className="card">
                    <h3>Enrolled Courses</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.totalCourses}</p>
                </div>
                <div className="card">
                    <h3>Assignments</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.assignments}</p>
                </div>
                <div className="card">
                    <h3>Quiz Average</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.quizAverage}%</p>
                </div>
                <div className="card">
                    <h3>Graded Work</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.gradedAssignments || 0}</p>
                </div>
            </div>

            <div className="action-bar">
                <Link to="/courses" className="btn btn-inline">Browse Courses</Link>
                <Link to="/my-courses" className="btn btn-inline btn-secondary">My Courses</Link>
                <Link to="/grades" className="btn btn-inline btn-secondary">My Grades</Link>
            </div>
        </div>
    );
};

export default Dashboard;