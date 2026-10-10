import { useEffect, useState } from "react";
import { FaBullhorn } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import AnnouncementCard from "../components/AnnouncementCard";

const Announcements = () => {
    const { isStaff } = useAuth();
    const [courses, setCourses] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [form, setForm] = useState({ courseId: "", title: "", body: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const courseResponse = await API.get(isStaff ? "/courses/my" : "/enrollments/my-courses");
                const availableCourses = isStaff
                    ? courseResponse.data
                    : courseResponse.data
                        .map((enrollment) => enrollment.course
                            ? { ...enrollment.course, canPostAnnouncements: enrollment.canPostAnnouncements }
                            : null)
                        .filter(Boolean);
                const resultSets = await Promise.all(availableCourses.map(async (course) => {
                    const response = await API.get(`/courses/${course.id}/announcements`);
                    return response.data.map((announcement) => ({
                        ...announcement,
                        courseTitle: course.title,
                        courseId: course.id
                    }));
                }));
                if (active) {
                    setCourses(availableCourses);
                    setAnnouncements(resultSets.flat().sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    ));
                }
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.message || "Unable to load announcements.");
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [isStaff]);

    const createAnnouncement = async (event) => {
        event.preventDefault();
        setStatus("");
        try {
            const payload = {
                title: form.title,
                body: form.body
            };
            const broadcast = form.courseId === "all";
            const response = broadcast
                ? await API.post("/announcements/broadcast", payload)
                : await API.post(`/courses/${form.courseId}/announcements`, payload);
            const published = broadcast ? response.data.announcements : [response.data];
            const created = published.map((announcement) => ({
                ...announcement,
                author: { fullName: "You" },
                courseTitle: courses.find((course) => course.id === announcement.courseId)?.title || "Course"
            }));
            setAnnouncements((current) => [...created, ...current]);
            setForm((current) => ({ ...current, title: "", body: "" }));
            setStatus(broadcast ? "Announcement published to all your courses." : "Announcement published.");
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || "Unable to publish announcement.");
        }
    };

    return (
        <div className="page-content feature-page">
            <header className="feature-page-header">
                <div>
                    <p className="eyebrow">COURSE UPDATES</p>
                    <h1>Announcements</h1>
                    <p className="subtitle">Important updates shared with your courses.</p>
                </div>
                <span className="grades-header-icon"><FaBullhorn /></span>
            </header>

            {(isStaff || courses.some((course) => course.canPostAnnouncements)) && <details className="feature-create-panel">
                <summary>Post an announcement</summary>
                <form className="feature-form-grid" onSubmit={createAnnouncement}>
                        <label>Course
                            <select required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
                                <option value="">Choose a course</option>
                                {isStaff && <option value="all">All my courses</option>}
                                {courses.filter((course) => isStaff || course.canPostAnnouncements)
                                    .map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
                            </select>
                        </label>
                        <label>Title<input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                        <label className="feature-form-wide">Message<textarea required maxLength={20000} rows={4} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
                        <button type="submit" className="btn btn-inline">Publish announcement</button>
                        {status && <p className="feature-status" role="status">{status}</p>}
                </form>
            </details>}

            {loading ? <p className="dashboard-loading" role="status">Loading announcements...</p> : error ? (
                <div className="dashboard-alert" role="alert">{error}</div>
            ) : announcements.length ? (
                <section className="announcement-list">
                    {announcements.map((announcement) => (
                        <AnnouncementCard key={announcement.id} announcement={announcement} isStaff={isStaff} />
                    ))}
                </section>
            ) : (
                <div className="feature-empty"><FaBullhorn /><strong>No announcements yet</strong><span>New course updates from your lecturers will show up here.</span></div>
            )}
        </div>
    );
};

export default Announcements;
