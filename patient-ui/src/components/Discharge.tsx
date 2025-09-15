// src/components/Discharge.tsx
import React, { useEffect, useMemo, useState } from "react";
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
    try {
        return new Date(dt).toLocaleString();
    } catch {
        return dt as string;
    }
}

export default function DischargePage() {
    const qc = useQueryClient();

    const hideEmpty = (
        <style>{`button:empty, a:empty { display: none !important; }`}</style>
    );

    const [patientFilter, setPatientFilter] = useState<string>("");
    const [admissionFilter, setAdmissionFilter] = useState<string>("");
    const [search, setSearch] = useState("");

    const [mode, setMode] = useState<Mode>("idle");
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [confirmId, setConfirmId] = useState<number | string | null>(null);

    const [form, setForm] = useState<Partial<Discharge>>({
        patientId: undefined as unknown as number,
        admissionId: undefined as unknown as number,
        dischargeDate: new Date().toISOString(),
        summary: "",
        instructions: "",
        followUp: "",
        outstandingAmount: undefined,
    });

    const styles = {
        input: {
            width: "100%",
            padding: 12,
            minHeight: 44,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            fontSize: 16,
        } as React.CSSProperties,
        btnPrimary: {
            padding: "10px 14px",
            minHeight: 44,
            borderRadius: 8,
            border: 0,
            background: "#1976d2",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
        } as React.CSSProperties,
        btnSecondary: {
            padding: "10px 14px",
            minHeight: 44,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            cursor: "pointer",
        } as React.CSSProperties,
        card: {
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 8,
            background: "#fff",
        } as React.CSSProperties,
    };

    const qcKey = { queryKey: ["discharges"] as const };
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

    const mCreate = useMutation({
        mutationFn: (payload: Partial<Discharge>) => createDischarge(payload),
        onSuccess: () => {
            qc.invalidateQueries(qcKey);
            resetForm();
        },
    });
    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Discharge>) => {
            if (editingId == null) throw new Error("No discharge id to update");
            return updateDischarge(editingId, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries(qcKey);
            resetForm();
        },
    });
    const mDelete = useMutation({
        mutationFn: (id: number | string) => deleteDischarge(id),
        onSuccess: () => {
            qc.invalidateQueries(qcKey);
            setConfirmId(null);
        },
    });

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

            {/* Filters */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <input
                    value={patientFilter}
                    onChange={(e) => setPatientFilter(e.target.value)}
                    placeholder="Filter by Patient ID (server)"
                    inputMode="numeric"
                    style={styles.input}
                />
                <input
                    value={admissionFilter}
                    onChange={(e) => setAdmissionFilter(e.target.value)}
                    placeholder="Filter by Admission ID (server)"
                    inputMode="numeric"
                    style={styles.input}
                />
                <button type="button" onClick={() => qc.invalidateQueries(qcKey)} style={styles.btnPrimary}>
                    Apply
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setPatientFilter("");
                        setAdmissionFilter("");
                        setSearch("");
                        qc.invalidateQueries(qcKey);
                    }}
                    style={styles.btnSecondary}
                >
                    Clear
                </button>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes / ids (client)"
                    style={{ ...styles.input, flex: 1 }}
                />
            </div>

            {/* Table */}
            <div style={styles.card}>
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
                                <th style={{ padding: 8, minWidth: 220 }}>Actions</th>
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
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(d.id);
                                                    setMode("edit");
                                                }}
                                                style={styles.btnSecondary}
                                            >
                                                Edit
                                            </button>

                                            {confirmId === d.id ? (
                                                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => mDelete.mutate(d.id)}
                                                        disabled={mDelete.isPending}
                                                        style={{ ...styles.btnPrimary, background: "#e53935" }}
                                                    >
                                                        {mDelete.isPending ? "Deleting…" : "Yes"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmId(null)}
                                                        style={styles.btnSecondary}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmId(d.id)}
                                                    style={{ ...styles.btnPrimary, background: "#e53935" }}
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

            {/* Form */}
            <form
                onSubmit={onSubmit}
                style={{
                    ...styles.card,
                    marginTop: 16,
                    background: "#fbfdff",
                    display: "grid",
                    gap: 12,
                }}
            >
                <h3 style={{ margin: 0 }}>
                    {mode === "edit" && editingId != null ? `Edit Discharge #${editingId}` : "Add Discharge"}
                </h3>

                <div
                    style={{
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                >
                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Patient ID</span>
                        <input
                            value={form.patientId ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, patientId: Number(e.target.value) || ("" as any) }))
                            }
                            inputMode="numeric"
                            required
                            style={styles.input}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Admission ID</span>
                        <input
                            value={form.admissionId ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, admissionId: Number(e.target.value) || ("" as any) }))
                            }
                            inputMode="numeric"
                            required
                            style={styles.input}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Discharge Date</span>
                        <input
                            type="datetime-local"
                            value={
                                form.dischargeDate
                                    ? new Date(form.dischargeDate).toISOString().slice(0, 16)
                                    : ""
                            }
                            onChange={(e) =>
                                setForm((f) => ({ ...f, dischargeDate: new Date(e.target.value).toISOString() }))
                            }
                            style={styles.input}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Outstanding Amount</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={form.outstandingAmount ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    outstandingAmount: e.target.value === "" ? undefined : Number(e.target.value),
                                }))
                            }
                            style={styles.input}
                        />
                    </label>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Summary</span>
                    <textarea
                        value={form.summary ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                        rows={3}
                        style={{ ...styles.input, minHeight: 100 }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Instructions</span>
                    <textarea
                        value={form.instructions ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                        rows={3}
                        style={{ ...styles.input, minHeight: 100 }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Follow-Up</span>
                    <input
                        value={form.followUp ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, followUp: e.target.value }))}
                        style={styles.input}
                    />
                </label>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        type="submit"
                        disabled={mCreate.isPending || mUpdate.isPending}
                        style={styles.btnPrimary}
                    >
                        {mode === "edit" ? "Save Changes" : "Create"}
                    </button>
                    <button type="button" onClick={resetForm} style={styles.btnSecondary}>
                        {mode === "edit" ? "Cancel" : "Clear"}
                    </button>
                </div>
            </form>
        </section>
    );
}