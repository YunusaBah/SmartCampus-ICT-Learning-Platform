import { useEffect, useState } from "react";
import { FaChartLine, FaClipboardCheck, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import API from "../services/api";

const Grades = () => {
    const [data, setData] = useState({
        quizResults: [],
        assessmentResults: [],
        submissions: [],
        summary: { quizAverage: null, quizCount: 0, assessmentCount: 0, gradedSubmissions: 0, pendingSubmissions: 0, submissionCount: 0 },
        pagination: { pageSize: 20, quizPage: 1, quizPages: 0, assessmentPage: 1, assessmentPages: 0, submissionPage: 1, submissionPages: 0 }
    });
    const [pages, setPages] = useState({ quizPage: 1, assessmentPage: 1, submissionPage: 1 });
    const [activeTab, setActiveTab] = useState("quizzes");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        API.get("/dashboard/grades", { params: pages })
            .then((response) => {
                if (!active) return;
                const result = response.data;
                const quizResults = result.quizResults || [];
                const assessmentResults = result.assessmentResults || [];
                const submissions = result.submissions || [];
                const gradedCount = submissions.filter((submission) => submission.grade !== "Pending").length;
                setData({
                    quizResults,
                    assessmentResults,
                    submissions,
                    summary: result.summary || {
                        quizAverage: quizResults.length
                            ? Math.round(quizResults.reduce((total, item) => total + item.score * 100, 0) / quizResults.length)
                            : null,
                        quizCount: quizResults.length,
                        assessmentCount: assessmentResults.length,
                        gradedSubmissions: gradedCount,
                        pendingSubmissions: submissions.length - gradedCount,
                        submissionCount: submissions.length
                    },
                    pagination: result.pagination || {
                        pageSize: 20,
                        quizPage: 1,
                        quizPages: 1,
                        assessmentPage: 1,
                        assessmentPages: 1,
                        submissionPage: 1,
                        submissionPages: 1
                    }
                });
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
    }, [pages]);

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

    const showPagination = (key, currentPage, pageCount) => pageCount > 1 && (
        <nav className="grades-pagination" aria-label={`${key === "quizPage" ? "Quick quiz results" : key === "assessmentPage" ? "Timed assessment results" : "Assignment submissions"} pages`}>
            <button
                type="button"
                className="btn btn-inline btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setPages((current) => ({ ...current, [key]: current[key] - 1 }))}
            >
                <FaArrowLeft aria-hidden="true" /> Previous
            </button>
            <span>Page {currentPage} of {pageCount}</span>
            <button
                type="button"
                className="btn btn-inline btn-secondary"
                disabled={currentPage >= pageCount}
                onClick={() => setPages((current) => ({ ...current, [key]: current[key] + 1 }))}
            >
                Next <FaArrowRight aria-hidden="true" />
            </button>
        </nav>
    );

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
                    <strong>{data.summary.quizAverage === null ? "—" : `${data.summary.quizAverage}%`}</strong>
                </div>
                <div className="grade-summary-item">
                    <span>Graded assignments</span>
                    <strong>{data.summary.gradedSubmissions}</strong>
                </div>
                <div className="grade-summary-item">
                    <span>Awaiting review</span>
                    <strong>{data.summary.pendingSubmissions}</strong>
                </div>
            </section>

            <nav className="grades-tabs" aria-label="Grade categories" role="tablist">
                {[
                    ["quizzes", "Assessments"],
                    ["timed", "Timed assessments"],
                    ["coursework", "Coursework"]
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`grades-tab-${id}`}
                        aria-controls={`grades-panel-${id}`}
                        aria-selected={activeTab === id}
                        tabIndex={activeTab === id ? 0 : -1}
                        onClick={() => setActiveTab(id)}
                        onKeyDown={(event) => {
                            const tabIds = ["quizzes", "timed", "coursework"];
                            const currentIndex = tabIds.indexOf(activeTab);
                            const nextIndex = event.key === "ArrowRight"
                                ? (currentIndex + 1) % tabIds.length
                                : event.key === "ArrowLeft"
                                    ? (currentIndex - 1 + tabIds.length) % tabIds.length
                                    : event.key === "Home"
                                        ? 0
                                        : event.key === "End"
                                            ? tabIds.length - 1
                                            : -1;
                            if (nextIndex < 0) return;
                            event.preventDefault();
                            setActiveTab(tabIds[nextIndex]);
                            event.currentTarget.parentElement
                                ?.querySelectorAll('[role="tab"]')[nextIndex]
                                ?.focus();
                        }}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {activeTab === "quizzes" && <section className="grades-section" role="tabpanel" id="grades-panel-quizzes" aria-labelledby="grades-tab-quizzes">
                <div className="section-heading">
                    <div><p className="eyebrow">ASSESSMENTS</p><h2>Quiz results</h2></div>
                    <span className="grades-section-count">{data.summary.quizCount}</span>
                </div>
                {data.quizResults.length ? (
                    <div className="records-table-scroll">
                        <table className="records-table">
                            <thead>
                                <tr>
                                    <th scope="col">No.</th>
                                    <th scope="col">Quiz question</th>
                                                    <th scope="col">Course</th>
                                                    <th scope="col">Your answer</th>
                                                    <th scope="col">Auto grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.quizResults.map((result, index) => (
                                    <tr key={result.id}>
                                        <td>{(data.pagination.quizPage - 1) * data.pagination.pageSize + index + 1}</td>
                                        <td>{result.quiz?.question || "Quiz question"}</td>
                                        <td>{result.quiz?.course?.title || "Course"}</td>
                                        <td>{result.selectedAnswer}</td>
                                        <td>{result.score === 1 ? "Correct (100%)" : "Incorrect (0%)"}</td>
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
                {showPagination("quizPage", data.pagination.quizPage, data.pagination.quizPages)}
            </section>}

            {activeTab === "timed" && <section className="grades-section" role="tabpanel" id="grades-panel-timed" aria-labelledby="grades-tab-timed">
                <div className="section-heading">
                    <div><p className="eyebrow">TIMED ASSESSMENTS</p><h2>Assessment results</h2></div>
                    <span className="grades-section-count">{data.summary.assessmentCount}</span>
                </div>
                {data.assessmentResults.length ? (
                    <div className="records-table-scroll">
                        <table className="records-table">
                            <thead>
                                <tr>
                                    <th scope="col">No.</th>
                                    <th scope="col">Assessment</th>
                                    <th scope="col">Course</th>
                                    <th scope="col">Submitted</th>
                                    <th scope="col">Auto score</th>
                                    <th scope="col">Result</th>
                                    <th scope="col">Marking status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.assessmentResults.map((attempt, index) => (
                                    <tr key={attempt.id}>
                                        <td>{(data.pagination.assessmentPage - 1) * data.pagination.pageSize + index + 1}</td>
                                        <td>{attempt.assessment?.title || "Timed assessment"}</td>
                                        <td>{attempt.assessment?.course?.title || "Course"}</td>
                                        <td>{new Date(attempt.submittedAt).toLocaleDateString()}</td>
                                        <td>{attempt.score ?? "Pending"}/{attempt.totalMarks ?? "—"} marks</td>
                                        <td>{attempt.totalMarks
                                            ? `${Math.round(attempt.score * 100 / attempt.totalMarks)}%`
                                            : "—"}</td>
                                        <td>{attempt.theoryPending ? "Theory awaiting review" : "Auto-marked"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grade-empty">
                        <FaClipboardCheck aria-hidden="true" />
                        <strong>No timed assessments submitted</strong>
                        <span>Assessment scores and lecturer grades will appear here.</span>
                    </div>
                )}
                {showPagination("assessmentPage", data.pagination.assessmentPage, data.pagination.assessmentPages)}
            </section>}

            {activeTab === "coursework" && <section className="grades-section" role="tabpanel" id="grades-panel-coursework" aria-labelledby="grades-tab-coursework">
                <div className="section-heading">
                    <div><p className="eyebrow">COURSE WORK</p><h2>Assignment submissions</h2></div>
                    <span className="grades-section-count">{data.summary.submissionCount}</span>
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
                                        <td>{(data.pagination.submissionPage - 1) * data.pagination.pageSize + index + 1}</td>
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
                {showPagination("submissionPage", data.pagination.submissionPage, data.pagination.submissionPages)}
            </section>}
        </div>
    );
};

export default Grades;
