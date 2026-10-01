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
import Admin from "./pages/Admin";
import JoinClass from "./pages/JoinClass";
import Students from "./pages/Students";

import "./styles/global.css";

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");
        return savedTheme === "light" ? "light" : "dark";
    });
    const closeSidebar = () => setSidebarOpen(false);
    const toggleSidebar = () => setSidebarOpen(prev => !prev);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("theme", theme);
    }, [theme]);

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
                            <RoleRoute roles={["lecturer", "admin"]}>
                                <Students />
                            </RoleRoute>
                        } />
                        <Route path="grades" element={
                            <RoleRoute roles={["student"]}>
                                <Grades />
                            </RoleRoute>
                        } />
                        <Route path="admin" element={
                            <RoleRoute roles={["admin"]}>
                                <Admin />
                            </RoleRoute>
                        } />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;