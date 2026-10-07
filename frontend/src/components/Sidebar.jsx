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
        window.dispatchEvent(new Event("smartcampus:account-changed"));
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
                <div className="sidebar-brand-copy">
                    <strong>SmartCampus</strong>
                    <span>LEARNING PLATFORM</span>
                    <b>{profileUser?.fullName || "SmartCampus user"}</b>
                </div>
            </div>

            <nav>
                <ul>
                    {link("/dashboard", "Dashboard", <FaHome />)}
                    {isStudent && (
                        <>
                            {link("/courses", "My courses", <FaBookOpen />)}
                            {link("/catalog", "Course catalog", <FaCompass />)}
                            {link("/join", "Join a class", <FaDoorOpen />)}
                            {link("/assignments", "Assignments", <FaClipboardList />)}
                            {link("/todo", "To-do list", <FaClipboardList />)}
                            {link("/grades", "Grades", <FaChartBar />)}
                            {link("/calendar", "Calendar", <FaCalendarAlt />)}
                            {link("/messages", "Messages", <FaCommentDots />)}
                            {link("/announcements", "Announcements", <FaBell />)}
                            {link("/certificates", "Certificates", <FaAward />)}
                        </>
                    )}
                    {isStaff && (
                        <>
                            {link("/courses", "My courses", <FaBookOpen />)}
                            {link("/students", "My students", <FaUsers />)}
                            {link("/assignments", "Assignments & grading", <FaClipboardList />)}
                            {link("/calendar", "Calendar", <FaCalendarAlt />)}
                            {link("/announcements", "Announcements", <FaBell />)}
                        </>
                    )}
                    {link("/settings", "Settings", <FaCog />)}
                    <li>
                        <button type="button" className="nav-link link-btn" onClick={handleLogout}>
                            <span className="nav-link-icon"><FaDoorOpen /></span>
                            <span>Sign out</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;