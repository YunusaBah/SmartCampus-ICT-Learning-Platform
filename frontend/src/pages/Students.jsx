import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaShieldAlt } from "react-icons/fa";
import API from "../services/api";

const permissionOptions = [
    ["uploadMaterials", "Upload course materials"],
    ["createAssignments", "Create assignments"],
    ["gradeAssignments", "Grade assignments"],
    ["postAnnouncements", "Post announcements"],
    ["messageLecturer", "Message lecturer"]
];

const roleLabels = {
    student_assistant: "Student Assistant",
    class_representative: "Class Representative"
};

const emptyDraft = { role: "", permissions: [] };
const enrollmentKey = (student) => `${student.courseId}:${student.id}`;

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [permissionModalOpen, setPermissionModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState("");
    const [selectedStudentKey, setSelectedStudentKey] = useState("");
    const [permissionDraft, setPermissionDraft] = useState(emptyDraft);
    const [savingStudentKey, setSavingStudentKey] = useState("");
    const [status, setStatus] = useState("");
    const [permissionError, setPermissionError] = useState("");

    const courses = useMemo(() => [...new Map(students.map((student) => [
        String(student.courseId),
        { id: student.courseId, title: student.courseTitle }
    ])).values()].sort((left, right) => left.title.localeCompare(right.title)), [students]);
    const filteredStudents = students
        .filter((student) =>
            (courseFilter === "all" || String(student.courseId) === courseFilter) &&
            `${student.fullName} ${student.matNumber || ""} ${student.phone || ""} ${student.email || ""} ${student.courseTitle}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())
        )
        .sort((left, right) => {
            const leftValue = sortBy === "matNumber" ? left.matNumber || "" : left.fullName || "";
            const rightValue = sortBy === "matNumber" ? right.matNumber || "" : right.fullName || "";
            return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
        });
    const assignedStudents = students.filter((student) =>
        student.permissionRole || student.permissions?.length > 0
    );
    const modalStudents = students.filter((student) =>
        (selectedStudentKey ? String(student.courseId) === selectedStudentKey.split(":")[0] : true) &&
        `${student.fullName} ${student.matNumber || ""} ${student.phone || ""}`
            .toLowerCase()
            .includes(modalSearch.trim().toLowerCase())
    );
    const selectedStudent = students.find((student) => enrollmentKey(student) === selectedStudentKey);

    useEffect(() => {
        let active = true;

        API.get("/courses/students")
            .then((response) => {
                if (active) setStudents(response.data);
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Failed to load students");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    const openPermissionModal = (student = null) => {
        setPermissionError("");
        setStatus("");
        setModalSearch("");
        setSelectedStudentKey(student ? enrollmentKey(student) : "");
        setPermissionDraft(student
            ? { role: student.permissionRole || "", permissions: student.permissions || [] }
            : emptyDraft);
        setPermissionModalOpen(true);
    };

    const selectStudent = (key) => {
        const student = students.find((item) => enrollmentKey(item) === key);
        setSelectedStudentKey(key);
        setPermissionDraft(student
            ? { role: student.permissionRole || "", permissions: student.permissions || [] }
            : emptyDraft);
        setPermissionError("");
    };

    const savePermissions = async (student, revoke = false) => {
        if (!student) return;
        const key = enrollmentKey(student);
        const role = revoke ? null : permissionDraft.role || null;
        const permissions = revoke || !role ? [] : permissionDraft.permissions;
        setSavingStudentKey(key);
        setPermissionError("");
        setStatus("");
        try {
            const response = await API.patch(`/courses/${student.courseId}/students/${student.id}/permissions`, {
                role,
                permissions
            });
            setStudents((current) => current.map((item) =>
                enrollmentKey(item) === key
                    ? { ...item, permissionRole: response.data.permissionRole, permissions: response.data.permissions }
                    : item
            ));
            setStatus(revoke
                ? `Permissions revoked for ${student.fullName} in ${student.courseTitle}.`
                : `Permissions saved for ${student.fullName} in ${student.courseTitle}.`);
            if (!revoke) setPermissionModalOpen(false);
            else if (permissionModalOpen && selectedStudentKey === key) {
                setPermissionDraft(emptyDraft);
                setSelectedStudentKey("");
            }
        } catch (requestError) {
            setPermissionError(requestError.response?.data?.message || "Unable to update student permissions.");
        } finally {
            setSavingStudentKey("");
        }
    };

    const togglePermission = (permission, checked) => {
        setPermissionDraft((current) => ({
            ...current,
            permissions: checked
                ? [...new Set([...current.permissions, permission])]
                : current.permissions.filter((item) => item !== permission)
        }));
    };

    return (
        <div className="page-content students-page">
            <header className="students-header">
                <div>
                    <p className="eyebrow">TEACHING</p>
                    <h1>My students</h1>
                </div>
                <div className="students-header-actions">
                    {!loading && !error && <span className="catalog-count">{students.length} enrollments</span>}
                    <button className="btn btn-inline" type="button" onClick={() => openPermissionModal()} disabled={!students.length}>
                        <FaShieldAlt aria-hidden="true" /> Permissions
                    </button>
                </div>
            </header>

            {loading && <p>Loading students...</p>}
            {error && <p className="error-text">{error}</p>}
            {permissionError && !permissionModalOpen && <p className="error-text" role="alert">{permissionError}</p>}
            {status && <p className="feature-status" role="status">{status}</p>}
            {!loading && !error && students.length === 0 && (
                <p className="empty-state">No students are enrolled in your courses yet.</p>
            )}

            {!loading && !error && students.length > 0 && (
                <>
                    <div className="student-list-controls">
                        <label className="catalog-search">
                            <FaSearch aria-hidden="true" />
                            <span className="sr-only">Search your students</span>
                            <input
                                type="search"
                                placeholder="Search by name, matric number, phone, or email"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </label>
                        <label className="materials-course-filter">
                            <span>Course</span>
                            <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                                <option value="all">All courses</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={String(course.id)}>{course.title}</option>
                                ))}
                            </select>
                        </label>
                        <label className="materials-course-filter">
                            <span>Sort by</span>
                            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                                <option value="name">Name (A-Z)</option>
                                <option value="matNumber">Matric number</option>
                            </select>
                        </label>
                    </div>
                    {filteredStudents.length ? (
                        <div className="student-table-scroll">
                            <table className="student-table">
                                <thead>
                                    <tr>
                                        <th scope="col">No.</th>
                                        <th scope="col">Full name</th>
                                        <th scope="col">Mat. number</th>
                                        <th scope="col">Course</th>
                                        <th scope="col">Phone number</th>
                                        <th scope="col">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student, index) => (
                                        <tr key={enrollmentKey(student)}>
                                            <td>{index + 1}</td>
                                            <td>{student.fullName}</td>
                                            <td>{student.matNumber || "Not provided"}</td>
                                            <td>{student.courseTitle}</td>
                                            <td>{student.phone || "Not provided"}</td>
                                            <td><a href={`mailto:${student.email}`}>{student.email}</a></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="catalog-empty">
                            <FaSearch aria-hidden="true" />
                            <h2>No students match your search</h2>
                            <p>Try another name, phone number, email, or course.</p>
                        </div>
                    )}

                    <section className="student-permissions-section">
                        <div className="section-heading">
                            <div><p className="eyebrow">COURSE ACCESS</p><h2>Assigned roles and permissions</h2></div>
                            <span className="catalog-count">{assignedStudents.length} assigned</span>
                        </div>
                        {assignedStudents.length ? (
                            <div className="student-permission-list">
                                {assignedStudents.map((student) => (
                                    <article className="student-permission-card" key={enrollmentKey(student)}>
                                        <div className="student-permission-identity">
                                            <strong>{student.fullName}</strong>
                                            <span>{student.courseTitle} · {student.matNumber || "No matric number"} · {student.phone || "No phone"}</span>
                                        </div>
                                        <div className="student-permission-details">
                                            <strong>{roleLabels[student.permissionRole] || "Course role"}</strong>
                                            <span>{student.permissions.map((permission) =>
                                                permissionOptions.find(([key]) => key === permission)?.[1] || permission
                                            ).join(" · ") || "No permissions selected"}</span>
                                        </div>
                                        <div className="student-permission-actions">
                                            <button type="button" className="course-student-remove" onClick={() => openPermissionModal(student)}>
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="course-student-remove"
                                                disabled={savingStudentKey === enrollmentKey(student)}
                                                onClick={() => savePermissions(student, true)}
                                            >
                                                {savingStudentKey === enrollmentKey(student) ? "Revoking..." : "Revoke"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="upcoming-empty">
                                <FaShieldAlt aria-hidden="true" />
                                <strong>No student permissions assigned</strong>
                            </div>
                        )}
                    </section>
                </>
            )}

            {permissionModalOpen && (
                <div className="permission-dialog-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setPermissionModalOpen(false);
                }}>
                    <section className="permission-dialog" role="dialog" aria-modal="true" aria-labelledby="permission-dialog-title">
                        <div className="permission-dialog-heading">
                            <div><p className="eyebrow">COURSE ACCESS</p><h2 id="permission-dialog-title">Manage student permissions</h2></div>
                            <button type="button" className="permission-dialog-close" onClick={() => setPermissionModalOpen(false)} aria-label="Close permissions">×</button>
                        </div>
                        {permissionError && <p className="error-text" role="alert">{permissionError}</p>}
                        <label className="permission-form-field">
                            <span>Find a student</span>
                            <div className="catalog-search">
                                <FaSearch aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder="Search name, matric number, or phone"
                                    value={modalSearch}
                                    onChange={(event) => setModalSearch(event.target.value)}
                                />
                            </div>
                        </label>
                        <label className="permission-form-field">
                            <span>Student and course</span>
                            <select value={selectedStudentKey} onChange={(event) => selectStudent(event.target.value)}>
                                <option value="">Select an enrolled student</option>
                                {modalStudents.map((student) => (
                                    <option key={enrollmentKey(student)} value={enrollmentKey(student)}>
                                        {student.fullName} · {student.courseTitle} · {student.matNumber || student.phone || "No ID"}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="permission-form-field">
                            <span>Role</span>
                            <select
                                value={permissionDraft.role}
                                disabled={!selectedStudent}
                                onChange={(event) => setPermissionDraft((current) => ({ ...current, role: event.target.value }))}
                            >
                                <option value="">Select a role</option>
                                <option value="student_assistant">Student Assistant</option>
                                <option value="class_representative">Class Representative</option>
                            </select>
                        </label>
                        <fieldset className="permission-choice-group" disabled={!selectedStudent || !permissionDraft.role}>
                            <legend>Permissions</legend>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={permissionOptions.every(([permission]) => permissionDraft.permissions.includes(permission))}
                                    onChange={(event) => setPermissionDraft((current) => ({
                                        ...current,
                                        permissions: event.target.checked ? permissionOptions.map(([permission]) => permission) : []
                                    }))}
                                />
                                All permissions
                            </label>
                            {permissionOptions.map(([permission, label]) => (
                                <label key={permission}>
                                    <input
                                        type="checkbox"
                                        checked={permissionDraft.permissions.includes(permission)}
                                        onChange={(event) => togglePermission(permission, event.target.checked)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                        <div className="permission-dialog-actions">
                            <button type="button" className="btn btn-inline btn-secondary" onClick={() => setPermissionModalOpen(false)}>Cancel</button>
                            <button
                                type="button"
                                className="btn btn-inline"
                                disabled={!selectedStudent || !permissionDraft.role || savingStudentKey === selectedStudentKey}
                                onClick={() => savePermissions(selectedStudent)}
                            >
                                {savingStudentKey === selectedStudentKey ? "Saving..." : "Save permissions"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default Students;
