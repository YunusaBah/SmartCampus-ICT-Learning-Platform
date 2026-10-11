export const defaultPageOptions = [
    { value: "/dashboard", label: "Dashboard" },
    { value: "/courses", label: "Courses" },
    { value: "/assignments", label: "Assignments" },
    { value: "/calendar", label: "Calendar" }
];

const defaultPagePaths = new Set(defaultPageOptions.map(({ value }) => value));

export const defaultPageStorageKey = (userId) => `smartcampus:default-page:${userId}`;
export const notificationBadgeStorageKey = (userId) => `smartcampus:notification-badge:${userId}`;
export const reducedMotionStorageKey = (userId) => `smartcampus:reduced-motion:${userId}`;

export const readDefaultPage = (userId) => {
    if (userId == null) return "/dashboard";
    const page = localStorage.getItem(defaultPageStorageKey(userId));
    return defaultPagePaths.has(page) ? page : "/dashboard";
};

export const readNotificationBadge = (userId) =>
    userId == null || localStorage.getItem(notificationBadgeStorageKey(userId)) !== "false";

export const readReducedMotion = (userId) => {
    if (userId == null) return false;
    const preference = localStorage.getItem(reducedMotionStorageKey(userId));
    return preference === null
        ? localStorage.getItem("reducedMotion") === "true"
        : preference === "true";
};
