import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import API from "../services/api";

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;

        API.get("/courses/students")
            .then((response) => {
                if (active) setStudents(response.data);
            })
            .catch((requestError) => {
                if (active) {
                    setError(requestError.response?.data?.message || "Failed to load students");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    const filteredStudents = students.filter((student) =>
        `${student.fullName} ${student.email} ${student.courseTitle}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
    );

    return (
        <div className="page-content students-page">
            <header className="students-header">
                <div>
                    <p className="eyebrow">TEACHING</p>
                    <h1>My students</h1>
                    <p className="subtitle">Students enrolled in your courses.</p>
                </div>
                {!loading && !error && <span className="catalog-count">{students.length} enrollments</span>}
            </header>

            {loading && <p>Loading students...</p>}
            {error && <p className="error-text">{error}</p>}
            {!loading && !error && students.length === 0 && (
                <p className="empty-state">No students are enrolled in your courses yet.</p>
            )}

            {!loading && !error && students.length > 0 && (
                <>
                    <label className="catalog-search">
                        <FaSearch aria-hidden="true" />
                        <span className="sr-only">Search your students</span>
                        <input
                            type="search"
                            placeholder="Search by student or course"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    {filteredStudents.length ? <ul className="student-list">
                    {filteredStudents.map((student) => (
                        <li className="student-list-item" key={`${student.courseId}-${student.id}`}>
                            <div className="student-avatar" aria-hidden="true">
                                {student.fullName?.trim().charAt(0).toUpperCase() || "S"}
                            </div>
                            <div className="student-list-details">
                                <strong>{student.fullName}</strong>
                                <span>{student.email} · Joined {new Date(student.enrolledAt).toLocaleDateString()}</span>
                            </div>
                            <span className="student-course">{student.courseTitle}</span>
                        </li>
                    ))}
                    </ul> : (
                        <div className="catalog-empty">
                            <FaSearch aria-hidden="true" />
                            <h2>No students match your search</h2>
                            <p>Try another name, email address, or course.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Students;
