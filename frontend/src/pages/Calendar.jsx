import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const Calendar = () => {
    const { isStaff } = useAuth();
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [events, setEvents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState({ courseId: "", eventType: "class", title: "", description: "", startsAt: "", endsAt: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        let active = true;
        const from = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1)).toISOString();
        const to = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 1)).toISOString();
        API.get("/calendar", { params: { from, to } })
            .then((response) => {
                if (!active) return;
                setEvents(response.data);
                setError("");
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Unable to load your calendar.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [month]);

    useEffect(() => {
        if (!isStaff) return;
        API.get("/courses/my")
            .then((response) => setCourses(response.data))
            .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load course list."));
    }, [isStaff]);

    const createEvent = async (event) => {
        event.preventDefault();
        setStatus("");
        try {
            await API.post(`/courses/${form.courseId}/calendar`, {
                eventType: form.eventType,
                title: form.title,
                description: form.description,
                startsAt: new Date(form.startsAt).toISOString(),
                endsAt: new Date(form.endsAt).toISOString()
            });
            setForm((current) => ({ ...current, title: "", description: "", startsAt: "", endsAt: "" }));
            setStatus("Calendar event created.");
            const from = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1)).toISOString();
            const to = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 1)).toISOString();
            const response = await API.get("/calendar", { params: { from, to } });
            setEvents(response.data);
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || "Unable to create calendar event.");
        }
    };

    const changeMonth = (offset) => {
        setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    };

    return (
        <div className="page-content feature-page">
            <header className="feature-page-header">
                <div>
                    <p className="eyebrow">PLAN YOUR LEARNING</p>
                    <h1>Calendar</h1>
                    <p className="subtitle">Course events and assignment due dates in one place.</p>
                </div>
                <span className="grades-header-icon"><FaCalendarAlt /></span>
            </header>

            {isStaff && (
                <details className="feature-create-panel">
                    <summary>Create course event</summary>
                    <form className="feature-form-grid" onSubmit={createEvent}>
                        <label>Course
                            <select required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
                                <option value="">Choose a course</option>
                                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                            </select>
                        </label>
                        <label>Type
                            <select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })}>
                                <option value="class">Class</option><option value="exam">Exam</option>
                                <option value="deadline">Deadline</option><option value="event">Event</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                        <label>Title<input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                        <label>Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                        <label>Starts<input type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
                        <label>Ends<input type="datetime-local" required value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
                        <button className="btn btn-inline" type="submit">Add event</button>
                        {status && <p role="status" className="feature-status">{status}</p>}
                    </form>
                </details>
            )}

            <section className="calendar-panel">
                <div className="calendar-toolbar">
                    <h2>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</h2>
                    <div>
                        <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><FaChevronLeft /></button>
                        <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><FaChevronRight /></button>
                    </div>
                </div>
                {loading ? <p className="dashboard-loading" role="status">Loading your calendar...</p> : error ? (
                    <div className="dashboard-alert" role="alert">{error}</div>
                ) : events.length ? (
                    <div className="calendar-event-list">
                        {events.map((event) => (
                            <article className="calendar-event" key={event.id}>
                                <span className={`calendar-type type-${event.type}`}>{event.type}</span>
                                <div>
                                    <strong>{event.title}</strong>
                                    <span>{event.courseTitle}</span>
                                    {event.description && <p>{event.description}</p>}
                                </div>
                                <time><FaClock aria-hidden="true" />{new Date(event.startsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
                                {event.type === "assignment" && <Link to={`/courses/${event.courseId}`}>Open course</Link>}
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="feature-empty"><FaCalendarAlt /><strong>No events this month</strong><span>Course deadlines and scheduled events will appear here.</span></div>
                )}
            </section>
        </div>
    );
};

export default Calendar;
