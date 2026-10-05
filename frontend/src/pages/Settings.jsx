import { useState } from "react";
import { FaMoon, FaShieldAlt, FaSun, FaUserCircle } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

const readMotionPreference = () => localStorage.getItem("reducedMotion") === "true";

const Settings = ({ theme, setTheme }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState({
        fullName: user?.fullName || "",
        email: user?.email || ""
    });
    const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [reducedMotion, setReducedMotion] = useState(readMotionPreference);
    const [profileStatus, setProfileStatus] = useState(null);
    const [passwordStatus, setPasswordStatus] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const saveProfile = async (event) => {
        event.preventDefault();
        setProfileStatus(null);
        setSavingProfile(true);

        try {
            const response = await API.patch("/auth/profile", profile);
            localStorage.setItem("user", JSON.stringify(response.data.user));
            window.dispatchEvent(new Event("smartcampus:user-updated"));
            setProfile({
                fullName: response.data.user.fullName,
                email: response.data.user.email
            });
            setProfileStatus({ type: "success", text: response.data.message });
        } catch (error) {
            setProfileStatus({
                type: "error",
                text: error.response?.data?.message || "Unable to update your profile."
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();
        setPasswordStatus(null);
        if (password.newPassword !== password.confirmPassword) {
            setPasswordStatus({ type: "error", text: "The new passwords do not match." });
            return;
        }
        if (password.newPassword.length < 6) {
            setPasswordStatus({ type: "error", text: "Your new password must be at least 6 characters." });
            return;
        }

        setSavingPassword(true);
        try {
            const response = await API.patch("/auth/password", {
                currentPassword: password.currentPassword,
                newPassword: password.newPassword
            });
            setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordStatus({ type: "success", text: response.data.message });
        } catch (error) {
            setPasswordStatus({
                type: "error",
                text: error.response?.data?.message || "Unable to update your password."
            });
        } finally {
            setSavingPassword(false);
        }
    };

    const changeTheme = (nextTheme) => {
        setTheme(nextTheme);
    };

    const changeMotionPreference = (enabled) => {
        setReducedMotion(enabled);
        localStorage.setItem("reducedMotion", String(enabled));
        document.documentElement.dataset.reducedMotion = String(enabled);
    };

    return (
        <div className="page-content settings-page">
            <header className="settings-header">
                <p className="eyebrow">PREFERENCES & ACCOUNT</p>
                <h1>Settings</h1>
                <p className="subtitle">Manage your SmartCampus account and how the learning platform looks.</p>
            </header>

            <section className="settings-section">
                <div className="settings-section-heading">
                    <span className="settings-section-icon"><FaUserCircle /></span>
                    <div>
                        <h2>Profile information</h2>
                        <p>Update the name and email address associated with your account.</p>
                    </div>
                </div>
                <form className="settings-form" onSubmit={saveProfile}>
                    <label>
                        Full name
                        <input
                            autoComplete="name"
                            maxLength={255}
                            required
                            value={profile.fullName}
                            onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                        />
                    </label>
                    <label>
                        Email address
                        <input
                            autoComplete="email"
                            type="email"
                            maxLength={254}
                            required
                            value={profile.email}
                            onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                        />
                    </label>
                    <div className="settings-form-footer">
                        {profileStatus && (
                            <p className={`settings-status ${profileStatus.type}`} role="status">{profileStatus.text}</p>
                        )}
                        <button className="btn btn-inline" type="submit" disabled={savingProfile}>
                            {savingProfile ? "Saving..." : "Save profile"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="settings-section">
                <div className="settings-section-heading">
                    <span className="settings-section-icon"><FaShieldAlt /></span>
                    <div>
                        <h2>Security</h2>
                        <p>Use your current password to set a new one for your account.</p>
                    </div>
                </div>
                <form className="settings-form" onSubmit={savePassword}>
                    <label>
                        Current password
                        <input
                            autoComplete="current-password"
                            type="password"
                            required
                            value={password.currentPassword}
                            onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                        />
                    </label>
                    <div className="settings-form-grid">
                        <label>
                            New password
                            <input
                                autoComplete="new-password"
                                type="password"
                                minLength={6}
                                required
                                value={password.newPassword}
                                onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                            />
                        </label>
                        <label>
                            Confirm new password
                            <input
                                autoComplete="new-password"
                                type="password"
                                minLength={6}
                                required
                                value={password.confirmPassword}
                                onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                            />
                        </label>
                    </div>
                    <div className="settings-form-footer">
                        {passwordStatus && (
                            <p className={`settings-status ${passwordStatus.type}`} role="status">{passwordStatus.text}</p>
                        )}
                        <button className="btn btn-inline" type="submit" disabled={savingPassword}>
                            {savingPassword ? "Updating..." : "Update password"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="settings-section">
                <div className="settings-section-heading">
                    <span className="settings-section-icon">{theme === "dark" ? <FaMoon /> : <FaSun />}</span>
                    <div>
                        <h2>Appearance & accessibility</h2>
                        <p>These preferences are saved in this browser and apply throughout SmartCampus.</p>
                    </div>
                </div>
                <div className="settings-preference-row">
                    <div>
                        <strong>Color theme</strong>
                        <span>Choose the display theme for your learning space.</span>
                    </div>
                    <div className="theme-options" role="group" aria-label="Color theme">
                        <button
                            type="button"
                            className={theme === "light" ? "theme-option selected" : "theme-option"}
                            aria-pressed={theme === "light"}
                            onClick={() => changeTheme("light")}
                        >
                            <FaSun aria-hidden="true" /> Light
                        </button>
                        <button
                            type="button"
                            className={theme === "dark" ? "theme-option selected" : "theme-option"}
                            aria-pressed={theme === "dark"}
                            onClick={() => changeTheme("dark")}
                        >
                            <FaMoon aria-hidden="true" /> Dark
                        </button>
                    </div>
                </div>
                <div className="settings-preference-row">
                    <div>
                        <strong>Reduce motion</strong>
                        <span>Limit non-essential transitions and animations.</span>
                    </div>
                    <label className="settings-switch">
                        <input
                            type="checkbox"
                            checked={reducedMotion}
                            onChange={(event) => changeMotionPreference(event.target.checked)}
                        />
                        <span className="settings-switch-track" aria-hidden="true" />
                        <span className="sr-only">Reduce motion</span>
                    </label>
                </div>
            </section>

            <p className="settings-role-note">
                Signed in as <strong>{user?.role || "user"}</strong>. Your access is managed by your SmartCampus role.
            </p>
        </div>
    );
};

export default Settings;
