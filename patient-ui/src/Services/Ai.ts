import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:7100",
    headers: {
        "x-api-key": import.meta.env.VITE_API_KEY ?? "my-secure-chat-analytics-key",
    },
});

export async function askAi(prompt: string): Promise<string> {
    const { data } = await api.post("/api/Ai/ask", { prompt });
    // controller returns { reply: string }
    return typeof data?.reply === "string" ? data.reply : String(data ?? "");
}

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
    const { data } = await api.post("/api/Ai/treatment-suggest", payload, {
        headers: { "Content-Type": "application/json" },
        // allow axios to give us text if server ever sends text/plain
        transformResponse: [(raw) => raw],
    });

    // If backend sent JSON string, parse it safely.
    try {
        return JSON.parse(data);
    } catch {
        // Could already be JSON object, or the fallback { result: raw }
        if (typeof data === "object") return data;
        return { result: String(data ?? "") };
    }
}
