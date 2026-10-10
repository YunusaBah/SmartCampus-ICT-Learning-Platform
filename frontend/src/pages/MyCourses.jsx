import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

const MyCourses = () => {
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        API.get("/enrollments/my-courses")
            .then((res) => setCourses(res.data.map((e) => e.course).filter(Boolean)))
            .catch(console.error);
    }, []);

    return (
        <div className="page-content">
            <h1>My Courses</h1>
            <div className="course-list">
                {courses.length === 0 && (
                    <p>
                        No enrolled courses. <Link to="/courses">Browse courses</Link> to enroll.
                    </p>
                )}
                {courses.map((course) => (
                    <Link to={`/courses/${course.id}?section=overview`} className="course-list-item" key={course.id}>
                        <span className="course-list-copy">
                            <strong>{course.title}</strong>
                            <span>{course.description || "Open the classroom to view course information and learning materials."}</span>
                        </span>
                        <span className="course-list-arrow">Open classroom</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default MyCourses;
