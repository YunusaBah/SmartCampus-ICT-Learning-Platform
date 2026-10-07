import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import RoleRoute from "./components/RoleRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import MyCourses from "./pages/MyCourses";
import Assignments from "./pages/Assignments";
import Grades from "./pages/Grades";
import JoinClass from "./pages/JoinClass";
import Students from "./pages/Students";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";
import Announcements from "./pages/Announcements";
import Messages from "./pages/Messages";
import Certificates from "./pages/Certificates";
import Todos from "./pages/Todos";

import "./styles/global.css";

const readAccountId = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return user?.id == null ? "guest" : String(user.id);
    } catch {
        return "guest";
    }
};

const themeKey = (accountId) => `smartcampus:theme:${accountId}`;

const readTheme = (accountId) => localStorage.getItem(themeKey(accountId)) === "dark" ? "dark" : "light";

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
    const [accountId, setAccountId] = useState(readAccountId);
    const [theme, setTheme] = useState(() => readTheme(readAccountId()));
    const closeSidebar = () => setSidebarOpen(false);
    const toggleSidebar = () => setSidebarOpen(prev => !prev);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(themeKey(accountId), theme);
    }, [accountId, theme]);

    useEffect(() => {
        const syncAccountTheme = () => {
            const nextAccountId = readAccountId();
            setAccountId(nextAccountId);
            setTheme(readTheme(nextAccountId));
        };
        const syncOtherTab = (event) => {
            if (event.key === "user" || event.key === "token") syncAccountTheme();
        };

        window.addEventListener("smartcampus:account-changed", syncAccountTheme);
        window.addEventListener("storage", syncOtherTab);
        return () => {
            window.removeEventListener("smartcampus:account-changed", syncAccountTheme);
            window.removeEventListener("storage", syncOtherTab);
        };
    }, []);

    useEffect(() => {
        document.documentElement.dataset.reducedMotion =
            localStorage.getItem("reducedMotion") === "true" ? "true" : "false";
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route
                        path="/"
                        element={
                            <Layout
                                open={sidebarOpen}
                                toggle={toggleSidebar}
                                onClose={closeSidebar}
                                theme={theme}
                                toggleTheme={() => setTheme(current => current === "dark" ? "light" : "dark")}
                            />
                        }
                    >
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="courses" element={<Courses />} />
                        <Route path="catalog" element={
                            <RoleRoute roles={["student"]}>
                                <Courses catalog />
                            </RoleRoute>
                        } />
                        <Route path="courses/:courseId" element={<CourseDetail />} />
                        <Route path="join" element={
                            <RoleRoute roles={["student"]}>
                                <JoinClass />
                            </RoleRoute>
                        } />
                        <Route path="my-courses" element={
                            <RoleRoute roles={["student"]}>
                                <MyCourses />
                            </RoleRoute>
                        } />
                        <Route path="assignments" element={<Assignments />} />
                        <Route path="students" element={
                            <RoleRoute roles={["lecturer"]}>
                                <Students />
                            </RoleRoute>
                        } />
                        <Route path="grades" element={
                            <RoleRoute roles={["student"]}>
                                <Grades />
                            </RoleRoute>
                        } />
                        <Route path="calendar" element={<Calendar />} />
                        <Route path="announcements" element={<Announcements />} />
                        <Route path="messages" element={
                            <RoleRoute roles={["student"]}>
                                <Messages />
                            </RoleRoute>
                        } />
                        <Route path="todo" element={
                            <RoleRoute roles={["student"]}>
                                <Todos />
                            </RoleRoute>
                        } />
                        <Route path="todo/:status" element={
                            <RoleRoute roles={["student"]}>
                                <Todos />
                            </RoleRoute>
                        } />
                        <Route path="certificates" element={
                            <RoleRoute roles={["student"]}>
                                <Certificates />
                            </RoleRoute>
                        } />
                        <Route path="settings" element={<Settings theme={theme} setTheme={setTheme} />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;