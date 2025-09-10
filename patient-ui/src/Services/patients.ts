// src/Services/patients.ts
import api from "../api";

export type Patient = {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string; // ISO yyyy-MM-ddTHH:mm:ssZ
    gender: string;
    email: string;
    phone: string;
    createdAt?: string; // returned by server
};

function headers() {
    return {
        headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY as string, // harmless if api.ts already adds it
        },
    };
}

// GET /api/Patient
export async function getPatients(): Promise<Patient[]> {
    const { data } = await api.get<Patient[]>("/Patient", headers());
    return data;
}

// GET /api/Patient/{id}
export async function getPatient(id: number | string): Promise<Patient> {
    const { data } = await api.get<Patient>(`/Patient/${id}`, headers());
    return data;
}

// POST /api/Patient
export async function createPatient(payload: Partial<Patient>): Promise<Patient> {
    // Ensure required fields exist; you can validate these in UI before calling
    const body: Patient = {
        id: 0, // server will ignore and set actual Id
        firstName: payload.firstName ?? "",
        lastName: payload.lastName ?? "",
        dateOfBirth: payload.dateOfBirth ?? new Date().toISOString(),
        gender: payload.gender ?? "Unknown",
        email: payload.email ?? "",
        phone: payload.phone ?? "",
        createdAt: payload.createdAt, // optional
    };
    const { data } = await api.post<Patient>("/Patient", body, headers());
    return data;
}

// PUT /api/Patient/{id}
export async function updatePatient(
    id: number | string,
    payload: Partial<Patient>
): Promise<void> {
    // Load current so we can send a FULL object (required by your controller)
    const current = await getPatient(id);

    const body: Patient = {
        id: typeof id === "string" ? Number(id) : id,
        firstName: payload.firstName ?? current.firstName,
        lastName: payload.lastName ?? current.lastName,
        dateOfBirth: payload.dateOfBirth ?? current.dateOfBirth,
        gender: payload.gender ?? current.gender,
        email: payload.email ?? current.email,
        phone: payload.phone ?? current.phone,
        createdAt: current.createdAt, // keep original
    };

    await api.put(`/Patient/${id}`, body, headers());
}

// DELETE /api/Patient/{id}
export async function deletePatient(id: number | string): Promise<void> {
    await api.delete(`/Patient/${id}`, headers());
}

// GET /api/Patient/{id}/summary
export async function getPatientSummary(id: number | string): Promise<{ id: number; summary: string }> {
    const { data } = await api.get(`/Patient/${id}/summary`, headers());
    return data;
}

// Optional helper for UI
export function toFullName(p: Partial<Patient>): string {
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
}
