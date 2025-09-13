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

// Helper: get API base and API key from axios defaults
function getApiBaseAndKey() {
    const base = (api.defaults.baseURL ?? "").replace(/\/api\/?$/, "");
    const keyHeader =
        (api.defaults.headers?.common as any)?.["x-api-key"] ??
        (api.defaults.headers as any)?.["x-api-key"] ??
        "";
    return { base, apiKey: String(keyHeader || "") };
}

/** Wake API (cold start) */
export async function warmApi(): Promise<void> {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        await api.get(`chat?room=${encodeURIComponent("lobby")}&take=1`, {
            signal: ctrl.signal,
        });
        clearTimeout(t);
    } catch { }
}

// ===== SignalR connection factory =====
export function makeHubConnection(): HubConnection {
    const { base, apiKey } = getApiBaseAndKey();

    const hubUrl = `${base}/hubs/chat`;

    return new HubConnectionBuilder()
        .withUrl(hubUrl, {
            transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
            accessTokenFactory: () => "", // not using JWT for hub
            headers: apiKey ? { "x-api-key": apiKey } : {}, // ✅ prefer header auth
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
        .build();
}

// ===== HTTP APIs =====
export async function getRecent(room: string, take = 50): Promise<ChatMessage[]> {
    const res = await api.get<ChatMessage[]>(`chat?room=${encodeURIComponent(room)}&take=${take}`);
    return res.data;
}

export async function sendMessageHttp(payload: ChatCreateDto): Promise<ChatMessage> {
    const res = await api.post<ChatMessage>("chat", payload);
    return res.data;
}

export async function getByPatient(patientId: number, take = 100): Promise<ChatMessage[]> {
    const res = await api.get<ChatMessage[]>(`chat/byPatient/${patientId}?take=${take}`);
    return res.data;
}
