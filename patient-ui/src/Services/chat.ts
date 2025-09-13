// src/Services/chat.ts
import {
    HubConnection,
    HubConnectionBuilder,
    HttpTransportType,
} from "@microsoft/signalr";
import api from "../api";

// ===== Types =====
export type ChatMessage = {
    id: number;
    room: string;
    sender: string;
    text: string;
    sentAt: string; // ISO
    patientId: number | null;
};

export type ChatCreateDto = {
    room?: string | null;
    sender?: string | null;
    text: string;
    patientId?: number | null;
};

// Helper: get API base (strip trailing /api) and api key from axios defaults
function getApiBaseAndKey() {
    // e.g. http://localhost:5100/api -> http://localhost:5100
    const base = (api.defaults.baseURL ?? "").replace(/\/api\/?$/, "");
    // axios was created in api.ts with x-api-key if present
    const keyHeader =
        (api.defaults.headers?.common as any)?.["x-api-key"] ??
        (api.defaults.headers as any)?.["x-api-key"] ??
        "";
    return { base, apiKey: String(keyHeader || "") };
}

/** ✅ Hit a cheap HTTP endpoint to wake the Render (free) backend */
export async function warmApi(): Promise<void> {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        // Tiny request that also exercises the chat controller
        await api.get(`chat?room=${encodeURIComponent("lobby")}&take=1`, {
            signal: ctrl.signal,
        });
        clearTimeout(t);
    } catch {
        // ignore — this is just a warm-up
    }
}

// ===== SignalR connection factory =====
export function makeHubConnection(): HubConnection {
    const { base, apiKey } = getApiBaseAndKey();

    // Pass API key via query (?access_token=...) so ApiKeyMiddleware can validate WS
    const hubUrl = apiKey
        ? `${base}/hubs/chat?access_token=${encodeURIComponent(apiKey)}`
        : `${base}/hubs/chat`;

    return new HubConnectionBuilder()
        .withUrl(hubUrl, {
            // Allow fallback if WS isn't ready yet on cold start
            transport:
                HttpTransportType.WebSockets | HttpTransportType.LongPolling,
            // We’re not using JWT for the hub; keep it empty
            accessTokenFactory: () => "",
            // keep default skipNegotiation=false to allow fallback
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
        .build();
}

// ===== HTTP APIs =====
export async function getRecent(room: string, take = 50): Promise<ChatMessage[]> {
    const res = await api.get<ChatMessage[]>(
        `chat?room=${encodeURIComponent(room)}&take=${take}`
    );
    return res.data;
}

export async function sendMessageHttp(payload: ChatCreateDto): Promise<ChatMessage> {
    const res = await api.post<ChatMessage>("chat", payload);
    return res.data;
}

export async function getByPatient(patientId: number, take = 100): Promise<ChatMessage[]> {
    const res = await api.get<ChatMessage[]>(
        `chat/byPatient/${patientId}?take=${take}`
    );
    return res.data;
}
