// src/api.ts
import axios from "axios";

// Backend base URL (DEV): change here if your API port changes
// Prefer the .env value; otherwise default to https://localhost:7100
const rawBase =
    import.meta.env.VITE_API_URL || "https://localhost:7100";

// Always end with /api
const baseURL = `${rawBase.replace(/\/$/, "")}/api`;

// Optional API key (not required for JWT auth)
const apiKey = import.meta.env.VITE_API_KEY || "";

// Where we store the JWT
export const JWT_STORAGE_KEY =
    import.meta.env.VITE_JWT_STORAGE_KEY || "jwt";

// Axios instance
const api = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    withCredentials: false,
});

// Attach Bearer automatically if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(JWT_STORAGE_KEY);
    if (token) {
        (config.headers ||= {}).Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
