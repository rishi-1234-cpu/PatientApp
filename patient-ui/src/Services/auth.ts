// src/Services/auth.ts
import api, { JWT_STORAGE_KEY } from "../api";

export type UserResponseDto = {
    userName: string;
    email: string;
    token: string;
    roles: string[];
};

export function setAuthToken(token: string | null) {
    if (!token) {
        localStorage.removeItem(JWT_STORAGE_KEY);
        delete api.defaults.headers.common?.Authorization;
        return;
    }
    localStorage.setItem(JWT_STORAGE_KEY, token);
    (api.defaults.headers as any) = api.defaults.headers || {};
    api.defaults.headers.common = api.defaults.headers.common || {};
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function isLoggedIn(): boolean {
    const t = localStorage.getItem(JWT_STORAGE_KEY);
    return !!t && t.length > 0;
}

export function initAuthFromStorage() {
    const t = localStorage.getItem(JWT_STORAGE_KEY);
    if (t) setAuthToken(t);
}

export function logout() {
    setAuthToken(null);
    localStorage.removeItem("auth_user");
}

export async function loginUser(userNameOrEmail: string, password: string) {
    // ⚠️ IMPORTANT: matches your controller [HttpPost("login")]
    // Base url already has /api, so this becomes /api/Auth/login
    const body = { userName: userNameOrEmail, password };
    const { data } = await api.post<UserResponseDto>("Auth/login", body);

    setAuthToken(data.token);
    localStorage.setItem("auth_user", JSON.stringify({
        userName: data.userName,
        email: data.email,
        roles: data.roles || [],
    }));
    return data;
}
