import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaBookOpen, FaMoon, FaShieldAlt, FaSun, FaUserCircle } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const readMotionPreference = () => localStorage.getItem("reducedMotion") === "true";
const readTextSizePreference = (userId) => {
    const value = Number(localStorage.getItem(`smartcampus:text-size:${userId ?? "guest"}`) || 0);
    return Number.isInteger(value) && value >= 0 && value <= 20 ? value : 0;
};

const courseSettingsFrom = (course) => ({
    title: course.title || "",
    academicCode: course.academicCode || "",
    category: course.category || "",
    description: course.description || "",
    status: course.status || "active",
    enrollmentEnabled: String(course.enrollmentEnabled !== false),
    startDate: course.startDate || "",
    endDate: course.endDate || ""
});

const CourseSettingsForm = ({ course, onCourseUpdated }) => {
    const [courseSettings, setCourseSettings] = useState(() => courseSettingsFrom(course));
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);
    const [regeneratingCode, setRegeneratingCode] = useState(false);

    const saveCourseSettings = async (event) => {
        event.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const response = await API.patch(`/courses/${course.id}`, {
                ...courseSettings,
                enrollmentEnabled: courseSettings.enrollmentEnabled === "true",
                startDate: courseSettings.startDate || null,
                endDate: courseSettings.endDate || null
            });
            onCourseUpdated(response.data);
            setStatus({ type: "success", text: "Course settings saved." });
        } catch (error) {
            setStatus({
                type: "error",
                text: error.response?.data?.message || "Unable to save course settings."
            });
        } finally {
            setSaving(false);
        }
    };

    const regenerateCourseCode = async () => {
        setRegeneratingCode(true);
        setStatus(null);
        try {
            const response = await API.post(`/courses/${course.id}/class-code/regenerate`);
            onCourseUpdated({ ...course, classCode: response.data.classCode });
            setStatus({
                type: "success",
                text: "Class code regenerated. The previous code no longer works for new enrollments."
            });
        } catch (error) {
            setStatus({
                type: "error",
                text: error.response?.data?.message || "Unable to regenerate class code."
            });
        } finally {
            setRegeneratingCode(false);
        }
    };

    return (
        <form className="settings-form" onSubmit={saveCourseSettings}>
            {course.createdAt && (
                <p className="settings-course-created">
                    Created automatically on {new Date(course.createdAt).toLocaleDateString()}
                </p>
            )}
            <div className="settings-form-grid">
                <label>Course name<input name="title" required maxLength={255} value={courseSettings.title} onChange={(event) => setCourseSettings({ ...courseSettings, title: event.target.value })} /></label>
                <label>Academic course code<input name="academicCode" maxLength={50} value={courseSettings.academicCode} onChange={(event) => setCourseSettings({ ...courseSettings, academicCode: event.target.value })} /></label>
                <label>Category<input name="category" maxLength={100} value={courseSettings.category} onChange={(event) => setCourseSettings({ ...courseSettings, category: event.target.value })} /></label>
                <label>Status<select name="status" value={courseSettings.status} onChange={(event) => setCourseSettings({ ...courseSettings, status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                </select></label>
                <label>Enrollment<select name="enrollmentEnabled" value={courseSettings.enrollmentEnabled} onChange={(event) => setCourseSettings({ ...courseSettings, enrollmentEnabled: event.target.value })}>
                    <option value="true">Open</option>
                    <option value="false">Closed</option>
                </select></label>
                <label>Start date<input type="date" name="startDate" value={courseSettings.startDate} onChange={(event) => setCourseSettings({ ...courseSettings, startDate: event.target.value })} /></label>
                <label>End date<input type="date" name="endDate" value={courseSettings.endDate} onChange={(event) => setCourseSettings({ ...courseSettings, endDate: event.target.value })} /></label>
                <label className="settings-form-wide">Description<textarea name="description" rows={4} maxLength={10000} value={courseSettings.description} onChange={(event) => setCourseSettings({ ...courseSettings, description: event.target.value })} /></label>
            </div>
            {course.classCode && <div className="settings-course-code">
                <span>Enrollment class code</span>
                <strong>{course.classCode}</strong>
                <button type="button" className="btn btn-inline btn-secondary" onClick={regenerateCourseCode} disabled={regeneratingCode}>
                    {regeneratingCode ? "Regenerating..." : "Regenerate code"}
                </button>
            </div>}
            <div className="settings-form-footer">
                {status && <p className={`settings-status ${status.type}`} role="status">{status.text}</p>}
                <button className="btn btn-inline" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save course settings"}
                </button>
            </div>
        </form>
    );
};

const Settings = ({ theme, setTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isStaff } = useAuth();
    const [profile, setProfile] = useState({
        fullName: user?.fullName || "",
        email: user?.email || "",
        matNumber: user?.matNumber || "",
        phone: user?.phone || ""
    });
    const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [reducedMotion, setReducedMotion] = useState(readMotionPreference);
    const [textSize, setTextSize] = useState(() => readTextSizePreference(user?.id));
    const [profileStatus, setProfileStatus] = useState(null);
    const [passwordStatus, setPasswordStatus] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(
        location.state?.courseId ? String(location.state.courseId) : ""
    );
    const [coursesError, setCoursesError] = useState("");
    const [loadingCourses, setLoadingCourses] = useState(isStaff);
    const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId);

    useEffect(() => {
        if (!isStaff) return undefined;
        let active = true;
        API.get("/courses/my")
            .then((response) => {
                if (!active) return;
                const myCourses = response.data;
                setCourses(myCourses);
                const requestedCourseId = location.state?.courseId == null
                    ? ""
                    : String(location.state.courseId);
                setSelectedCourseId(myCourses.some((course) => String(course.id) === requestedCourseId)
                    ? requestedCourseId
                    : String(myCourses[0]?.id || ""));
            })
            .catch((error) => {
                if (active) {
                    setCoursesError(error.response?.data?.message || "Unable to load your courses.");
                }
            })
            .finally(() => {
                if (active) setLoadingCourses(false);
            });
        return () => { active = false; };
    }, [isStaff, location.state]);

    const saveProfile = async (event) => {
        event.preventDefault();
        setProfileStatus(null);
        setSavingProfile(true);

        try {
            const response = await API.patch("/auth/profile", profile);
            localStorage.setItem("user", JSON.stringify(response.data.user));
            window.dispatchEvent(new Event("smartcampus:user-updated"));
            setProfile({
                fullName: response.data.user.fullName,
                email: response.data.user.email,
                matNumber: response.data.user.matNumber || "",
                phone: response.data.user.phone || ""
            });
            setProfileStatus({ type: "success", text: response.data.message });
        } catch (error) {
            setProfileStatus({
                type: "error",
                text: error.response?.data?.message || "Unable to update your profile."
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();
        setPasswordStatus(null);
        if (password.newPassword !== password.confirmPassword) {
            setPasswordStatus({ type: "error", text: "The new passwords do not match." });
            return;
        }
        if (password.newPassword.length < 6) {
            setPasswordStatus({ type: "error", text: "Your new password must be at least 6 characters." });
            return;
        }

        setSavingPassword(true);
        try {
            await API.patch("/auth/password", {
                currentPassword: password.currentPassword,
                newPassword: password.newPassword
            });
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("smartcampus:account-changed"));
            navigate("/login", {
                replace: true,
                state: { message: "Password updated successfully. Please log in again." }
            });
        } catch (error) {
            setPasswordStatus({
                type: "error",
                text: error.response?.data?.message || "Unable to update your password."
            });
        } finally {
            setSavingPassword(false);
        }
    };

    const changeTheme = (nextTheme) => {
        setTheme(nextTheme);
    };

    const changeMotionPreference = (enabled) => {
        setReducedMotion(enabled);
        localStorage.setItem("reducedMotion", String(enabled));
        document.documentElement.dataset.reducedMotion = String(enabled);
    };

    const changeTextSize = (value) => {
        setTextSize(value);
        localStorage.setItem(`smartcampus:text-size:${user?.id ?? "guest"}`, String(value));
        document.documentElement.style.fontSize = `${100 + value * 2}%`;
        window.dispatchEvent(new Event("smartcampus:text-size-changed"));
    };

    return (
        <div className="page-content settings-page">
            <header className="settings-header">
                <p className="eyebrow">{isStaff ? "COURSE, PREFERENCES & ACCOUNT" : "PREFERENCES & ACCOUNT"}</p>
                <h1>Settings</h1>
                <p className="subtitle">Manage your account, appearance{isStaff ? ", and course settings" : ""}.</p>
            </header>

            {isStaff && <section className="settings-section">
                <div className="settings-section-heading">
                    <span className="settings-section-icon"><FaBookOpen /></span>
                    <div>
                        <h2>Course settings</h2>
                        <p>Edit course details, enrollment, schedule, and class code.</p>
                    </div>
                </div>
                {loadingCourses ? (
                    <p role="status">Loading your courses...</p>
                ) : coursesError ? (
                    <p className="settings-status error" role="alert">{coursesError}</p>
                ) : courses.length ? (
                    <>
                        <label className="settings-course-select">
                            Select course
                            <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
                                {courses.map((course) => (
                                    <option key={course.id} value={String(course.id)}>{course.title}</option>
                                ))}
                            </select>
                        </label>
                        {selectedCourse && <CourseSettingsForm
                            key={selectedCourse.id}
                            course={selectedCourse}
                            onCourseUpdated={(updatedCourse) => {
                                setCourses((current) => current.map((course) =>
                                    course.id === updatedCourse.id ? { ...course, ...updatedCourse } : course
                                ));
                                window.dispatchEvent(new Event("smartcampus:dashboard-refresh"));
                                window.dispatchEvent(new Event("smartcampus:courses-refresh"));
                            }}
                        />}
                    </>
                ) : (
                    <p>No courses to configure yet.</p>
                )}
            </section>}

            <section className="settings-section">
                <div className="settings-section-heading">
                    <span className="settings-section-icon"><FaUserCircle /></span>
                    <div>
                        <h2>Profile information</h2>
                        <p>Update the name and email address associated with your account.</p>
                    </div>
                </div>
                <form className="settings-form" onSubmit={saveProfile}>
                    <label>
                        Full name
                        <input
                            autoComplete="name"
                            maxLength={255}
                            required
                            value={profile.fullName}
                            onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                        />
                    </label>
                    <label>
                        Email address
                        <input
                            autoComplete="email"
                            type="email"
                            maxLength={254}
                            required
                            readOnly={user?.googleLinked}
                            value={profile.email}
                            onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                        />
                        {user?.googleLinked && <small className="settings-field-hint">Email is verified by your Google account and cannot be edited here.</small>}
                    </label>
                    {user?.role === "student" && (
                        <>
                            <label>
                                Student ID / Matriculation number
                                <input
                                    maxLength={50}
                                    required
                                    value={profile.matNumber}
                                    onChange={(event) => setProfile({ ...profile, matNumber: event.target.value })}
                                />
                            </label>
                            <label>
                                Phone number
                                <input
                                    autoComplete="tel"
                                    type="tel"
                                    maxLength={30}
                                    required
                                    value={profile.phone}
                                    onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                                />
                            </label>
                        </>
                    )}
                    <div className="settings-form-footer">
                        {profileStatus && (
                            <p className={`settings-status ${profileStatus.type}`} role="status">{profileStatus.text}</p>
                        )}
                        <button className="btn btn-inline" type="submit" disabled={savingProfile}>
                            {savingProfile ? "Saving..." : "Save profile"}
                        </button>
                    </div>
                </form>
            </section>

            {user?.passwordLoginEnabled !== false && <section className="settings-section" id="security">
                <div className="settings-section-heading">
                    <span className="settings-section-icon"><FaShieldAlt /></span>
                    <div>
                        <h2>Security</h2>
                        <p>Use your current password to set a new one for your account.</p>
                    </div>
                </div>
                <form className="settings-form" onSubmit={savePassword}>
                    <label>
                        Current password
                        <input
                            autoComplete="current-password"
                            type="password"
                            required
                            value={password.currentPassword}
                            onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                        />
                    </label>
                    <div className="settings-form-grid">
                        <label>
                            New password
                            <input
                                autoComplete="new-password"
                                type="password"
                                minLength={6}
                                required
                                value={password.newPassword}
                                onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                            />
                        </label>
                        <label>
                            Confirm new password
                            <input
                                autoComplete="new-password"
                                type="password"
                                minLength={6}
                                required
                                value={password.confirmPassword}
                                onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                            />
                        </label>
                    </div>
                    <div className="settings-form-footer">
                        {passwordStatus && (
                            <p className={`settings-status ${passwordStatus.type}`} role="status">{passwordStatus.text}</p>
                        )}
                        <button className="btn btn-inline" type="submit" disabled={savingPassword}>
                            {savingPassword ? "Updating..." : "Update password"}
                        </button>
                    </div>
                </form>
            </section>}

            <section className="settings-section">
                <div className="settings-section-heading">
                    <span className="settings-section-icon">{theme === "dark" ? <FaMoon /> : <FaSun />}</span>
                    <div>
                        <h2>Appearance & accessibility</h2>
                        <p>Your appearance preference is saved separately for your account on this browser.</p>
                    </div>
                </div>
                <div className="settings-preference-row">
                    <div>
                        <strong>Text size</strong>
                        <span>Increase text from the default size up to 40%.</span>
                    </div>
                    <label className="settings-text-size">
                        <span>{textSize} / 20 · {100 + textSize * 2}%</span>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={textSize}
                            aria-label="Text size increase from 0 to 20"
                            onChange={(event) => changeTextSize(Number(event.target.value))}
                        />
                    </label>
                </div>
                <div className="settings-preference-row">
                    <div>
                        <strong>Color theme</strong>
                        <span>Choose the display theme for your learning space.</span>
                    </div>
                    <div className="theme-options" role="group" aria-label="Color theme">
                        <button
                            type="button"
                            className={theme === "light" ? "theme-option selected" : "theme-option"}
                            aria-pressed={theme === "light"}
                            onClick={() => changeTheme("light")}
                        >
                            <FaSun aria-hidden="true" /> Light
                        </button>
                        <button
                            type="button"
                            className={theme === "dark" ? "theme-option selected" : "theme-option"}
                            aria-pressed={theme === "dark"}
                            onClick={() => changeTheme("dark")}
                        >
                            <FaMoon aria-hidden="true" /> Dark
                        </button>
                    </div>
                </div>
                <div className="settings-preference-row">
                    <div>
                        <strong>Reduce motion</strong>
                        <span>Limit non-essential transitions and animations.</span>
                    </div>
                    <label className="settings-switch">
                        <input
                            type="checkbox"
                            checked={reducedMotion}
                            onChange={(event) => changeMotionPreference(event.target.checked)}
                        />
                        <span className="settings-switch-track" aria-hidden="true" />
                        <span className="sr-only">Reduce motion</span>
                    </label>
                </div>
            </section>

            <p className="settings-role-note">
                Signed in as <strong>{user?.role || "user"}</strong>. Your access is managed by your SmartCampus role.
            </p>
        </div>
    );
};

export default Settings;
