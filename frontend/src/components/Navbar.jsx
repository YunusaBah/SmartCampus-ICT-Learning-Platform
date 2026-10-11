import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBars, FaBell, FaMoon, FaSignOutAlt, FaSun, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import API from "../services/api";
import { readProfilePicture } from "../utils/profilePicture";
import { readNotificationBadge } from "../utils/settingsPreferences";

const Navbar = ({ toggle, theme, toggleTheme }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profilePicture, setProfilePicture] = useState(() => readProfilePicture(user?.id));
    const [showNotificationBadge, setShowNotificationBadge] = useState(() => readNotificationBadge(user?.id));
    const [notifications, setNotifications] = useState([]);
    const [notificationError, setNotificationError] = useState("");
    const [notificationLoading, setNotificationLoading] = useState(true);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutError, setLogoutError] = useState("");
    const profileRef = useRef(null);

    useEffect(() => {
        const updateProfilePicture = () => setProfilePicture(readProfilePicture(user?.id));
        updateProfilePicture();
        window.addEventListener("smartcampus:profile-picture-updated", updateProfilePicture);
        return () => window.removeEventListener("smartcampus:profile-picture-updated", updateProfilePicture);
    }, [user?.id]);

    useEffect(() => {
        const updateBadgePreference = () => setShowNotificationBadge(readNotificationBadge(user?.id));
        updateBadgePreference();
        window.addEventListener("smartcampus:notification-preference-updated", updateBadgePreference);
        return () => window.removeEventListener("smartcampus:notification-preference-updated", updateBadgePreference);
    }, [user?.id]);

    useEffect(() => {
        let active = true;
        API.get("/notifications")
            .then((response) => {
                if (active) setNotifications(response.data);
            })
            .catch((error) => {
                if (active) setNotificationError(error.response?.data?.message || "Unable to load notifications.");
            })
            .finally(() => {
                if (active) setNotificationLoading(false);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setProfileOpen(false);
                setNotificationsOpen(false);
            }
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    const markRead = async (notification) => {
        if (notification.readAt) return;
        try {
            const response = await API.patch(`/notifications/${notification.id}/read`);
            setNotifications((items) => items.map((item) =>
                item.id === notification.id ? response.data : item
            ));
        } catch (error) {
            setNotificationError(error.response?.data?.message || "Unable to mark notification as read.");
        }
    };

    const markAllRead = async () => {
        try {
            await API.patch("/notifications/read-all");
            const readAt = new Date().toISOString();
            setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })));
        } catch (error) {
            setNotificationError(error.response?.data?.message || "Unable to mark notifications as read.");
        }
    };

    const unreadCount = notifications.filter((notification) => !notification.readAt).length;

    const handleLogout = async () => {
        setLogoutError("");
        let logoutMessage = "Logged out successfully.";
        try {
            await API.post("/auth/logout");
        } catch (error) {
            logoutMessage = error.response?.data?.message
                ? "Logged out on this device. Server session revocation failed."
                : "Logged out on this device. Server session revocation could not be confirmed.";
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("smartcampus:account-changed"));
            navigate("/login", { replace: true, state: { message: logoutMessage } });
        }
    };

    return (
        <div className="navbar">
            <button
                type="button"
                className="navbar-menu"
                aria-label="Toggle sidebar"
                onClick={toggle}
            >
                <FaBars aria-hidden="true" />
            </button>
            <h2>SmartCampus LMS</h2>
            <div className="navbar-actions">
                <div className="notification-control">
                    <button
                        type="button"
                        className="notification-toggle"
                        aria-label={`Notifications${showNotificationBadge && unreadCount ? `, ${unreadCount} unread` : ""}`}
                        aria-expanded={notificationsOpen}
                        onClick={() => setNotificationsOpen((current) => !current)}
                    >
                        <FaBell aria-hidden="true" />
                        {showNotificationBadge && unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    {notificationsOpen && (
                        <section className="notification-popover" aria-label="Notifications">
                            <header>
                                <div><strong>Notifications</strong><span>{unreadCount} unread</span></div>
                                {unreadCount > 0 && (
                                    <button type="button" onClick={markAllRead}>Mark all read</button>
                                )}
                            </header>
                            {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
                            <div className="notification-list">
                                {notifications.length ? notifications.slice(0, 8).map((notification) => (
                                    <button
                                        type="button"
                                        className={notification.readAt ? "notification-item" : "notification-item unread"}
                                        key={notification.id}
                                        onClick={() => markRead(notification)}
                                    >
                                        <span className="notification-dot" aria-hidden="true" />
                                        <span><strong>{notification.title}</strong><small>{notification.body}</small><time>{new Date(notification.createdAt).toLocaleString()}</time></span>
                                    </button>
                                )) : notificationLoading ? (
                                    <p className="notification-empty" role="status">Loading notifications...</p>
                                ) : !notificationError ? (
                                    <p className="notification-empty">No new notifications.</p>
                                ) : null}
                            </div>
                            <Link to="/announcements" onClick={() => setNotificationsOpen(false)}>Open announcements</Link>
                        </section>
                    )}
                </div>
                <button
                    type="button"
                    className="theme-toggle"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    aria-pressed={theme === "dark"}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    onClick={toggleTheme}
                >
                    {theme === "dark" ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
                </button>
                <div className="navbar-profile-control" ref={profileRef}>
                    <button
                        type="button"
                        className="navbar-profile-toggle"
                        aria-expanded={profileOpen}
                        aria-label={`Profile menu for ${user?.fullName || user?.email || "your account"}`}
                        onClick={() => setProfileOpen((current) => !current)}
                    >
                        {profilePicture ? (
                            <img src={profilePicture} alt="" />
                        ) : (
                            <FaUserCircle aria-hidden="true" />
                        )}
                    </button>
                    {profileOpen && (
                        <section className="navbar-profile-menu" aria-label="Account menu">
                            {logoutError && <span className="navbar-profile-error" role="alert">{logoutError}</span>}
                            <Link to="/settings/profile" onClick={() => setProfileOpen(false)}>Edit profile</Link>
                            <button type="button" onClick={handleLogout}>
                                <FaSignOutAlt aria-hidden="true" /> Log out
                            </button>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
