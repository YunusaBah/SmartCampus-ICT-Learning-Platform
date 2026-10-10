import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    FaBookOpen,
    FaChartBar,
    FaClipboardList,
    FaCog,
    FaGraduationCap,
    FaHome,
    FaCalendarAlt,
    FaBell,
    FaUsers,
    FaQuestionCircle
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import API from "../services/api";

const Sidebar = ({ open, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isStaff } = useAuth();
    const [profileUser, setProfileUser] = useState(user);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutError, setLogoutError] = useState("");
    const courseId = location.pathname.match(/^\/courses\/([^/]+)$/)?.[1];
    const activeCourseSection = new URLSearchParams(location.search).get("section") || "materials";
    const courseSections = [
        ["overview", "Overview", <FaChartBar />],
        ["materials", "Materials", <FaBookOpen />],
        ...(isStaff ? [["students", "Students", <FaUsers />]] : []),
        ["assignments", "Assignment", <FaClipboardList />],
        ["quizzes", "Quizes", <FaQuestionCircle />],
        ...(isStaff ? [["grading", "Grading", <FaChartBar />]] : []),
        ...(!isStaff ? [["grades", "Grades", <FaChartBar />]] : []),
        ["calendar", "Calendar", <FaCalendarAlt />],
        ["announcements", "Announcements", <FaBell />]
    ];

    useEffect(() => {
        const refreshProfile = () => {
            try {
                setProfileUser(JSON.parse(localStorage.getItem("user") || "null"));
            } catch {
                setProfileUser(null);
            }
        };
        window.addEventListener("smartcampus:user-updated", refreshProfile);
        return () => window.removeEventListener("smartcampus:user-updated", refreshProfile);
    }, []);

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose?.();
    };

    const handleLogout = async () => {
        setLogoutError("");
        let logoutMessage = "Logged out successfully.";
        try {
            await API.post("/auth/logout");
        } catch (error) {
            logoutMessage = error.response?.data?.message
                ? `Logged out on this device, but the server could not confirm session revocation: ${error.response.data.message}`
                : "Logged out on this device. Server session revocation could not be confirmed.";
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("smartcampus:account-changed"));
            navigate("/login", { replace: true, state: { message: logoutMessage } });
        }
    };

    const link = (to, label, icon) => (
        <li key={to}>
            <NavLink
                to={to}
                end={to === "/courses"}
                className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                onClick={handleNavClick}
            >
                <span className="nav-link-icon">{icon}</span>
                <span>{label}</span>
            </NavLink>
        </li>
    );

    return (
        <aside className={open ? "sidebar" : "sidebar closed"}>
            <div className="sidebar-brand">
                <button
                    type="button"
                    className="sidebar-profile-toggle"
                    aria-expanded={profileOpen}
                    aria-label="Open profile menu"
                    onClick={() => setProfileOpen((current) => !current)}
                >
                    <span className="brand-mark"><FaGraduationCap /></span>
                    <span className="sidebar-brand-copy">
                        <strong>SmartCampus</strong>
                        <span>LEARNING PLATFORM</span>
                        <b>{profileUser?.fullName || "SmartCampus user"}</b>
                    </span>
                </button>
                {profileOpen && (
                    <div className="sidebar-profile-menu">
                        <strong>{profileUser?.fullName || "SmartCampus user"}</strong>
                        <span>{profileUser?.email || ""}</span>
                        <span className="sidebar-profile-role">{profileUser?.role || ""}</span>
                        {logoutError && <span role="alert">{logoutError}</span>}
                        {profileUser?.passwordLoginEnabled !== false && (
                            <Link to="/settings#security" onClick={() => {
                                setProfileOpen(false);
                                handleNavClick();
                            }}>Change password</Link>
                        )}
                        <button type="button" onClick={handleLogout}>Log out</button>
                    </div>
                )}
            </div>

            <nav>
                <ul>
                    {link("/dashboard", "Home", <FaHome />)}
                    {link("/courses", "Courses", <FaBookOpen />)}
                    {courseId && (
                        <>
                            {courseSections.map(([section, label, icon]) => (
                                <li key={section}>
                                    <Link
                                        to={section === "grades" ? "/grades" : `${location.pathname}?section=${section}`}
                                        className={section === "grades"
                                            ? location.pathname === "/grades" ? "nav-link active" : "nav-link"
                                            : activeCourseSection === section || (section === "grading" && activeCourseSection === "gradebook") ? "nav-link active" : "nav-link"}
                                        aria-current={section === "grades"
                                            ? location.pathname === "/grades" ? "page" : undefined
                                            : activeCourseSection === section || (section === "grading" && activeCourseSection === "gradebook") ? "page" : undefined}
                                        onClick={handleNavClick}
                                    >
                                        <span className="nav-link-icon">{icon}</span>
                                        <span>{label}</span>
                                    </Link>
                                </li>
                            ))}
                        </>
                    )}
                    {!courseId && (
                        <>
                            <li>
                                <Link to="/materials" className={location.pathname === "/materials" ? "nav-link active" : "nav-link"} onClick={handleNavClick}>
                                    <span className="nav-link-icon"><FaBookOpen /></span>
                                    <span>Materials</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/quizzes" className={location.pathname === "/quizzes" ? "nav-link active" : "nav-link"} onClick={handleNavClick}>
                                    <span className="nav-link-icon"><FaQuestionCircle /></span>
                                    <span>Quizes</span>
                                </Link>
                            </li>
                            {isStaff && link("/students", "Students", <FaUsers />)}
                            {!isStaff && link("/grades", "Grades", <FaChartBar />)}
                            {isStaff && (
                                <li>
                                    <Link to="/assignments" className={location.pathname === "/assignments" ? "nav-link active" : "nav-link"} onClick={handleNavClick}>
                                        <span className="nav-link-icon"><FaChartBar /></span>
                                        <span>Grading</span>
                                    </Link>
                                </li>
                            )}
                            {!isStaff && link("/assignments", "Assignment", <FaClipboardList />)}
                            {link("/calendar", "Calendar", <FaCalendarAlt />)}
                            {link("/announcements", "Announcements", <FaBell />)}
                        </>
                    )}
                    {link("/settings", "Settings", <FaCog />)}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;