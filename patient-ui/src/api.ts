// src/api.ts
import axios from "axios";

/**
* Base rules:
* - If VITE_API_URL is set, we use it (recommended).
* - Otherwise, when running Vite on 5173, we default to https://localhost:7100 (Kestrel HTTPS).
* - For any other host (e.g., deployed), we use the current origin.
* - We always append /api.
*/
const rawBase =
    import.meta.env.VITE_API_URL ??
    (window.location.port === "5173"
        ? "https://localhost:7100"
        : window.location.origin);

const base = `${rawBase.replace(/\/$/, "")}/api`;

const api = axios.create({
    baseURL: base,
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
});

export default api;