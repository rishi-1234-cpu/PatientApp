// src/components/Discharge.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getDischarges,
    getDischargesByPatient,
    getDischargesByAdmission,
    getDischarge,
    createDischarge,
    updateDischarge,
    deleteDischarge,
    type Discharge,
} from "../Services/Discharge";

type Mode = "idle" | "create" | "edit";

function fmt(dt?: string) {
    if (!dt) return "—";
    try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function DischargePage() {
    const qc = useQueryClient();

    // hide accidental empty controls (fixes “blank box”)
    const hideEmpty = (
        <style>{`button:empty, a:empty { display: none !important; }`}</style>
    );

    // filters
    const [patientFilter, setPatientFilter] = useState<string>("");
    const [admissionFilter, setAdmissionFilter] = useState<string>("");
    const [search, setSearch] = useState("");

    // modes / ids
    const [mode, setMode] = useState<Mode>("idle");
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [confirmId, setConfirmId] = useState<number | string | null>(null);

    // form
    const [form, setForm] = useState<Partial<Discharge>>({
        patientId: undefined as unknown as number,
        admissionId: undefined as unknown as number,
        dischargeDate: new Date().toISOString(),
        summary: "",
        instructions: "",
        followUp: "",
        outstandingAmount: undefined,
    });

    // load
    const { data = [], isLoading, isError } = useQuery({
        queryKey: ["discharges", patientFilter || "", admissionFilter || ""],
        queryFn: async () => {
            if (patientFilter.trim()) return await getDischargesByPatient(patientFilter.trim());
            if (admissionFilter.trim()) {
                const only = await getDischargesByAdmission(admissionFilter.trim());
                return only ? [only] : [];
            }
            return await getDischarges();
        },
    });

    // hydrate on edit
    useEffect(() => {
        if (mode === "edit" && editingId != null) {
            getDischarge(editingId).then((d) =>
                setForm({
                    patientId: d.patientId,
                    admissionId: d.admissionId,
                    dischargeDate: d.dischargeDate ?? new Date().toISOString(),
                    summary: d.summary ?? "",
                    instructions: d.instructions ?? "",
                    followUp: d.followUp ?? "",
                    outstandingAmount: d.outstandingAmount ?? undefined,
                })
            );
        }
    }, [mode, editingId]);

    // mutations
    const qcKey = { queryKey: ["discharges"] as const };
    const mCreate = useMutation({
        mutationFn: (payload: Partial<Discharge>) => createDischarge(payload),
        onSuccess: () => { qc.invalidateQueries(qcKey); resetForm(); },
    });
    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Discharge>) => {
            if (editingId == null) throw new Error("No discharge id to update");
            return updateDischarge(editingId, payload);
        },
        onSuccess: () => { qc.invalidateQueries(qcKey); resetForm(); },
    });
    const mDelete = useMutation({
        mutationFn: (id: number | string) => deleteDischarge(id),
        onSuccess: () => { qc.invalidateQueries(qcKey); setConfirmId(null); },
    });

    // search
    const rows = useMemo(() => {
        const t = search.trim().toLowerCase();
        if (!t) return data;
        return data.filter((d) => {
            const pid = String(d.patientId ?? "");
            const aid = String(d.admissionId ?? "");
            const txt = `${d.summary ?? ""} ${d.instructions ?? ""} ${d.followUp ?? ""}`.toLowerCase();
            const total = String(d.outstandingAmount ?? "");
            return pid.includes(t) || aid.includes(t) || txt.includes(t) || total.includes(t);
        });
    }, [data, search]);

    function resetForm() {
        setMode("idle");
        setEditingId(null);
        setConfirmId(null);
        setForm({
            patientId: undefined as unknown as number,
            admissionId: undefined as unknown as number,
            dischargeDate: new Date().toISOString(),
            summary: "",
            instructions: "",
            followUp: "",
            outstandingAmount: undefined,
        });
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === "create") mCreate.mutate(form);
        if (mode === "edit") mUpdate.mutate(form);
    }

    return (
        <section>
            {hideEmpty}
            <h2>Discharge</h2>

            {/* filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                    value={patientFilter}
                    onChange={(e) => setPatientFilter(e.target.value)}
                    placeholder="Filter by Patient ID (server)"
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <input
                    value={admissionFilter}
                    onChange={(e) => setAdmissionFilter(e.target.value)}
                    placeholder="Filter by Admission ID (server)"
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <button
                    onClick={() => qc.invalidateQueries(qcKey)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600, lineHeight: 1.2 }}
                >
                    Apply
                </button>
                <button
                    onClick={() => { setPatientFilter(""); setAdmissionFilter(""); setSearch(""); qc.invalidateQueries(qcKey); }}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                >
                    Clear
                </button>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes / ids (client)"
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd", marginLeft: "auto" }}
                />
            </div>

            {/* table */}
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                {isLoading && <p>Loading…</p>}
                {isError && <p style={{ color: "crimson" }}>Failed to load discharges.</p>}
                {rows.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th style={{ padding: 8 }}>ID</th>
                                <th style={{ padding: 8 }}>Patient</th>
                                <th style={{ padding: 8 }}>Admission</th>
                                <th style={{ padding: 8 }}>Date</th>
                                <th style={{ padding: 8 }}>Summary</th>
                                <th style={{ padding: 8 }}>Outstanding</th>
                                <th style={{ padding: 8 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((d) => (
                                <tr key={d.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                    <td style={{ padding: 8 }}>{d.id}</td>
                                    <td style={{ padding: 8 }}>{d.patientId}</td>
                                    <td style={{ padding: 8 }}>{d.admissionId}</td>
                                    <td style={{ padding: 8 }}>{fmt(d.dischargeDate)}</td>
                                    <td style={{ padding: 8 }}>{d.summary ?? "—"}</td>
                                    <td style={{ padding: 8 }}>
                                        {d.outstandingAmount != null ? d.outstandingAmount.toFixed(2) : "—"}
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <button
                                                onClick={() => { setEditingId(d.id); setMode("edit"); }}
                                                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                                            >
                                                Edit
                                            </button>

                                            {confirmId === d.id ? (
                                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                    <button
                                                        onClick={() => mDelete.mutate(d.id)}
                                                        disabled={mDelete.isPending}
                                                        style={{ padding: "6px 10px", borderRadius: 6, border: 0, background: "#e53935", color: "#fff", fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        {mDelete.isPending ? "Deleting…" : "Yes"}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmId(null)}
                                                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmId(d.id)}
                                                    style={{ padding: "6px 10px", borderRadius: 6, border: 0, background: "#e53935", color: "#fff", fontWeight: 600, lineHeight: 1.2 }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!isLoading && rows.length === 0 && <p>No discharges found.</p>}
            </div>

            {/* form */}
            <form
                onSubmit={onSubmit}
                style={{ marginTop: 16, padding: 16, border: "1px solid #dde3ea", borderRadius: 8, background: "#fbfdff", display: "grid", gap: 12 }}
            >
                <h3 style={{ margin: 0 }}>
                    {mode === "edit" && editingId != null ? `Edit Discharge #${editingId}` : "Add Discharge"}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Patient ID</span>
                        <input
                            value={form.patientId ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, patientId: Number(e.target.value) || ("" as any) }))}
                            required
                            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Admission ID</span>
                        <input
                            value={form.admissionId ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, admissionId: Number(e.target.value) || ("" as any) }))}
                            required
                            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Discharge Date</span>
                        <input
                            type="datetime-local"
                            value={form.dischargeDate ? new Date(form.dischargeDate).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setForm((f) => ({ ...f, dischargeDate: new Date(e.target.value).toISOString() }))}
                            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Outstanding Amount</span>
                        <input
                            value={form.outstandingAmount ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    outstandingAmount: e.target.value === "" ? undefined : Number(e.target.value),
                                }))
                            }
                            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </label>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Summary</span>
                    <textarea
                        value={form.summary ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                        rows={2}
                        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Instructions</span>
                    <textarea
                        value={form.instructions ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                        rows={2}
                        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Follow-Up</span>
                    <input
                        value={form.followUp ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, followUp: e.target.value }))}
                        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        type="submit"
                        disabled={mCreate.isPending || mUpdate.isPending}
                        style={{ padding: "10px 12px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600, lineHeight: 1.2 }}
                    >
                        {mode === "edit" ? "Save Changes" : "Create"}
                    </button>
                    <button
                        type="button"
                        onClick={resetForm}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                    >
                        {mode === "edit" ? "Cancel" : "Clear"}
                    </button>
                    {/* Removed the redundant "Add New" button */}
                </div>
            </form>
        </section>
    );
}
