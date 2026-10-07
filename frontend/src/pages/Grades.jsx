import { useEffect, useState } from "react";
import { FaChartLine, FaClipboardCheck } from "react-icons/fa";
import API from "../services/api";

const Grades = () => {
    const [data, setData] = useState({ quizResults: [], submissions: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        API.get("/dashboard/grades")
            .then((response) => {
                if (active) setData(response.data);
            })
            .catch((requestError) => {
                if (active) {
                    setError(requestError.response?.data?.message || "Unable to load your grades.");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    if (loading) {
        return <div className="page-content dashboard-loading" role="status">Loading your grades...</div>;
    }

    if (error) {
        return (
            <div className="page-content">
                <div className="dashboard-alert" role="alert">
                    <strong>Your grades couldn't be loaded.</strong>
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    const gradedSubmissions = data.submissions.filter((submission) => submission.grade !== "Pending");
    const quizAverage = data.quizResults.length
        ? Math.round(data.quizResults.reduce((total, result) => total + result.score * 100, 0) / data.quizResults.length)
        : null;

    return (
        <div className="page-content grades-page">
            <header className="grades-header">
                <div>
                    <p className="eyebrow">YOUR PERFORMANCE</p>
                    <h1>Grades</h1>
                    <p className="subtitle">Review quiz results and feedback on your submitted work.</p>
                </div>
                <span className="grades-header-icon" aria-hidden="true"><FaChartLine /></span>
            </header>

            <section className="grade-summary" aria-label="Grade summary">
                <div className="grade-summary-item">
                    <span>Quiz average</span>
                    <strong>{quizAverage === null ? "—" : `${quizAverage}%`}</strong>
                </div>
                <div className="grade-summary-item">
                    <span>Graded assignments</span>
                    <strong>{gradedSubmissions.length}</strong>
                </div>
                <div className="grade-summary-item">
                    <span>Awaiting review</span>
                    <strong>{data.submissions.length - gradedSubmissions.length}</strong>
                </div>
            </section>

            <section className="grades-section">
                <div className="section-heading">
                    <div><p className="eyebrow">ASSESSMENTS</p><h2>Quiz results</h2></div>
                    <span className="grades-section-count">{data.quizResults.length}</span>
                </div>
                {data.quizResults.length ? (
                    <div className="records-table-scroll">
                        <table className="records-table">
                            <thead>
                                <tr>
                                    <th scope="col">No.</th>
                                    <th scope="col">Quiz question</th>
                                    <th scope="col">Your answer</th>
                                    <th scope="col">Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.quizResults.map((result, index) => (
                                    <tr key={result.id}>
                                        <td>{index + 1}</td>
                                        <td>{result.quiz?.question || "Quiz question"}</td>
                                        <td>{result.selectedAnswer}</td>
                                        <td>{result.score === 1 ? "Correct" : "Incorrect"} ({result.score === 1 ? "100%" : "0%"})</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grade-empty">
                        <FaClipboardCheck aria-hidden="true" />
                        <strong>No quiz attempts yet</strong>
                        <span>Your quiz results will appear here after you submit an answer.</span>
                    </div>
                )}
            </section>

            <section className="grades-section">
                <div className="section-heading">
                    <div><p className="eyebrow">COURSE WORK</p><h2>Assignment submissions</h2></div>
                    <span className="grades-section-count">{data.submissions.length}</span>
                </div>
                {data.submissions.length ? (
                    <div className="records-table-scroll">
                        <table className="records-table">
                            <thead>
                                <tr>
                                    <th scope="col">No.</th>
                                    <th scope="col">Assignment</th>
                                    <th scope="col">Course</th>
                                    <th scope="col">Submitted</th>
                                    <th scope="col">Grade</th>
                                    <th scope="col">Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.submissions.map((submission, index) => (
                                    <tr key={submission.id}>
                                        <td>{index + 1}</td>
                                        <td>{submission.assignment?.title || "Assignment"}</td>
                                        <td>{submission.assignment?.course?.title || "Course"}</td>
                                        <td>{new Date(submission.createdAt).toLocaleDateString()}</td>
                                        <td>{submission.grade}</td>
                                        <td>{submission.feedback || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grade-empty">
                        <FaClipboardCheck aria-hidden="true" />
                        <strong>No assignments submitted</strong>
                        <span>Assignment grades and lecturer feedback will be listed here.</span>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Grades;
