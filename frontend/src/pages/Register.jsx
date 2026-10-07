import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import API_BASE from "../config";

const Register = ({ embedded = false, onClose, onSuccess, onLogin }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "",
        matNumber: "",
        phone: "",
        lecturerCode: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!embedded) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [embedded, onClose]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post("/auth/register", formData);
            if (onSuccess) {
                onSuccess();
            } else {
                navigate("/login", {
                    state: { message: "Registration successful! Please log in." }
                });
            }
        } catch (error) {
            setError(error.response?.data?.message || (
                error.code === "ECONNABORTED" || error.code === "ERR_NETWORK"
                    ? `SmartCampus could not reach the API at ${API_BASE}. Check that ${API_BASE}/health returns status ok, VITE_API_URL points to your Node API, and Render's CLIENT_URL includes this Netlify site.`
                    : "Registration failed. Please try again."
            ));
        } finally {
            setLoading(false);
        }
    };

    const formCard = (
        <section
            className={`form-box register-card${embedded ? " register-modal-card" : ""}`}
            aria-labelledby="register-title"
            role={embedded ? "dialog" : undefined}
            aria-modal={embedded ? "true" : undefined}
        >
            {embedded && (
                <button
                    className="register-modal-close"
                    type="button"
                    onClick={onClose}
                    aria-label="Close registration form"
                >
                    ×
                </button>
            )}
            <header className="register-heading">
                <p className="register-eyebrow">THE UNIVERSITY OF THE GAMBIA</p>
                <h2 id="register-title">Create your account</h2>
                <p>Choose your account type to see the registration form.</p>
            </header>

            {error && <p className="register-error" role="alert">{error}</p>}

            <div className="account-type-picker" aria-label="Choose account type">
                {["student", "lecturer"].map((role) => (
                    <button
                        className={formData.role === role ? "active" : ""}
                        key={role}
                        type="button"
                        aria-pressed={formData.role === role}
                        onClick={() => {
                            setFormData((current) => ({ ...current, role }));
                            setError("");
                        }}
                    >
                        {role === "student" ? "Student" : "Lecturer"}
                    </button>
                ))}
            </div>

            {formData.role && <form className="register-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    autoComplete="name"
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

                {formData.role === "student" && (
                    <>
                        <input
                            type="text"
                            name="matNumber"
                            placeholder="Student ID / Matriculation number"
                            maxLength={50}
                            autoComplete="off"
                            value={formData.matNumber}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Phone number"
                            maxLength={30}
                            autoComplete="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </>
                )}

                {formData.role === "lecturer" && (
                    <div className="register-lecturer-field">
                        <p className="register-lecturer-hint">
                            Enter the lecturer code to create a lecturer account.
                        </p>
                        <input
                            type="text"
                            name="lecturerCode"
                            placeholder="Lecturer code"
                            value={formData.lecturerCode}
                            onChange={handleChange}
                            required
                        />
                    </div>
                )}

                <button className="btn register-submit" type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>}

            <p className="register-login-link">
                Already have an account?{" "}
                {onLogin
                    ? <button type="button" onClick={onLogin}>Login</button>
                    : embedded
                        ? <button type="button" onClick={onClose}>Login</button>
                        : <Link to="/login">Login</Link>}
            </p>
        </section>
    );

    if (!embedded) return formCard;

    return (
        <div
            className="register-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            {formCard}
        </div>
    );
};

export default Register;