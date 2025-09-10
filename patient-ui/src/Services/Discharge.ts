import axios from "axios";

export type Discharge = {
    id: number;
    patientId: number;
    admissionId: number;
    dischargeDate: string; // ISO string
    summary?: string | null;
    instructions?: string | null;
    followUp?: string | null;
    outstandingAmount?: number | null;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:7100",
    headers: {
        "x-api-key": import.meta.env.VITE_API_KEY ?? "my-secure-chat-analytics-key",
    },
});

// GET /api/Discharges
export async function getDischarges(): Promise<Discharge[]> {
    const { data } = await api.get("/api/Discharges");
    return data;
}

// GET /api/Discharges/{id}
export async function getDischarge(id: number | string): Promise<Discharge> {
    const { data } = await api.get(`/api/Discharges/${id}`);
    return data;
}

// GET /api/Discharges/byPatient/{patientId}
export async function getDischargesByPatient(patientId: number | string): Promise<Discharge[]> {
    const { data } = await api.get(`/api/Discharges/byPatient/${patientId}`);
    return data;
}

// GET /api/Discharges/byAdmission/{admissionId}
export async function getDischargesByAdmission(admissionId: number | string): Promise<Discharge | null> {
    const { data } = await api.get(`/api/Discharges/byAdmission/${admissionId}`);
    return data;
}

// POST /api/Discharges
export async function createDischarge(payload: Partial<Discharge>): Promise<Discharge> {
    const { data } = await api.post("/api/Discharges", payload);
    return data;
}

// PUT /api/Discharges/{id}
export async function updateDischarge(id: number | string, payload: Partial<Discharge>): Promise<void> {
    const body = { id: Number(id), ...payload };
    await api.put(`/api/Discharges/${id}`, body, {
        headers: { "Content-Type": "application/json" },
    });
}

// DELETE /api/Discharges/{id}
export async function deleteDischarge(id: number | string): Promise<void> {
    await api.delete(`/api/Discharges/${id}`);
}