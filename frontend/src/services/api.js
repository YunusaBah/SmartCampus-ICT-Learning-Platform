import axios from "axios";
import API_BASE from "../config";
import {
    clearOfflineResponsesForAccount,
    isFreshOfflineResponse,
    readOfflineResponse,
    saveOfflineResponse
} from "./offlineCache";

const API = axios.create({
    baseURL: `${API_BASE}/api`,
    timeout: 90000,
    headers: {
        "Content-Type": "application/json"
    }
});

const requestNetworkGet = API.get.bind(API);

const getAccountId = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return user?.id == null ? null : String(user.id);
    } catch {
        return null;
    }
};

const toCachedResponse = (entry, config) => ({
    data: entry.data,
    status: 200,
    statusText: "OK (cached)",
    headers: {},
    config,
    request: undefined
});

const cacheKeyFor = (accountId, url, config) => {
    const requestConfig = {
        ...config,
        baseURL: `${API_BASE}/api`,
        url,
        method: "get"
    };
    return `${accountId}:${API.getUri(requestConfig)}`;
};

API.get = async (url, config = {}) => {
    const accountId = getAccountId();
    if (!accountId) return requestNetworkGet(url, config);

    const cacheKey = cacheKeyFor(accountId, url, config);
    let cachedEntry = null;
    try {
        cachedEntry = await readOfflineResponse(cacheKey);
    } catch (error) {
        console.warn("Could not read SmartCampus offline cache:", error);
    }

    if (cachedEntry && (!navigator.onLine || isFreshOfflineResponse(cachedEntry))) {
        return toCachedResponse(cachedEntry, config);
    }

    try {
        const response = await requestNetworkGet(url, config);
        try {
            await saveOfflineResponse(cacheKey, response.data);
        } catch (error) {
            console.warn("Could not save SmartCampus offline data:", error);
        }
        return response;
    } catch (error) {
        if (!cachedEntry && (!error.response || error.response.status >= 500)) {
            try {
                cachedEntry = await readOfflineResponse(cacheKey);
            } catch (cacheError) {
                console.warn("Could not read SmartCampus offline cache:", cacheError);
            }
        }

        if (cachedEntry && (!error.response || error.response.status >= 500)) {
            window.dispatchEvent(new Event("smartcampus:api-offline"));
            return toCachedResponse(cachedEntry, config);
        }
        throw error;
    }
};

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
    async (response) => {
        if (response.config.method !== "get") {
            const accountId = getAccountId();
            if (accountId) {
                try {
                    await clearOfflineResponsesForAccount(accountId);
                } catch (error) {
                    console.warn("Could not refresh SmartCampus offline data:", error);
                }
            }
        }
        return response;
    },
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
