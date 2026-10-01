import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        lecturerCode: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post("/auth/register", formData);
            navigate("/login", {
                state: { message: "Registration successful! Please log in." }
            });
        } catch (error) {
            setError(error.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-box">
            <h2>Create Account</h2>

            {error && (
                <p style={{ color: "#ff6b6b", marginBottom: 12, fontSize: "0.9rem" }}>
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    onChange={handleChange}
                    required
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password (min 6 characters)"
                    onChange={handleChange}
                    minLength={6}
                    required
                />

                <div style={{
                    borderTop: "1px solid var(--theme-border)",
                    marginTop: 16,
                    paddingTop: 16
                }}>
                    <p style={{ color: "var(--theme-muted)", fontSize: "0.85rem", marginBottom: 8 }}>
                        Are you a lecturer? Enter your lecturer code below.
                        Leave empty to register as a student.
                    </p>
                    <input
                        type="text"
                        name="lecturerCode"
                        placeholder="Lecturer code (leave empty for student)"
                        onChange={handleChange}
                    />
                </div>

                <button className="btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>

            <p style={{ marginTop: 16 }}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};

export default Register;