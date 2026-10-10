const dateLabel = (value) => value ? new Date(value).toLocaleString() : "—";

const QuizGradingTables = ({ gradebook, courses }) => {
    const courseGradebooks = courses || [{
        title: gradebook?.course?.title || "Course",
        gradebook
    }];
    const quickQuizResults = courseGradebooks.flatMap((course) =>
        (course.gradebook?.students || []).flatMap((student) => (student.quizResults || []).map((result) => ({
            id: `${course.gradebook?.course?.id || course.title}-${result.id}`,
            courseTitle: course.title,
            student,
            quiz: result.quiz,
            completedAt: result.createdAt,
            score: result.score > 0 ? "Correct" : "Incorrect",
            answer: result.selectedAnswer
        })))
    );
    const assessmentResults = courseGradebooks.flatMap((course) =>
        (course.gradebook?.students || []).flatMap((student) => (student.assessmentAttempts || [])
            .filter((attempt) => attempt.submittedAt)
            .map((attempt) => ({
                id: `${course.gradebook?.course?.id || course.title}-${attempt.id}`,
                courseTitle: course.title,
                student,
                assessment: attempt.assessment,
                completedAt: attempt.submittedAt,
                score: `${attempt.score}/${attempt.totalMarks ?? attempt.totalQuestions}`,
                theoryPending: attempt.theoryPending,
                percentage: attempt.totalMarks
                    ? Math.round(attempt.score * 100 / attempt.totalMarks)
                    : 0
            })))
    );

    return (
        <section className="quiz-grading-section">
            <h2>Quizzes and timed assessments</h2>
            <section className="quiz-grading-table-section">
                <h3>Quiz submissions</h3>
                {!quickQuizResults.length ? (
                    <p className="empty-state">No quick quiz submissions yet.</p>
                ) : (
                    <div className="grading-table-scroll">
                        <table className="grading-table quiz-grading-table">
                            <thead>
                                <tr>
                                    <th scope="col">Quiz question</th>
                                    <th scope="col">Course</th>
                                    <th scope="col">Student</th>
                                    <th scope="col">Submitted</th>
                                    <th scope="col">Answer</th>
                                    <th scope="col">Auto grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quickQuizResults.map((result) => (
                                    <tr key={result.id}>
                                        <td>{result.quiz?.question || "Quiz question"}</td>
                                        <td>{result.courseTitle}</td>
                                        <td>
                                            <strong>{result.student.fullName}</strong>
                                            <span className="records-table-secondary">{result.student.email}</span>
                                        </td>
                                        <td>{dateLabel(result.completedAt)}</td>
                                        <td>{result.answer}</td>
                                        <td><span className="grading-status graded">{result.score} ({result.score === "Correct" ? "100%" : "0%"})</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="quiz-grading-table-section">
                <h3>Assessment results</h3>
                {!assessmentResults.length ? (
                    <p className="empty-state">No completed timed assessments yet.</p>
                ) : (
                    <div className="grading-table-scroll">
                        <table className="grading-table quiz-grading-table">
                            <thead>
                                <tr>
                                    <th scope="col">Assessment</th>
                                    <th scope="col">Course</th>
                                    <th scope="col">Student</th>
                                    <th scope="col">Submitted</th>
                                    <th scope="col">Score</th>
                                    <th scope="col">Auto grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assessmentResults.map((result) => (
                                    <tr key={result.id}>
                                        <td>{result.assessment?.title || "Timed assessment"}</td>
                                        <td>{result.courseTitle}</td>
                                        <td>
                                            <strong>{result.student.fullName}</strong>
                                            <span className="records-table-secondary">{result.student.email}</span>
                                        </td>
                                        <td>{dateLabel(result.completedAt)}</td>
                                        <td>{result.score} {result.theoryPending ? "(provisional)" : `(${result.percentage}%)`}</td>
                                        <td><span className={result.theoryPending ? "grading-status pending" : "grading-status graded"}>
                                            {result.theoryPending ? "Theory marking pending" : "Graded"}
                                        </span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </section>
    );
};

export default QuizGradingTables;
