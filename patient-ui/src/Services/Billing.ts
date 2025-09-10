import axios from "axios";

export type Billing = {
    id: number;
    patientId: number;
    admissionId: number;
    billedAt?: string | null;

    roomCharges?: number | null;
    treatmentCharges?: number | null;
    medicationCharges?: number | null;
    otherCharges?: number | null;
    discount?: number | null;
    tax?: number | null;
    totalAmount?: number | null;

    status?: string | null;
    notes?: string | null;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:7100",
    headers: {
        "x-api-key": import.meta.env.VITE_API_KEY ?? "my-secure-chat-analytics-key",
    },
});

// GET /api/Billings
export async function getBillings(): Promise<Billing[]> {
    const { data } = await api.get("/api/Billings");
    return data;
}

// GET /api/Billings/{id}
export async function getBilling(id: number | string): Promise<Billing> {
    const { data } = await api.get(`/api/Billings/${id}`);
    return data;
}

// GET /api/Billings/byPatient/{patientId}
export async function getBillingsByPatient(patientId: number | string): Promise<Billing[]> {
    const { data } = await api.get(`/api/Billings/byPatient/${patientId}`);
    return data;
}

// GET /api/Billings/byAdmission/{admissionId}
export async function getBillingsByAdmission(admissionId: number | string): Promise<Billing[]> {
    const { data } = await api.get(`/api/Billings/byAdmission/${admissionId}`);
    return data;
}

// POST /api/Billings
export async function createBilling(payload: Partial<Billing>): Promise<Billing> {
    const { data } = await api.post("/api/Billings", payload);
    return data;
}

// PUT /api/Billings/{id} (backend requires body.id == route id)
export async function updateBilling(
    id: number | string,
    payload: Partial<Billing>
): Promise<void> {
    const body = { id: Number(id), ...payload };
    await api.put(`/api/Billings/${id}`, body, {
        headers: { "Content-Type": "application/json" },
    });
}

// DELETE /api/Billings/{id}
export async function deleteBilling(id: number | string): Promise<void> {
    await api.delete(`/api/Billings/${id}`);
}
