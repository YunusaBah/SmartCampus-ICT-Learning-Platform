import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const eventKinds = ["class", "exam", "deadline", "assignment", "assessment", "quiz", "event", "other"];
const localDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const Calendar = () => {
    const { isStaff } = useAuth();
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(() => localDateValue(new Date()));
    const [events, setEvents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [assessmentOptions, setAssessmentOptions] = useState({ key: "", items: [] });
    const [form, setForm] = useState({
        courseId: "", eventType: "class", assessmentId: "", title: "", description: "", startsAt: "", endsAt: ""
    });
    const [reschedule, setReschedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
    const assessmentKey = `${form.courseId}:${form.eventType}`;
    const assessments = assessmentOptions.key === assessmentKey ? assessmentOptions.items : [];

    const loadEvents = async () => {
        try {
            const response = await API.get("/calendar", { params: { from: monthStart, to: monthEnd } });
            setEvents(response.data);
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load your calendar.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        API.get("/calendar", { params: { from: monthStart, to: monthEnd } })
            .then((response) => {
                if (active) {
                    setEvents(response.data);
                    setError("");
                }
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Unable to load your calendar.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [monthStart, monthEnd]);

    useEffect(() => {
        if (!isStaff) return;
        API.get("/courses/my")
            .then((response) => setCourses(response.data))
            .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load course list."));
    }, [isStaff]);

    useEffect(() => {
        if (!isStaff || !form.courseId || !["assessment", "quiz"].includes(form.eventType)) {
            return;
        }
        let active = true;
        API.get(`/quizzes/assessments/course/${form.courseId}`)
            .then((response) => {
                if (active) setAssessmentOptions({ key: assessmentKey, items: response.data });
            })
            .catch((requestError) => {
                if (active) setStatus(requestError.response?.data?.message || "Unable to load course assessments.");
            });
        return () => { active = false; };
    }, [assessmentKey, form.courseId, form.eventType, isStaff]);

    const eventsByDay = useMemo(() => events.reduce((map, event) => {
        const key = localDateValue(new Date(event.startsAt));
        map.set(key, [...(map.get(key) || []), event]);
        return map;
    }, new Map()), [events]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
        const gridStart = new Date(firstDay);
        gridStart.setDate(firstDay.getDate() - firstDay.getDay());
        return Array.from({ length: 42 }, (_, index) => {
            const day = new Date(gridStart);
            day.setDate(gridStart.getDate() + index);
            return day;
        });
    }, [month]);

    const selectedEvents = eventsByDay.get(selectedDay) || [];

    const createEvent = async (event) => {
        event.preventDefault();
        setStatus("");
        try {
            if (form.eventType === "assignment") {
                await API.post("/assignments", {
                    courseId: Number(form.courseId),
                    title: form.title,
                    description: form.description,
                    dueDate: new Date(form.startsAt).toISOString()
                });
            } else {
                await API.post(`/courses/${form.courseId}/calendar`, {
                    eventType: form.eventType,
                    assessmentId: ["assessment", "quiz"].includes(form.eventType) ? Number(form.assessmentId) : null,
                    title: form.title,
                    description: form.description,
                    startsAt: new Date(form.startsAt).toISOString(),
                    endsAt: new Date(form.endsAt).toISOString()
                });
            }
            setForm((current) => ({ ...current, assessmentId: "", title: "", description: "", startsAt: "", endsAt: "" }));
            setStatus(form.eventType === "assignment" ? "Assignment and due date scheduled." : "Calendar event scheduled.");
            await loadEvents();
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || "Unable to schedule this calendar item.");
        }
    };

    const saveDueDate = async (assignmentId) => {
        const dueDate = reschedule[assignmentId];
        if (!dueDate) {
            setStatus("Choose an extended due date first.");
            return;
        }
        try {
            await API.patch(`/assignments/${assignmentId}`, { dueDate });
            setStatus("Assignment due date updated for the course.");
            await loadEvents();
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || "Unable to reschedule assignment.");
        }
    };

    const changeMonth = (offset) => {
        const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
        setLoading(true);
        setMonth(next);
        setSelectedDay(localDateValue(next));
    };

    const changeYear = (year) => {
        const next = new Date(Number(year), month.getMonth(), 1);
        setLoading(true);
        setMonth(next);
        setSelectedDay(localDateValue(next));
    };

    return (
        <div className="page-content feature-page">
            <header className="feature-page-header">
                <div>
                    <p className="eyebrow">PLAN YOUR LEARNING</p>
                    <h1>Calendar</h1>
                    <p className="subtitle">{isStaff
                        ? "Schedule course events, assignments, and assessment dates."
                        : "View course schedules, deadlines, and assessment dates."}</p>
                </div>
                <span className="grades-header-icon"><FaCalendarAlt /></span>
            </header>

            {isStaff && (
                <details className="feature-create-panel">
                    <summary>Schedule course activity</summary>
                    <form className="feature-form-grid" onSubmit={createEvent}>
                        <label>Course
                            <select required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value, assessmentId: "" })}>
                                <option value="">Choose a course</option>
                                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                            </select>
                        </label>
                        <label>Activity type
                            <select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value, assessmentId: "" })}>
                                {eventKinds.map((kind) => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}
                            </select>
                        </label>
                        {["assessment", "quiz"].includes(form.eventType) && <label>Timed assessment
                            <select required value={form.assessmentId} onChange={(event) => {
                                const assessment = assessments.find((item) => String(item.id) === event.target.value);
                                setForm((current) => ({
                                    ...current,
                                    assessmentId: event.target.value,
                                    title: assessment?.title || current.title
                                }));
                            }}>
                                <option value="">Choose an assessment</option>
                                {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
                            </select>
                        </label>}
                        <label>Title<input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                        {form.eventType === "assignment" ? <>
                            <label>Assignment instructions<textarea required rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                            <label>Due date<input type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
                        </> : <>
                            <label>Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                            <label>Starts<input type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
                            <label>Ends<input type="datetime-local" required value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
                        </>}
                        <button className="btn btn-inline" type="submit">Schedule</button>
                        {status && <p role="status" className="feature-status">{status}</p>}
                    </form>
                </details>
            )}

            {error && <div className="dashboard-alert" role="alert">{error}</div>}
            <section className="calendar-panel">
                <div className="calendar-toolbar">
                    <div className="calendar-heading">
                        <h2>{new Intl.DateTimeFormat(undefined, { month: "long" }).format(month)}</h2>
                        <label className="calendar-year-picker">
                            <span className="sr-only">Calendar year</span>
                            <select aria-label="Calendar year" value={month.getFullYear()} onChange={(event) => changeYear(event.target.value)}>
                                {Array.from({ length: 21 }, (_, index) => month.getFullYear() - 10 + index)
                                    .map((year) => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="calendar-navigation">
                        <button type="button" onClick={() => {
                            const today = new Date();
                            setLoading(true);
                            setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                            setSelectedDay(localDateValue(today));
                        }}>Today</button>
                        <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><FaChevronLeft /></button>
                        <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><FaChevronRight /></button>
                    </div>
                </div>
                {loading ? <p className="dashboard-loading" role="status">Loading your calendar...</p> : <>
                    <div className="calendar-month-grid" role="grid" aria-label={new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((weekday) => (
                            <div role="columnheader" className="calendar-weekday" key={weekday}>{weekday}</div>
                        ))}
                        {calendarDays.map((day) => {
                            const key = localDateValue(day);
                            const dayEvents = eventsByDay.get(key) || [];
                            const currentMonth = day.getMonth() === month.getMonth();
                            return (
                                <button
                                    type="button"
                                    role="gridcell"
                                    key={key}
                                    aria-label={`${new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(day)}${dayEvents.length ? `, ${dayEvents.length} scheduled item(s)` : ""}`}
                                    aria-pressed={selectedDay === key}
                                    className={`calendar-day${currentMonth ? "" : " outside-month"}${selectedDay === key ? " selected" : ""}${dayEvents.length ? " has-events" : ""}`}
                                    onClick={() => {
                                        setSelectedDay(key);
                                        if (!currentMonth) {
                                            setLoading(true);
                                            setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                                        }
                                    }}
                                >
                                    <span>{day.getDate()}</span>
                                    {dayEvents.length > 0 && <span className="calendar-day-events">
                                        {dayEvents.slice(0, 2).map((item) => <span key={item.id} title={`${item.type}: ${item.title}`}>{item.title}</span>)}
                                        {dayEvents.length > 2 && <small>+{dayEvents.length - 2} more</small>}
                                    </span>}
                                </button>
                            );
                        })}
                    </div>
                    <section className="calendar-selected-day" aria-live="polite">
                        <h3>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
                        {!selectedEvents.length ? <p>No activities scheduled for this day.</p> : (
                            <div className="calendar-event-list">
                                {selectedEvents.map((event) => (
                                    <article className="calendar-event" key={event.id}>
                                        <span className={`calendar-type type-${event.type}`}>{event.type}</span>
                                        <div>
                                            <strong>{event.title}</strong>
                                            <span>{event.courseTitle}</span>
                                            {event.description && <p>{event.description}</p>}
                                        </div>
                                        <time><FaClock aria-hidden="true" />{new Date(event.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time>
                                        {event.type === "assignment" && isStaff && <div className="calendar-reschedule">
                                            <label>Extend deadline
                                                <input
                                                    type="date"
                                                    value={reschedule[event.assignmentId] || localDateValue(new Date(event.startsAt))}
                                                    onChange={(change) => setReschedule((current) => ({ ...current, [event.assignmentId]: change.target.value }))}
                                                />
                                            </label>
                                            <button type="button" className="btn btn-inline btn-secondary" onClick={() => saveDueDate(event.assignmentId)}>Reschedule</button>
                                        </div>}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>}
            </section>
        </div>
    );
};

export default Calendar;
