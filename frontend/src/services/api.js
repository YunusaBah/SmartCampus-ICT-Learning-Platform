import axios from "axios";
import API_BASE from "../config";

const API = axios.create({
    baseURL: `${API_BASE}/api`,
    timeout: 90000,
    headers: {
        "Content-Type": "application/json"
    }
});

API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.dispatchEvent(new Event("smartcampus:account-changed"));

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default API;
