import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import API_BASE from "../config";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const successMsg = location.state?.message || "";

    const [formData, setFormData] = useState({ email: "", password: "" });
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
            const res = await API.post("/auth/login", formData);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/dashboard");
        } catch (error) {
            setError(error.response?.data?.message || (
                error.code === "ECONNABORTED" || error.code === "ERR_NETWORK"
                    ? `SmartCampus could not reach the API at ${API_BASE}. Check that the backend is running and that VITE_API_URL points to the correct server.`
                    : "Login failed. Please try again."
            ));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-box">
            <h2>Login</h2>

            {successMsg && (
                <p style={{ color: "#00d464", marginBottom: 12, fontSize: "0.9rem" }}>
                    {successMsg}
                </p>
            )}

            {error && (
                <p style={{ color: "#ff6b6b", marginBottom: 12, fontSize: "0.9rem" }}>
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit}>
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
                    placeholder="Password"
                    onChange={handleChange}
                    required
                />
                <button className="btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>

            <p style={{ marginTop: 16 }}>
                Don't have an account? <Link to="/register">Register</Link>
            </p>
        </div>
    );
};

export default Login;