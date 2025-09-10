import axios from "axios";

export type Admission = {
    id: number;
    patientId: number;
    admissionDate: string; // ISO
    dischargeDate?: string | null; // ISO | null
    reason?: string | null;
    ward?: string | null;
    bedNumber?: string | null;
    doctorName?: string | null;
    notes?: string | null;
    // server may include Patient, Billing, Discharge etc., but UI doesn't need them
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:7100",
    headers: {
        "x-api-key": import.meta.env.VITE_API_KEY ?? "my-secure-chat-analytics-key",
    },
});

// GET /api/Admissions or /api/Admissions/byPatient/{patientId}
export async function getAdmissions(patientId?: number | string): Promise<Admission[]> {
    const url = patientId ? `/api/Admissions/byPatient/${patientId}` : `/api/Admissions`;
    const { data } = await api.get(url);
    return data;
}

// GET /api/Admissions/{id}
export async function getAdmission(id: number | string): Promise<Admission> {
    const { data } = await api.get(`/api/Admissions/${id}`);
    return data;
}

// POST /api/Admissions
export async function createAdmission(payload: Partial<Admission>): Promise<Admission> {
    const { data } = await api.post(`/api/Admissions`, payload);
    return data;
}

// PUT /api/Admissions/{id} (server requires body.id == route id)
export async function updateAdmission(id: number | string, payload: Partial<Admission>): Promise<void> {
    const body = { id: Number(id), ...payload };
    await api.put(`/api/Admissions/${id}`, body, { headers: { "Content-Type": "application/json" } });
}

// DELETE /api/Admissions/{id}
export async function deleteAdmission(id: number | string): Promise<void> {
    await api.delete(`/api/Admissions/${id}`);
}
