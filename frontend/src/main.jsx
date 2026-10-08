import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then(() => navigator.serviceWorker.ready)
            .then((registration) => {
                const assets = performance.getEntriesByType("resource")
                    .map((entry) => entry.name)
                    .filter((name) => new URL(name).origin === window.location.origin);
                registration.active?.postMessage({ type: "CACHE_APP_ASSETS", assets });
            })
            .catch((error) => console.error("SmartCampus offline shell could not be installed:", error));
    });
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);