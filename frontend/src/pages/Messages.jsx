import { useEffect, useState } from "react";
import { FaCommentDots, FaPaperPlane } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const Messages = () => {
    const { isStaff, user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [courseStudents, setCourseStudents] = useState([]);
    const [courseId, setCourseId] = useState("");
    const [conversations, setConversations] = useState([]);
    const [participantId, setParticipantId] = useState("");
    const [messages, setMessages] = useState([]);
    const [messageBody, setMessageBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);

    const activeCourse = courses.find((course) => String(course.id) === String(courseId));
    const activeConversation = conversations.find((item) =>
        String(item.participant?.id) === String(participantId)
    );
    const selectedParticipant = activeConversation?.participant ||
        courseStudents.find((student) => String(student.id) === String(participantId));

    useEffect(() => {
        let active = true;
        const loadCourses = async () => {
            try {
                const response = await API.get(isStaff ? "/courses/my" : "/enrollments/my-courses");
                const available = isStaff
                    ? response.data
                    : response.data.map((enrollment) => enrollment.course).filter(Boolean);
                if (active) {
                    setCourses(available);
                    setCourseId(available[0] ? String(available[0].id) : "");
                }
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.message || "Unable to load courses.");
            } finally {
                if (active) setLoading(false);
            }
        };
        loadCourses();
        return () => { active = false; };
    }, [isStaff]);

    useEffect(() => {
        if (!courseId) return;
        let active = true;
        API.get(`/courses/${courseId}/conversations`)
            .then((response) => {
                if (!active) return;
                setMessages([]);
                setConversations(response.data);
                if (!isStaff && activeCourse?.lecturerId) {
                    setParticipantId(String(activeCourse.lecturerId));
                } else if (isStaff) {
                    setParticipantId("");
                }
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Unable to load conversations.");
            });
        return () => { active = false; };
    }, [activeCourse?.lecturerId, courseId, isStaff]);

    useEffect(() => {
        if (!courseId || !isStaff) return;
        let active = true;
        API.get(`/courses/${courseId}`)
            .then((response) => {
                if (active) setCourseStudents(response.data.students || []);
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Unable to load course students.");
            });
        return () => { active = false; };
    }, [courseId, isStaff]);

    useEffect(() => {
        if (!courseId || !participantId) return;
        let active = true;
        API.get(`/courses/${courseId}/conversations/${participantId}`)
            .then((response) => {
                if (active) setMessages(response.data);
            })
            .catch((requestError) => {
                if (active) setError(requestError.response?.data?.message || "Unable to load this conversation.");
            });
        return () => { active = false; };
    }, [courseId, participantId]);

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!messageBody.trim() || !courseId || !participantId) return;
        setSending(true);
        setError("");
        try {
            const response = await API.post(`/courses/${courseId}/messages`, {
                recipientId: Number(participantId),
                body: messageBody.trim()
            });
            setMessages((current) => [...current, response.data]);
            setMessageBody("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to send your message.");
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="page-content dashboard-loading" role="status">Loading messages...</div>;

    return (
        <div className="page-content messages-page">
            <header className="feature-page-header">
                <div><p className="eyebrow">COURSE COMMUNICATION</p><h1>Messages</h1><p className="subtitle">Contact students or your course lecturer.</p></div>
                <span className="grades-header-icon"><FaCommentDots /></span>
            </header>
            {error && <div className="dashboard-alert" role="alert">{error}</div>}
            {!courses.length ? (
                <div className="feature-empty"><FaCommentDots /><strong>No courses to message from</strong><span>Join a class or create a course to start course conversations.</span></div>
            ) : (
                <>
                    <label className="messages-course-select">Course
                        <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                            {courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
                        </select>
                    </label>
                    <section className="messenger">
                        <aside className="conversation-list" aria-label="Conversations">
                            <h2>Conversations</h2>
                            {isStaff ? conversations.length ? conversations.map((conversation) => (
                                <button
                                    type="button"
                                    key={conversation.participant?.id}
                                    className={String(participantId) === String(conversation.participant?.id) ? "conversation-choice active" : "conversation-choice"}
                                    onClick={() => setParticipantId(String(conversation.participant?.id))}
                                >
                                    <strong>{conversation.participant?.fullName || "Student"}</strong>
                                    <span>{conversation.latestMessage?.body}</span>
                                </button>
                            )) : <p className="messenger-empty">No conversations in this course yet.</p> : (
                                <div className="conversation-choice active">
                                    <strong>{activeCourse?.lecturer?.fullName || "Course lecturer"}</strong>
                                    <span>Course lecturer</span>
                                </div>
                            )}
                            {isStaff && courseStudents
                                .filter((student) => !conversations.some((conversation) => String(conversation.participant?.id) === String(student.id)))
                                .map((student) => (
                                    <button
                                        type="button"
                                        key={student.id}
                                        className={String(participantId) === String(student.id) ? "conversation-choice active" : "conversation-choice"}
                                        onClick={() => setParticipantId(String(student.id))}
                                    >
                                        <strong>{student.fullName}</strong>
                                        <span>Start a conversation</span>
                                    </button>
                                ))}
                        </aside>
                        <div className="chat-area">
                            <div className="chat-heading">
                                <strong>{selectedParticipant?.fullName || activeCourse?.lecturer?.fullName || "Select a conversation"}</strong>
                                <span>{activeCourse?.title}</span>
                            </div>
                            <div className="chat-messages" aria-live="polite">
                                {messages.length ? messages.map((message) => (
                                    <article className={String(message.senderId) === String(user?.id) ? "chat-message own" : "chat-message"} key={message.id}>
                                        <p>{message.body}</p>
                                        <time>{new Date(message.createdAt).toLocaleString()}</time>
                                    </article>
                                )) : <div className="messenger-empty">No messages yet. Start the conversation below.</div>}
                            </div>
                            <form className="chat-compose" onSubmit={sendMessage}>
                                <label className="sr-only" htmlFor="chat-message">Write a message</label>
                                <input id="chat-message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write a message..." maxLength={20000} disabled={!participantId} />
                                <button type="submit" className="btn btn-inline" disabled={sending || !messageBody.trim() || !participantId} aria-label="Send message">
                                    <FaPaperPlane /><span>Send</span>
                                </button>
                            </form>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Messages;
