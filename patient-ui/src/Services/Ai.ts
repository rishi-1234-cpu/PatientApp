import axios from "axios";

/**
* Base URL resolution:
* - Use VITE_API_URL if provided (recommended for prod).
* - Else, if running locally (vite default ports), fall back to https://localhost:7100
*/
function resolveBaseUrl() {
    const env = (import.meta as any).env || {};
    const fromEnv = env.VITE_API_URL as string | undefined;
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();

    const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    // Default local API url (your Swagger was at https://localhost:7100)
    return isLocal ? "https://localhost:7100" : window.location.origin;
}

const api = axios.create({
    baseURL: resolveBaseUrl(),
    headers: {
        "x-api-key": (import.meta as any).env?.VITE_API_KEY ?? "my-secure-chat-analytics-key",
    },
});

// ---------- Error helper ----------
function toNiceError(err: any): Error {
    const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.title ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Request failed";
    return new Error(msg);
}

// ---------- Generic Ask ----------
export async function askAi(prompt: string): Promise<string> {
    try {
        const { data } = await api.post("/api/ai/ask", { prompt });
        return typeof data?.reply === "string" ? data.reply : String(data ?? "");
    } catch (err: any) {
        throw toNiceError(err);
    }
}

// ---------- AI Summary ----------
export type AiSummaryRequest = {
    notes?: string | null;
    patientId?: number | null;
    // optional hints
    age?: number | null;
    temperatureC?: number | null;
    duration?: string | null;
    medicationsTried?: string | null;
    dischargedStable?: boolean | null;
};

export type AiSummaryResponse = { summary: string; traceId: string };

export async function aiSummary(payload: AiSummaryRequest): Promise<AiSummaryResponse> {
    try {
        const { data } = await api.post("/api/ai/summary", payload, {
            headers: { "Content-Type": "application/json" },
        });
        return data as AiSummaryResponse;
    } catch (err: any) {
        throw toNiceError(err);
    }
}

// ---------- Treatment Suggest ----------
export type TreatmentSuggestRequest = {
    patientId?: number | null;
    diagnosis?: string | null;
    symptoms?: string[] | null;
    tempC?: number | null;
    pulse?: number | null;
    respRate?: number | null;
    systolic?: number | null;
    diastolic?: number | null;
    spO2?: number | null;
    allergies?: string[] | null;
    medications?: string[] | null;
    notes?: string | null;
};

export type TreatmentSuggestResult =
    | Record<string, any> // strict JSON from model
    | { result: string }; // fallback wrapper from API

export async function treatmentSuggest(
    payload: TreatmentSuggestRequest
): Promise<TreatmentSuggestResult> {
    try {
        const { data } = await api.post("/api/ai/treatment-suggest", payload, {
            headers: { "Content-Type": "application/json" },
            // allow axios to pass through raw text; we’ll parse below
            transformResponse: [(raw) => raw],
        });

        try {
            return JSON.parse(data);
        } catch {
            if (typeof data === "object") return data;
            return { result: String(data ?? "") };
        }
    } catch (err: any) {
        throw toNiceError(err);
    }
}

/* ===== NEW: latest vitals for Autofill ===== */
export type LatestVitalsResponse = {
    latest: {
        recordedAt: string;
        tempC: number | null;
        pulse: number | null;
        respRate: number | null;
        systolic: number | null;
        diastolic: number | null;
        spO2: number | null;
    } | null;
    history: Array<{
        recordedAt: string;
        tempC: number | null;
        pulse: number | null;
        respRate: number | null;
        systolic: number | null;
        diastolic: number | null;
        spO2: number | null;
        notes?: string | null;
    }>;
};

export async function getLatestVitals(patientId: number): Promise<LatestVitalsResponse> {
    try {
        // Adjust here if your backend route changes
        const { data } = await api.get(`/api/Patient/${patientId}/vitals-latest`);
        return data as LatestVitalsResponse;
    } catch (err: any) {
        throw toNiceError(err);
    }
}
