import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaBell, FaMoon, FaSun } from "react-icons/fa";
import API from "../services/api";

const Navbar = ({ toggle, theme, toggleTheme }) => {
    const [notifications, setNotifications] = useState([]);
    const [notificationError, setNotificationError] = useState("");
    const [notificationLoading, setNotificationLoading] = useState(true);
    const [open, setOpen] = useState(false);

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
                        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                        aria-expanded={open}
                        onClick={() => setOpen((current) => !current)}
                    >
                        <FaBell aria-hidden="true" />
                        {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    {open && (
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
                                    <p className="notification-empty">You're all caught up. New course updates will appear here.</p>
                                ) : null}
                            </div>
                            <Link to="/announcements" onClick={() => setOpen(false)}>Open announcements</Link>
                        </section>
                    )}
                </div>
            </div>
            <button
                type="button"
                className="theme-toggle"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-pressed={theme === "light"}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                onClick={toggleTheme}
            >
                {theme === "dark" ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
        </div>
    );
};

export default Navbar;
