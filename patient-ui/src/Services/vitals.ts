import axios from "axios";

export type Vital = {
    id: number;
    patientId: number;
    takenAt: string; // ISO
    temperature?: number | null;
    pulse?: number | null;
    respRate?: number | null;
    systolic?: number | null;
    diastolic?: number | null;
    spO2?: number | null;
    notes?: string | null;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:7100",
    headers: { "x-api-key": import.meta.env.VITE_API_KEY ?? "my-secure-chat-analytics-key" },
});

// GET /api/vitals or /api/vitals/byPatient/{patientId}
export async function getVitals(patientId?: number | string): Promise<Vital[]> {
    const url = patientId ? `/api/vitals/byPatient/${patientId}` : `/api/vitals`;
    const { data } = await api.get(url);
    return data;
}

// GET /api/vitals/{id}
export async function getVital(id: number | string): Promise<Vital> {
    const { data } = await api.get(`/api/vitals/${id}`);
    return data;
}

// POST /api/vitals
export async function createVital(payload: Partial<Vital>): Promise<Vital> {
    const { data } = await api.post(`/api/vitals`, payload);
    return data;
}

// PUT /api/vitals/{id} (server requires body.id == route id)
export async function updateVital(id: number | string, payload: Partial<Vital>): Promise<void> {
    const body = { id: Number(id), ...payload };
    await api.put(`/api/vitals/${id}`, body, { headers: { "Content-Type": "application/json" } });
}

// DELETE /api/vitals/{id}
export async function deleteVital(id: number | string): Promise<void> {
    await api.delete(`/api/vitals/${id}`);
}
