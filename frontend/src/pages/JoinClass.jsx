import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const JoinClass = () => {
    const navigate = useNavigate();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            const res = await API.post("/enrollments/join", { classCode: code.toUpperCase().trim() });
            setSuccess(`Successfully joined "${res.data.course.title}"! Redirecting...`);
            window.dispatchEvent(new Event("smartcampus:dashboard-refresh"));
            window.dispatchEvent(new Event("smartcampus:courses-refresh"));
            setTimeout(() => navigate(`/courses/${res.data.course.id}?section=overview`), 1500);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to join class");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-box">
            <h2>Join a Class</h2>
            <p style={{ color: "var(--theme-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
                Enter the 6-8 character code your lecturer gave you.
            </p>

            {error && <p style={{ color: "#ff6b6b", marginBottom: 12, fontSize: "0.9rem" }}>{error}</p>}
            {success && <p style={{ color: "#00d464", marginBottom: 12, fontSize: "0.9rem" }}>{success}</p>}

            <form onSubmit={handleJoin}>
                <input
                    type="text"
                    placeholder="e.g. ABC123"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    style={{
                        letterSpacing: "0.3em",
                        fontSize: "1.4rem",
                        textAlign: "center",
                        fontWeight: 700
                    }}
                />
                <button className="btn" type="submit" disabled={loading || code.length < 6} style={{ marginTop: 12 }}>
                    {loading ? "Joining..." : "Join Class"}
                </button>
            </form>
        </div>
    );
};

export default JoinClass;