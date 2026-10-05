import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    FaBookOpen,
    FaChartBar,
    FaClipboardList,
    FaCog,
    FaCompass,
    FaDoorOpen,
    FaGraduationCap,
    FaHome,
    FaCalendarAlt,
    FaCommentDots,
    FaBell,
    FaAward,
    FaUsers
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";

const Sidebar = ({ open, onClose }) => {
    const navigate = useNavigate();
    const { user, isStudent, isStaff } = useAuth();
    const [profileUser, setProfileUser] = useState(user);

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

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const link = (to, label, icon) => (
        <li key={to}>
            <NavLink
                to={to}
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
                <span className="brand-mark"><FaGraduationCap /></span>
                <div><strong>SmartCampus</strong><span>LEARNING PLATFORM</span></div>
            </div>

            <nav>
                <div className="sidebar-group">
                    <h4 className="sidebar-group-title">Workspace</h4>
                    <ul>{link("/dashboard", "Dashboard", <FaHome />)}</ul>
                </div>

                {isStudent && (
                    <div className="sidebar-group">
                        <h4 className="sidebar-group-title">Learning</h4>
                        <ul>
                            {link("/courses", "My courses", <FaBookOpen />)}
                            {link("/catalog", "Course catalog", <FaCompass />)}
                            {link("/join", "Join a class", <FaDoorOpen />)}
                            {link("/assignments", "Assignments", <FaClipboardList />)}
                            {link("/grades", "Grades", <FaChartBar />)}
                            {link("/calendar", "Calendar", <FaCalendarAlt />)}
                            {link("/messages", "Messages", <FaCommentDots />)}
                            {link("/announcements", "Announcements", <FaBell />)}
                            {link("/certificates", "Certificates", <FaAward />)}
                        </ul>
                    </div>
                )}

                {isStaff && (
                    <div className="sidebar-group">
                        <h4 className="sidebar-group-title">Teaching</h4>
                        <ul>
                            {link("/courses", "My courses", <FaBookOpen />)}
                            {link("/students", "My students", <FaUsers />)}
                            {link("/assignments", "Assignments & grading", <FaClipboardList />)}
                            {link("/calendar", "Calendar", <FaCalendarAlt />)}
                            {link("/messages", "Messages", <FaCommentDots />)}
                            {link("/announcements", "Announcements", <FaBell />)}
                        </ul>
                    </div>
                )}

            </nav>
            <div className="sidebar-account">
                <div className="sidebar-group-title">Account</div>
                <ul>
                    {link("/settings", "Settings", <FaCog />)}
                </ul>
                <div className="sidebar-user">
                    <span className="sidebar-avatar" aria-hidden="true">
                        {profileUser?.fullName?.trim().charAt(0)?.toUpperCase() || "S"}
                    </span>
                    <span className="sidebar-user-copy">
                        <strong>{profileUser?.fullName || "SmartCampus user"}</strong>
                        <span>{profileUser?.role || "Member"}</span>
                    </span>
                </div>
                <button type="button" className="nav-link link-btn" onClick={handleLogout}>
                    <span className="nav-link-icon"><FaDoorOpen /></span>
                    <span>Sign out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;