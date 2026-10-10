import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import API_BASE from "../config";
import Register from "./Register";
import GoogleSignInButton from "../components/GoogleSignInButton";

const readResetTokenFromHash = () =>
    new URLSearchParams(window.location.hash.slice(1)).get("resetToken") || "";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const successMsg = location.state?.message || "";

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetToken, setResetToken] = useState(readResetTokenFromHash);
    const [loginOpen, setLoginOpen] = useState(() => Boolean(resetToken));
    const [registerOpen, setRegisterOpen] = useState(false);
    const [developerOpen, setDeveloperOpen] = useState(false);
    const [loginRole, setLoginRole] = useState("");
    const [registrationMessage, setRegistrationMessage] = useState("");
    const [recoveryMode, setRecoveryMode] = useState(() => resetToken ? "reset" : "");
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [recoveryStatus, setRecoveryStatus] = useState("");

    const finishLogin = (result) => {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        window.dispatchEvent(new Event("smartcampus:account-changed"));
        navigate("/dashboard");
    };

    useEffect(() => {
        if (!loginOpen && !registerOpen && !developerOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setLoginOpen(false);
                setRegisterOpen(false);
                setDeveloperOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [loginOpen, registerOpen, developerOpen]);

    useEffect(() => {
        if (!new URLSearchParams(location.hash.slice(1)).has("resetToken")) return;
        navigate({
            pathname: location.pathname,
            search: location.search,
            hash: ""
        }, { replace: true });
    }, [location.hash, location.pathname, location.search, navigate]);

    const openLogin = () => {
        setError("");
        setLoginRole("");
        setRecoveryMode("");
        setRecoveryStatus("");
        setLoginOpen(true);
    };

    const openRegister = () => {
        setRegistrationMessage("");
        setRegisterOpen(true);
    };

    const closeModals = () => {
        setLoginOpen(false);
        setRegisterOpen(false);
        setDeveloperOpen(false);
        setRecoveryMode("");
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post("/auth/login", { ...formData, role: loginRole });
            if (loginRole && res.data.user.role !== loginRole) {
                setError(`This account is registered as a ${res.data.user.role}. Choose ${res.data.user.role} to sign in.`);
                return;
            }
            finishLogin(res);
        } catch (error) {
            setError(error.response?.data?.message || (
                error.code === "ECONNABORTED" || error.code === "ERR_NETWORK"
                    ? `SmartCampus could not reach the API at ${API_BASE}. Check that ${API_BASE}/health returns status ok, VITE_API_URL points to your Node API, and Render's CLIENT_URL includes this Netlify site.`
                    : "Login failed. Please try again."
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleCredential = async (credential) => {
        if (!loginRole || loading) return;
        setLoading(true);
        setError("");
        try {
            const response = await API.post("/auth/google/login", {
                credential,
                role: loginRole
            });
            finishLogin(response);
        } catch (googleError) {
            setError(googleError.response?.data?.message || (
                googleError.code === "ECONNABORTED" || googleError.code === "ERR_NETWORK"
                    ? `SmartCampus could not reach the API at ${API_BASE}. Check your connection and try again.`
                    : "Google login failed. Please try again."
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleRecoverySubmit = async (event) => {
        event.preventDefault();
        setRecoveryStatus("");
        setError("");
        setLoading(true);
        try {
            if (recoveryMode === "request") {
                const response = await API.post("/auth/password/forgot", { email: recoveryEmail });
                if (response.data.resetToken) {
                    setResetToken(response.data.resetToken);
                    setRecoveryMode("reset");
                    setRecoveryStatus("Development reset token generated. Choose a new password below.");
                } else {
                    setRecoveryStatus(response.data.message);
                }
                return;
            }

            if (newPassword !== confirmPassword) {
                setError("The new passwords do not match.");
                return;
            }
            const response = await API.post("/auth/password/reset", {
                token: resetToken,
                newPassword
            });
            setLoginOpen(false);
            setRecoveryMode("");
            setNewPassword("");
            setConfirmPassword("");
            navigate("/login", {
                replace: true,
                state: { message: response.data.message }
            });
        } catch (recoveryError) {
            setError(recoveryError.response?.data?.message || "Unable to process password recovery.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-portal">
            <div className="login-landing">
                <section className="login-welcome">
                    <div className="utg-header">
                        <p className="login-eyebrow">THE UNIVERSITY OF THE GAMBIA</p>
                    </div>
                    <h1>SmartCampus</h1>
                    <p className="login-welcome-copy">
                        Your campus learning, coursework, classes and updates in one connected place.
                    </p>
                    {successMsg && <p className="login-success" role="status">{successMsg}</p>}
                    {registrationMessage && <p className="login-success" role="status">{registrationMessage}</p>}
                    <div className="login-actions">
                        <button className="login-action-primary" type="button" onClick={openLogin}>
                            Login
                        </button>
                        <button className="login-action-secondary" type="button" onClick={openRegister}>
                            Create account
                        </button>
                    </div>
                </section>

                <aside className="login-project-notes">
                    <p className="login-eyebrow">PROJECT NOTES</p>
                    <h2>Learning that stays connected</h2>
                    <p>
                        SmartCampus brings the everyday parts of university learning together in one place.
                    </p>
                    <ul>
                        <li>Find course materials, announcements and classmates.</li>
                        <li>Keep track of assignments, deadlines and grades.</li>
                        <li>Stay up to date with class activities and campus learning.</li>
                    </ul>
                </aside>
            </div>

            <footer className="login-about">
                <button
                    className="developer-profile-trigger"
                    type="button"
                    onClick={() => setDeveloperOpen(true)}
                    aria-label="View Yunusa Bah's developer profile"
                >
                    <span className="developer-avatar" aria-hidden="true">YB</span>
                    <span className="developer-trigger-copy">
                        <strong>Yunusa Bah</strong>
                        <span>Developer profile</span>
                    </span>
                    <span className="developer-trigger-arrow" aria-hidden="true">→</span>
                </button>
                <div>
                    <p className="login-eyebrow">ABOUT SMARTCAMPUS</p>
                    <p>A learning platform for the University of The Gambia community.</p>
                </div>
                <div className="login-contact">
                    <strong>Contact</strong>
                    <a href="tel:+220833359853">+220 833359853</a>
                    <a href="tel:+220866726322">+220 866726322</a>
                </div>
                <div className="login-contact">
                    <strong>Email</strong>
                    <a href="mailto:yb22423255@utg.edu.gm">yb22423255@utg.edu.gm</a>
                    <a href="mailto:bahy1878@gmail.com">bahy1878@gmail.com</a>
                </div>
            </footer>

            {developerOpen && (
                <div
                    className="auth-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setDeveloperOpen(false);
                    }}
                >
                    <section
                        className="developer-profile-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="developer-profile-title"
                    >
                        <button
                            className="auth-modal-close"
                            type="button"
                            onClick={() => setDeveloperOpen(false)}
                            aria-label="Close developer profile"
                        >
                            ×
                        </button>
                        <header className="developer-profile-header">
                            <span className="developer-avatar developer-avatar-large" aria-hidden="true">YB</span>
                            <div>
                                <p className="login-eyebrow">PROJECT DEVELOPER</p>
                                <h2 id="developer-profile-title">Yunusa Bah</h2>
                                <p>SmartCampus creator</p>
                            </div>
                        </header>

                        <div className="developer-profile-content">
                            <section>
                                <h3>Qualifications</h3>
                                <p>
                                    A third-year Computer Science student and aspiring full-stack software developer
                                    with hands-on experience building web applications.
                                </p>
                            </section>
                            <section>
                                <h3>Why I created SmartCampus</h3>
                                <p>
                                    I created this project to bring course information, class communication and learning
                                    activities into one accessible campus platform, making it easier for students and
                                    lecturers to stay organized and connected.
                                </p>
                            </section>
                            <section>
                                <h3>Project benefits</h3>
                                <ul>
                                    <li>One place for courses, materials, announcements and class communication.</li>
                                    <li>Clearer tracking of assignments, deadlines, submissions and grades.</li>
                                    <li>A more connected learning experience for students and lecturers.</li>
                                </ul>
                            </section>
                        </div>
                    </section>
                </div>
            )}

            {loginOpen && (
                <div
                    className="auth-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModals();
                    }}
                >
                    <section
                        className="form-box login-card login-modal-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="login-title"
                    >
                        <button
                            className="auth-modal-close"
                            type="button"
                            onClick={() => setLoginOpen(false)}
                            aria-label="Close login form"
                        >
                            ×
                        </button>
                        <header className="login-card-heading">
                            <p className="login-eyebrow">THE UNIVERSITY OF THE GAMBIA</p>
                            <h2 id="login-title">
                                {recoveryMode === "request" ? "Recover your account" :
                                    recoveryMode === "reset" ? "Choose a new password" : "Welcome back"}
                            </h2>
                            <p>{recoveryMode === "request"
                                ? "Enter your email and we’ll send recovery instructions if an eligible account exists."
                                : recoveryMode === "reset"
                                    ? "Use a new password to secure your account."
                                    : "Choose your account type to continue."}</p>
                        </header>

                        {recoveryMode ? (
                            <>
                                {recoveryStatus && <p className="login-success" role="status">{recoveryStatus}</p>}
                                {error && <p className="login-error" role="alert">{error}</p>}
                                <form className="login-form" onSubmit={handleRecoverySubmit}>
                                    {recoveryMode === "request" ? (
                                        <label>
                                            Email address
                                            <input
                                                type="email"
                                                autoComplete="email"
                                                maxLength={254}
                                                required
                                                value={recoveryEmail}
                                                onChange={(event) => setRecoveryEmail(event.target.value)}
                                            />
                                        </label>
                                    ) : (
                                        <>
                                            <label>
                                                New password
                                                <input
                                                    type="password"
                                                    autoComplete="new-password"
                                                    minLength={6}
                                                    required
                                                    value={newPassword}
                                                    onChange={(event) => setNewPassword(event.target.value)}
                                                />
                                            </label>
                                            <label>
                                                Confirm new password
                                                <input
                                                    type="password"
                                                    autoComplete="new-password"
                                                    minLength={6}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                                />
                                            </label>
                                        </>
                                    )}
                                    <button className="btn" type="submit" disabled={loading}>
                                        {loading ? "Please wait..." : recoveryMode === "request" ? "Send recovery instructions" : "Reset password"}
                                    </button>
                                </form>
                                <p className="login-register-link">
                                    <button
                                        className="login-register-trigger"
                                        type="button"
                                        onClick={() => {
                                            setRecoveryMode("");
                                            setRecoveryStatus("");
                                            setError("");
                                        }}
                                    >
                                        Back to login
                                    </button>
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="account-type-picker" aria-label="Choose account type">
                                    {["student", "lecturer"].map((role) => (
                                        <button
                                            className={loginRole === role ? "active" : ""}
                                            key={role}
                                            type="button"
                                            aria-pressed={loginRole === role}
                                            onClick={() => {
                                                setLoginRole(role);
                                                setError("");
                                            }}
                                        >
                                            {role === "student" ? "Student" : "Lecturer"}
                                        </button>
                                    ))}
                                </div>
                                {loginRole && (
                            <>
                                {error && <p className="login-error" role="alert">{error}</p>}
                                <div className="google-signin-section">
                                    <p className="google-signin-copy">
                                        Sign in with the Google account used to create your {loginRole} account.
                                    </p>
                                    <GoogleSignInButton
                                        onCredential={handleGoogleCredential}
                                        onError={setError}
                                    />
                                    {loading && <p className="google-signin-loading" role="status">Signing in…</p>}
                                </div>
                                <div className="auth-divider"><span>or use your password</span></div>
                                <form className="login-form" onSubmit={handleSubmit}>
                                    <label>
                                        {loginRole === "student" ? "Student email" : "Lecturer email"}
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </label>
                                    <label>
                                        Password
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </label>
                                    <button className="btn" type="submit" disabled={loading}>
                                        {loading ? "Signing in..." : "Login"}
                                    </button>
                                </form>
                            </>
                                )}
                                <p className="login-register-link">
                                    <button
                                        className="login-register-trigger"
                                        type="button"
                                        onClick={() => {
                                            setRecoveryEmail(formData.email);
                                            setRecoveryStatus("");
                                            setError("");
                                            setRecoveryMode("request");
                                        }}
                                    >
                                        Forgot password?
                                    </button>
                                </p>
                            </>
                        )}
                        {!recoveryMode && <p className="login-register-link">
                            Don&apos;t have an account?{" "}
                            <button
                                className="login-register-trigger"
                                type="button"
                                onClick={() => {
                                    setLoginOpen(false);
                                    openRegister();
                                }}
                            >
                                Create one
                            </button>
                        </p>}
                    </section>
                </div>
            )}

            {registerOpen && (
                <Register
                    embedded
                    onClose={() => setRegisterOpen(false)}
                    onSuccess={() => {
                        setRegisterOpen(false);
                        setRegistrationMessage("Account created successfully. You can now log in.");
                    }}
                    onLogin={() => {
                        setRegisterOpen(false);
                        openLogin();
                    }}
                />
            )}
        </main>
    );
};

export default Login;
