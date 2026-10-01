import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Sidebar = ({ open, onClose }) => {
    const navigate = useNavigate();
    const { user, isStudent, isStaff, isAdmin } = useAuth();

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose?.();
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const link = (to, label, end = false) => (
        <li>
            <NavLink
                to={to}
                end={end}
                className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                onClick={handleNavClick}
            >
                {label}
            </NavLink>
        </li>
    );

    return (
        <aside className={open ? "sidebar" : "sidebar closed"}>
            <h3>SmartCampus</h3>
            <p className="role-badge">{user?.role}</p>

            <nav>
                <div className="sidebar-group">
                    <h4 className="sidebar-group-title">Overview</h4>
                    <ul>{link("/dashboard", "Dashboard")}</ul>
                </div>

                {isStudent && (
                    <div className="sidebar-group">
                        <h4 className="sidebar-group-title">Learning</h4>
                        <ul>
                            {link("/join", "+ Join a Class")}
                            {link("/courses", "My Classes", true)}
                            {link("/assignments", "Assignments")}
                            {link("/grades", "My Grades")}
                        </ul>
                    </div>
                )}

                {isStaff && (
                    <div className="sidebar-group">
                        <h4 className="sidebar-group-title">Teaching</h4>
                        <ul>
                            {link("/courses", "My Courses", true)}
                            {link("/students", "My Students")}
                            {link("/assignments", "Assignments & Grading")}
                        </ul>
                    </div>
                )}

                {isAdmin && (
                    <div className="sidebar-group">
                        <h4 className="sidebar-group-title">Administration</h4>
                        <ul>{link("/admin", "Admin Panel")}</ul>
                    </div>
                )}

                <div className="sidebar-group sidebar-account">
                    <h4 className="sidebar-group-title">Account</h4>
                    <ul>
                        <li>
                            <button type="button" className="nav-link link-btn" onClick={handleLogout}>
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;