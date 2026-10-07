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
        `${student.fullName} ${student.matNumber || ""} ${student.phone || ""} ${student.email} ${student.courseTitle}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
    );

    return (
        <div className="page-content students-page">
            <header className="students-header">
                <div>
                    <p className="eyebrow">TEACHING</p>
                    <h1>My students</h1>
                    <p className="subtitle">Student details grouped by course enrollment.</p>
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
                                        <tr key={`${student.courseId}-${student.id}`}>
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
                            <p>Try another name, email address, or course.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Students;
