import { useEffect, useState } from "react";
import API from "../services/api";

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    return (
        <div className="page-content">
            <h1>My Students</h1>
            <p className="subtitle">Students enrolled in your courses.</p>

            {loading && <p>Loading students...</p>}
            {error && <p className="error-text">{error}</p>}
            {!loading && !error && students.length === 0 && (
                <p className="empty-state">No students are enrolled in your courses yet.</p>
            )}

            {!loading && !error && students.length > 0 && (
                <ul className="student-list">
                    {students.map((student) => (
                        <li className="student-list-item" key={`${student.courseId}-${student.id}`}>
                            <div className="student-avatar" aria-hidden="true">
                                {student.fullName?.trim().charAt(0).toUpperCase() || "S"}
                            </div>
                            <div className="student-list-details">
                                <strong>{student.fullName}</strong>
                                <span>{student.email}</span>
                            </div>
                            <span className="student-course">{student.courseTitle}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Students;
