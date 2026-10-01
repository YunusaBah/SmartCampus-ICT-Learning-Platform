import { FaBars, FaMoon, FaSun } from "react-icons/fa";

const Navbar = ({ toggle, theme, toggleTheme }) => {
    return (
        <div className="navbar">
            <button
                type="button"
                className="navbar-menu"
                aria-label="Toggle sidebar"
                onClick={toggle}
            >
                <FaBars aria-hidden="true" />
            </button>
            <h2>SmartCampus LMS</h2>
            <button
                type="button"
                className="theme-toggle"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-pressed={theme === "light"}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                onClick={toggleTheme}
            >
                {theme === "dark" ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
        </div>
    );
};

export default Navbar;
