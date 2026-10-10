import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaBullhorn } from "react-icons/fa";
import API from "../services/api";

const positiveEmojis = ["👍", "❤️", "🎉", "👏", "😊", "🙌", "💯", "✅", "🤩", "🚀"];

const AnnouncementCard = ({ announcement, isStaff, actions }) => {
    const [expanded, setExpanded] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activity, setActivity] = useState({ viewers: [], reactions: [] });
    const [activityError, setActivityError] = useState("");
    const longPressTimer = useRef(null);
    const longPressTriggered = useRef(false);

    const loadActivity = async () => {
        setActivityError("");
        try {
            const response = await API.get(`/announcements/${announcement.id}/activity`);
            setActivity(response.data);
        } catch (error) {
            setActivityError(error.response?.data?.message || "Unable to load announcement activity.");
        }
    };

    const openDetails = async () => {
        if (!expanded) {
            setExpanded(true);
            if (!isStaff) {
                try {
                    await API.post(`/announcements/${announcement.id}/view`);
                } catch (error) {
                    setActivityError(error.response?.data?.message || "Unable to record this announcement view.");
                }
            }
            await loadActivity();
        } else {
            setExpanded(false);
        }
    };

    const react = async (emoji) => {
        try {
            await API.put(`/announcements/${announcement.id}/reaction`, { emoji });
            setPickerOpen(false);
            await loadActivity();
        } catch (error) {
            setActivityError(error.response?.data?.message || "Unable to save your reaction.");
        }
    };

    const clearLongPress = () => {
        if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    };

    useEffect(() => () => {
        if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    }, []);

    return (
        <article
            className="announcement-card announcement-interactive-card"
            onContextMenu={(event) => {
                event.preventDefault();
                setPickerOpen(true);
            }}
            onPointerDown={(event) => {
                if (event.pointerType !== "touch") return;
                longPressTriggered.current = false;
                longPressTimer.current = window.setTimeout(() => {
                    longPressTriggered.current = true;
                    setPickerOpen(true);
                }, 550);
            }}
            onPointerUp={clearLongPress}
            onPointerCancel={clearLongPress}
            onPointerLeave={clearLongPress}
            onClickCapture={(event) => {
                if (longPressTriggered.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    longPressTriggered.current = false;
                }
            }}
        >
            <span className="announcement-icon" aria-hidden="true"><FaBullhorn /></span>
            <div className="announcement-copy">
                <div className="announcement-meta">
                    {announcement.courseTitle && announcement.courseId
                        ? <Link to={`/courses/${announcement.courseId}`}>{announcement.courseTitle}</Link>
                        : <span>{announcement.course?.title || "Course announcement"}</span>}
                    <time>{new Date(announcement.createdAt).toLocaleString()}</time>
                </div>
                <button type="button" className="announcement-title-button" onClick={openDetails} aria-expanded={expanded}>
                    <span>{announcement.title}</span>
                </button>
                <span className="announcement-author">
                    Posted by {announcement.author?.fullName || "Course staff"}
                    {announcement.authorRoleName && ` · ${announcement.authorRoleName}`}
                </span>
                <button type="button" className="announcement-react-trigger" onClick={() => setPickerOpen((open) => !open)}>
                    Add reaction
                </button>
                {pickerOpen && (
                    <div className="announcement-emoji-picker" role="group" aria-label="Choose a positive reaction">
                        {positiveEmojis.map((emoji) => (
                            <button key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => react(emoji)}>
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
                {activity.reactions.length > 0 && (
                    <div className="announcement-reaction-list" aria-label="Announcement reactions">
                        {activity.reactions.map(({ emoji, users }) => (
                            <button
                                key={emoji}
                                type="button"
                                title={users.map((user) => user.fullName).join(", ")}
                                aria-label={`React with ${emoji}; ${users.length} reactions`}
                                onClick={() => react(emoji)}
                            >
                                {emoji} {users.length}
                            </button>
                        ))}
                    </div>
                )}
                {expanded && (
                    <div className="announcement-details">
                        <p>{announcement.body}</p>
                        {activityError && <p className="announcement-activity-error" role="alert">{activityError}</p>}
                        <section aria-label="Announcement views">
                            <strong>Seen by {activity.viewers.length}</strong>
                            {activity.viewers.length > 0 && (
                                <ul>
                                    {activity.viewers.map((viewer) => (
                                        <li key={viewer.id}>
                                            {viewer.fullName}{viewer.roleName ? ` · ${viewer.roleName}` : ""}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        {activity.reactions.length > 0 && (
                            <section aria-label="People who reacted">
                                <strong>Reactions</strong>
                                <ul>
                                    {activity.reactions.map(({ emoji, users }) => (
                                        <li key={emoji}>{emoji} — {users.map((user) => user.fullName).join(", ")}</li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {actions}
                    </div>
                )}
            </div>
        </article>
    );
};

export default AnnouncementCard;
