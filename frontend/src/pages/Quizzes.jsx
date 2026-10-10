import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaPlus, FaQuestionCircle, FaTimes } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import QuestionImportDialog from "../components/QuestionImportDialog";

const newQuestion = () => ({
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
    questionType: "MCQ",
    marks: 1
});

const Quizzes = () => {
    const { isStaff } = useAuth();
    const [courses, setCourses] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [formType, setFormType] = useState("assessment");
    const [questionImportOpen, setQuestionImportOpen] = useState(false);
    const [courseId, setCourseId] = useState("");
    const [assessmentForm, setAssessmentForm] = useState({
        title: "",
        instructions: "",
        timeLimitMinutes: 20,
        maxAttempts: 1,
        questions: [newQuestion()]
    });
    const [quickForm, setQuickForm] = useState(newQuestion);

    useEffect(() => {
        let active = true;
        const loadQuizzes = async () => {
            setLoading(true);
            setError("");
            try {
                const response = await API.get(isStaff ? "/courses/my" : "/enrollments/my-courses");
                const availableCourses = isStaff
                    ? response.data
                    : response.data.map((enrollment) => enrollment.course).filter(Boolean);
                const rows = await Promise.all(availableCourses.map(async (course) => {
                    const [assessmentResponse, quickQuizResponse] = await Promise.all([
                        API.get(`/quizzes/assessments/course/${course.id}`),
                        API.get(`/quizzes/course/${course.id}`)
                    ]);
                    return [
                        ...assessmentResponse.data.map((quiz) => ({
                            id: `assessment-${quiz.id}`,
                            type: "assessment",
                            sourceId: quiz.id,
                            title: quiz.title,
                            description: quiz.instructions,
                            questionCount: quiz.questions?.length || 0,
                            timeLimitMinutes: quiz.timeLimitMinutes,
                            courseId: course.id,
                            courseTitle: course.title
                        })),
                        ...quickQuizResponse.data.map((quiz) => ({
                            id: `quick-${quiz.id}`,
                            type: "quick",
                            sourceId: quiz.id,
                            title: quiz.question,
                            courseId: course.id,
                            courseTitle: course.title
                        }))
                    ];
                }));
                if (active) {
                    setCourses(availableCourses);
                    setQuizzes(rows.flat());
                    setCourseId((current) => current || String(availableCourses[0]?.id || ""));
                }
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.message || "Unable to load course quizzes.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadQuizzes();
        return () => { active = false; };
    }, [isStaff]);

    const visibleQuizzes = useMemo(() => {
        const query = search.trim().toLowerCase();
        return quizzes.filter((quiz) => {
            const matchesCourse = courseFilter === "all" || String(quiz.courseId) === courseFilter;
            const matchesSearch = !query || `${quiz.title} ${quiz.courseTitle} ${quiz.description || ""}`
                .toLowerCase()
                .includes(query);
            return matchesCourse && matchesSearch;
        });
    }, [courseFilter, quizzes, search]);

    const updateQuestion = (index, key, value) => {
        setAssessmentForm((current) => ({
            ...current,
            questions: current.questions.map((question, itemIndex) =>
                itemIndex === index ? {
                    ...question,
                    [key]: value,
                    ...(key === "questionType" ? { correctAnswer: value === "THEORY" ? null : "" } : {})
                } : question
            )
        }));
    };

    const importQuestions = (importedQuestions) => {
        if (assessmentForm.questions.filter((question) => question.question.trim()).length + importedQuestions.length > 100) {
            return "An assessment can contain at most 100 questions. Remove some questions before importing.";
        }
        setAssessmentForm((current) => ({
            ...current,
            questions: [...current.questions.filter((question) => question.question.trim()), ...importedQuestions]
        }));
        setCreateError("");
        return true;
    };

    const createQuiz = async (event) => {
        event.preventDefault();
        if (!courseId) {
            setCreateError("Choose a course for this quiz.");
            return;
        }
        if (formType === "assessment" && assessmentForm.questions.some((question) =>
            !question.question.trim() || !Number.isFinite(Number(question.marks)) || Number(question.marks) <= 0 ||
            (question.questionType !== "THEORY" &&
                (["A", "B", "C", "D"].filter((letter) => question[`option${letter}`].trim()).length < 2 ||
                    !question.correctAnswer || !question[`option${question.correctAnswer}`]?.trim()))
        )) {
            setCreateError("Complete each question. Multiple-choice questions need at least two options and a correct answer.");
            return;
        }
        setCreating(true);
        setCreateError("");
        try {
            if (formType === "assessment") {
                const response = await API.post("/quizzes/assessments", {
                    ...assessmentForm,
                    courseId: Number(courseId),
                    timeLimitMinutes: Number(assessmentForm.timeLimitMinutes),
                    maxAttempts: Number(assessmentForm.maxAttempts)
                });
                const course = courses.find((item) => String(item.id) === courseId);
                const assessment = response.data.assessment || response.data;
                setQuizzes((current) => [{
                    id: `assessment-${assessment.id}`,
                    type: "assessment",
                    sourceId: assessment.id,
                    title: assessment.title,
                    description: assessment.instructions,
                    questionCount: assessment.questions?.length || assessmentForm.questions.length,
                    timeLimitMinutes: assessment.timeLimitMinutes,
                    courseId: course.id,
                    courseTitle: course.title
                }, ...current]);
                setAssessmentForm({
                    title: "",
                    instructions: "",
                    timeLimitMinutes: 20,
                    maxAttempts: 1,
                    questions: [newQuestion()]
                });
            } else {
                const response = await API.post("/quizzes", { ...quickForm, courseId: Number(courseId) });
                const course = courses.find((item) => String(item.id) === courseId);
                const quiz = response.data.quiz || response.data;
                setQuizzes((current) => [{
                    id: `quick-${quiz.id}`,
                    type: "quick",
                    sourceId: quiz.id,
                    title: quiz.question,
                    courseId: course.id,
                    courseTitle: course.title
                }, ...current]);
                setQuickForm(newQuestion());
            }
            setIsCreateOpen(false);
            window.dispatchEvent(new Event("smartcampus:dashboard-refresh"));
        } catch (requestError) {
            setCreateError(requestError.response?.data?.message || "Unable to create this quiz.");
        } finally {
            setCreating(false);
        }
    };

    const closeCreate = () => {
        if (creating) return;
        setIsCreateOpen(false);
        setCreateError("");
    };

    return (
        <div className="page-content materials-page">
            <header className="materials-header">
                <div>
                    <p className="eyebrow">COURSE ASSESSMENTS</p>
                    <h1>Quizzes</h1>
                    <p className="subtitle">Find course quizzes and timed assessments.</p>
                </div>
                {isStaff && (
                    <button
                        type="button"
                        className="create-course-button"
                        aria-label="Create a quiz"
                        title="Create a quiz"
                        disabled={!courses.length}
                        onClick={() => {
                            setCreateError("");
                            setIsCreateOpen(true);
                        }}
                    >
                        <FaPlus aria-hidden="true" />
                    </button>
                )}
                {questionImportOpen && <QuestionImportDialog
                    onClose={() => setQuestionImportOpen(false)}
                    onImport={importQuestions}
                />}
            </header>

            <div className="materials-controls">
                <label className="catalog-search">
                    <span className="sr-only">Search quizzes</span>
                    <input
                        type="search"
                        placeholder="Search quizzes or courses"
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
            </div>

            {error && <p className="materials-error" role="alert">{error}</p>}
            {loading ? (
                <p role="status">Loading quizzes...</p>
            ) : visibleQuizzes.length ? (
                <div className="materials-list">
                    {visibleQuizzes.map((quiz) => (
                        <article className="material-item" key={quiz.id}>
                            <span className="material-item-icon"><FaQuestionCircle /></span>
                            <div className="material-item-content">
                                <h2>{quiz.title}</h2>
                                <Link to={`/courses/${quiz.courseId}?section=quizzes`} className="material-course-link">
                                    {quiz.courseTitle}
                                </Link>
                                {quiz.description && <p>{quiz.description}</p>}
                                <span className="quiz-item-meta">
                                    {quiz.type === "assessment"
                                        ? `Timed assessment · ${quiz.timeLimitMinutes} minutes · ${quiz.questionCount} questions`
                                        : "Quick quiz question"}
                                </span>
                            </div>
                            <Link
                                to={`/courses/${quiz.courseId}?section=quizzes`}
                                className="material-download quiz-open-link"
                            >
                                {isStaff ? "Open course" : "Open quiz"} <FaArrowRight />
                            </Link>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="materials-empty">
                    <FaQuestionCircle aria-hidden="true" />
                    <h2>{quizzes.length ? "No quizzes match your filters" : "No quizzes available yet"}</h2>
                    <p>{quizzes.length
                        ? "Try another search or choose a different course."
                        : "Quizzes published in your courses will appear here."}</p>
                </div>
            )}

            {isCreateOpen && (
                <div className="course-modal-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeCreate();
                }}>
                    <section className="course-modal quiz-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-quiz-heading">
                        <button type="button" className="course-modal-close" aria-label="Close quiz dialog" onClick={closeCreate}>
                            <FaTimes aria-hidden="true" />
                        </button>
                        <h2 id="create-quiz-heading">Create a quiz</h2>
                        <p className="course-modal-intro">Choose a course and quiz format, then publish it for your students.</p>
                        {createError && <p className="course-modal-feedback" role="alert">{createError}</p>}
                        <form className="course-create-form" onSubmit={createQuiz}>
                            <label>
                                Available courses
                                <select required value={courseId} onChange={(event) => setCourseId(event.target.value)} disabled={creating}>
                                    <option value="" disabled>Select a course</option>
                                    {courses.map((course) => (
                                        <option key={course.id} value={String(course.id)}>{course.title}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Quiz format
                                <select value={formType} onChange={(event) => setFormType(event.target.value)} disabled={creating}>
                                    <option value="assessment">Timed assessment</option>
                                    <option value="quick">Quick quiz question</option>
                                </select>
                            </label>
                            {formType === "assessment" ? (
                                <>
                                    <label>Assessment title<input required maxLength={255} value={assessmentForm.title} onChange={(event) => setAssessmentForm({ ...assessmentForm, title: event.target.value })} disabled={creating} /></label>
                                    <label>Time limit (minutes)<input type="number" min="1" max="600" required value={assessmentForm.timeLimitMinutes} onChange={(event) => setAssessmentForm({ ...assessmentForm, timeLimitMinutes: event.target.value })} disabled={creating} /></label>
                                    <label>Maximum attempts<input type="number" min="1" max="10" required value={assessmentForm.maxAttempts} onChange={(event) => setAssessmentForm({ ...assessmentForm, maxAttempts: event.target.value })} disabled={creating} /></label>
                                    <label>Instructions<textarea rows={2} value={assessmentForm.instructions} onChange={(event) => setAssessmentForm({ ...assessmentForm, instructions: event.target.value })} disabled={creating} /></label>
                                    {assessmentForm.questions.map((question, index) => (
                                        <fieldset className="quiz-question-fieldset" key={index}>
                                            <legend>Question {index + 1}</legend>
                                            <label>Question<input required value={question.question} onChange={(event) => updateQuestion(index, "question", event.target.value)} disabled={creating} /></label>
                                            <div className="quiz-question-controls">
                                                <label>Type<select value={question.questionType} onChange={(event) => updateQuestion(index, "questionType", event.target.value)} disabled={creating}>
                                                    <option value="MCQ">Multiple choice</option>
                                                    <option value="THEORY">Theory</option>
                                                </select></label>
                                                <label>Marks<input type="number" min="0.01" step="0.01" required value={question.marks} onChange={(event) => updateQuestion(index, "marks", event.target.value)} disabled={creating} /></label>
                                            </div>
                                            {question.questionType === "MCQ" && <>
                                                {["A", "B", "C", "D"].map((option) => (
                                                    <label key={option}>Option {option}<input value={question[`option${option}`]} onChange={(event) => updateQuestion(index, `option${option}`, event.target.value)} disabled={creating} /></label>
                                                ))}
                                                <label>Correct answer<select required value={question.correctAnswer || ""} onChange={(event) => updateQuestion(index, "correctAnswer", event.target.value)} disabled={creating}>
                                                    <option value="">Select answer</option>
                                                    {["A", "B", "C", "D"].filter((option) => question[`option${option}`].trim()).map((option) => <option key={option} value={option}>{option}</option>)}
                                                </select></label>
                                            </>}
                                            {assessmentForm.questions.length > 1 && (
                                                <button type="button" className="text-button" onClick={() => setAssessmentForm((current) => ({
                                                    ...current,
                                                    questions: current.questions.filter((_, itemIndex) => itemIndex !== index)
                                                }))} disabled={creating}>Remove question</button>
                                            )}
                                        </fieldset>
                                    ))}
                                    <div className="assessment-form-actions">
                                        <button type="button" className="btn btn-secondary btn-inline" disabled={creating || assessmentForm.questions.length >= 100} onClick={() => setAssessmentForm((current) => ({ ...current, questions: [...current.questions, newQuestion()] }))}>Add question</button>
                                        <button type="button" className="btn btn-secondary btn-inline" disabled={creating || assessmentForm.questions.length >= 100} onClick={() => setQuestionImportOpen(true)}>Import Questions</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label>Question<input required value={quickForm.question} onChange={(event) => setQuickForm({ ...quickForm, question: event.target.value })} disabled={creating} /></label>
                                    {["A", "B", "C", "D"].map((option) => (
                                        <label key={option}>Option {option}<input required value={quickForm[`option${option}`]} onChange={(event) => setQuickForm({ ...quickForm, [`option${option}`]: event.target.value })} disabled={creating} />
                                        </label>
                                    ))}
                                    <label>Correct answer<select value={quickForm.correctAnswer} onChange={(event) => setQuickForm({ ...quickForm, correctAnswer: event.target.value })} disabled={creating}>
                                        {["A", "B", "C", "D"].map((option) => <option key={option} value={option}>{option}</option>)}
                                    </select></label>
                                </>
                            )}
                            <div className="course-modal-actions">
                                <button type="button" className="course-cancel-button" onClick={closeCreate} disabled={creating}>Cancel</button>
                                <button type="submit" className="btn btn-inline" disabled={creating}>
                                    {creating ? "Publishing..." : "Publish quiz"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
};

export default Quizzes;
