import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    FaArrowRight,
    FaBookOpen,
    FaClipboardList,
    FaClock,
    FaGraduationCap,
    FaUsers
} from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date to be confirmed";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

const Dashboard = () => {
    const { user, isStaff } = useAuth();
    const [stats, setStats] = useState(null);
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentTime] = useState(() => Date.now());

    useEffect(() => {
        let active = true;

        const loadDashboard = async () => {
            try {
                const [statsResponse, coursesResponse, assignmentsResponse] = await Promise.all([
                    API.get("/dashboard/stats"),
                    isStaff ? API.get("/courses/my") : API.get("/enrollments/my-courses"),
                    isStaff ? Promise.resolve({ data: [] }) : API.get("/assignments/my")
                ]);

                if (!active) return;
                setStats(statsResponse.data);
                setCourses(isStaff
                    ? coursesResponse.data
                    : coursesResponse.data.map((enrollment) => enrollment.course).filter(Boolean));
                setAssignments(assignmentsResponse.data);
            } catch (err) {
                if (active) setError(err.response?.data?.message || "Unable to load your dashboard.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadDashboard();
        return () => { active = false; };
    }, [isStaff]);

    if (loading) {
        return <div className="page-content dashboard-loading" role="status">Loading your learning space...</div>;
    }

    if (error) {
        return (
            <div className="page-content">
                <div className="dashboard-alert" role="alert">
                    <strong>We couldn't load your dashboard.</strong>
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    const upcomingAssignments = assignments
        .filter((assignment) => new Date(assignment.dueDate).getTime() >= currentTime)
        .slice(0, 4);
    const firstName = user?.fullName?.trim().split(/\s+/)[0] || "there";

    return (
        <div className="page-content dashboard-page">
            <header className="dashboard-welcome">
                <div>
                    <p className="eyebrow">{isStaff ? "TEACHING OVERVIEW" : "YOUR LEARNING SPACE"}</p>
                    <h1>Welcome back, {firstName}</h1>
                    <p className="subtitle">
                        {isStaff
                            ? "Here's a clear view of your courses and teaching activity."
                            : "Pick up where you left off, or see what's coming up next."}
                    </p>
                </div>
                <div className="welcome-mark" aria-hidden="true">
                    <FaGraduationCap />
                </div>
            </header>

            {isStaff ? (
                <>
                    <section className="dashboard-stats" aria-label="Teaching overview">
                        <div className="dashboard-stat">
                            <span className="stat-icon"><FaBookOpen /></span>
                            <div><span>My courses</span><strong>{stats.totalCourses}</strong></div>
                        </div>
                        <div className="dashboard-stat">
                            <span className="stat-icon"><FaUsers /></span>
                            <div><span>Students enrolled</span><strong>{stats.students}</strong></div>
                        </div>
                        <div className="dashboard-stat">
                            <span className="stat-icon"><FaClipboardList /></span>
                            <div><span>Assignments</span><strong>{stats.assignments}</strong></div>
                        </div>
                        <div className="dashboard-stat">
                            <span className="stat-icon stat-icon-warm"><FaClock /></span>
                            <div><span>To grade</span><strong>{stats.pendingGrades}</strong></div>
                        </div>
                    </section>

                    <section className="dashboard-section">
                        <div className="section-heading">
                            <div><p className="eyebrow">YOUR TEACHING</p><h2>My courses</h2></div>
                            <Link to="/courses" className="text-link">Manage courses <FaArrowRight /></Link>
                        </div>
                        {courses.length ? (
                            <div className="dashboard-course-grid">
                                {courses.slice(0, 3).map((course, index) => (
                                    <article className={`course-card course-accent-${index % 3}`} key={course.id}>
                                        <div className="course-card-icon"><FaBookOpen /></div>
                                        <p className="course-kicker">COURSE</p>
                                        <h3>{course.title}</h3>
                                        <p className="course-description">
                                            {course.description || "Open your classroom to manage course content and students."}
                                        </p>
                                        <Link className="course-card-link" to={`/courses/${course.id}`}>
                                            Manage course <FaArrowRight />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-empty">
                                <FaBookOpen />
                                <div><strong>Your courses will appear here</strong><span>Create a course to start teaching on SmartCampus.</span></div>
                                <Link to="/courses" className="btn btn-inline">Create a course</Link>
                            </div>
                        )}
                    </section>

                    <section className="dashboard-next-step">
                        <div className="next-step-icon"><FaClipboardList /></div>
                        <div>
                            <p className="eyebrow">NEXT UP</p>
                            <h2>{stats.pendingGrades ? `${stats.pendingGrades} submission${stats.pendingGrades === 1 ? "" : "s"} need your attention` : "You're all caught up"}</h2>
                            <p>{stats.pendingGrades ? "Review student work and keep feedback moving." : "New submissions will appear here when students turn in their work."}</p>
                        </div>
                        <Link to="/assignments" className="btn btn-inline">
                            Review submissions <FaArrowRight />
                        </Link>
                    </section>
                </>
            ) : (
                <>
                    <section className="student-focus">
                        <div className="focus-copy">
                            <p className="eyebrow">YOUR NEXT STEP</p>
                            <h2>{courses.length ? "Keep your learning momentum going." : "Your next chapter starts here."}</h2>
                            <p>{courses.length
                                ? "Open one of your classrooms to continue with lessons, quizzes, and course work."
                                : "Join a class with the code from your lecturer and your courses will show up here."}</p>
                            <Link to={courses.length ? "/courses" : "/join"} className="btn btn-inline">
                                {courses.length ? "Continue learning" : "Join a class"} <FaArrowRight />
                            </Link>
                        </div>
                        <div className="focus-art" aria-hidden="true"><FaGraduationCap /></div>
                    </section>

                    <section className="dashboard-stats student-stats" aria-label="Learning overview">
                        <div className="dashboard-stat">
                            <span className="stat-icon"><FaBookOpen /></span>
                            <div><span>My courses</span><strong>{stats.totalCourses}</strong></div>
                        </div>
                        <div className="dashboard-stat">
                            <span className="stat-icon"><FaClipboardList /></span>
                            <div><span>Assignments</span><strong>{stats.assignments}</strong></div>
                        </div>
                        <div className="dashboard-stat">
                            <span className="stat-icon"><FaGraduationCap /></span>
                            <div><span>Quiz average</span><strong>{stats.quizAverage}%</strong></div>
                        </div>
                    </section>

                    <div className="dashboard-columns">
                        <section className="dashboard-section">
                            <div className="section-heading">
                                <div><p className="eyebrow">PICK UP A CLASS</p><h2>My courses</h2></div>
                                <Link to="/courses" className="text-link">View all <FaArrowRight /></Link>
                            </div>
                            {courses.length ? (
                                <div className="course-list">
                                    {courses.slice(0, 4).map((course, index) => (
                                        <Link to={`/courses/${course.id}`} className="course-list-item" key={course.id}>
                                            <span className={`course-list-icon course-accent-${index % 3}`}><FaBookOpen /></span>
                                            <span className="course-list-copy">
                                                <strong>{course.title}</strong>
                                                <span>{course.description || "Your classroom is ready"}</span>
                                            </span>
                                            <FaArrowRight className="course-list-arrow" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="dashboard-empty">
                                    <FaBookOpen />
                                    <div><strong>No courses yet</strong><span>Join a class to start learning with your lecturer.</span></div>
                                </div>
                            )}
                        </section>

                        <section className="dashboard-section upcoming-section">
                            <div className="section-heading">
                                <div><p className="eyebrow">STAY ON TRACK</p><h2>Upcoming assignments</h2></div>
                                <Link to="/assignments" className="text-link">All work <FaArrowRight /></Link>
                            </div>
                            {upcomingAssignments.length ? (
                                <div className="upcoming-list">
                                    {upcomingAssignments.map((assignment) => (
                                        <Link
                                            to={`/courses/${assignment.courseId}`}
                                            className="upcoming-item"
                                            key={assignment.id}
                                        >
                                            <span className="upcoming-date">{formatDate(assignment.dueDate)}</span>
                                            <span className="upcoming-copy">
                                                <strong>{assignment.title}</strong>
                                                <span>{assignment.course?.title || "Course assignment"}</span>
                                            </span>
                                            <FaArrowRight className="course-list-arrow" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="upcoming-empty">
                                    <FaClock />
                                    <strong>Nothing due soon</strong>
                                    <span>New assignments from your courses will show up here.</span>
                                </div>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
