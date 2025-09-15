// src/components/Vitals.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getVitals,
    getVital,
    createVital,
    updateVital,
    deleteVital,
    type Vital,
} from "../Services/vitals";

function fmt(dt?: string | null) {
    if (!dt) return "—";
    try { return new Date(dt).toLocaleString(); } catch { return dt as string; }
}

type Mode = "idle" | "create" | "edit";

export default function Vitals() {
    const qc = useQueryClient();

    // Defensive CSS + mobile table scroll
    const globalCss = (
        <style>{`
button:empty, a:empty { display:none !important; }
.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.table-wrap{width:100%;overflow:auto}
@media (max-width:640px){ .controls{flex-direction:column;align-items:stretch} }
`}</style>
    );

    // filters / search
    const [patientFilter, setPatientFilter] = useState<string>("");
    const [search, setSearch] = useState("");

    // form state
    const [mode, setMode] = useState<Mode>("idle");
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [confirmId, setConfirmId] = useState<number | string | null>(null);

    const [form, setForm] = useState<Partial<Vital>>({
        patientId: undefined as unknown as number,
        takenAt: new Date().toISOString(),
        temperature: undefined,
        pulse: undefined,
        respRate: undefined,
        systolic: undefined,
        diastolic: undefined,
        spO2: undefined,
        notes: "",
    });

    // shared input style (bigger touch targets)
    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: 12,
        minHeight: 44,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fff",
        fontSize: 16,
    };

    // data
    const { data = [], isLoading, isError } = useQuery({
        queryKey: ["vitals", patientFilter || ""],
        queryFn: () => getVitals(patientFilter ? Number(patientFilter) : undefined),
    });

    // hydrate form on edit
    useEffect(() => {
        if (mode === "edit" && editingId != null) {
            getVital(editingId).then((v) =>
                setForm({
                    id: v.id,
                    patientId: v.patientId,
                    takenAt: v.takenAt,
                    temperature: v.temperature ?? undefined,
                    pulse: v.pulse ?? undefined,
                    respRate: v.respRate ?? undefined,
                    systolic: v.systolic ?? undefined,
                    diastolic: v.diastolic ?? undefined,
                    spO2: v.spO2 ?? undefined,
                    notes: v.notes ?? "",
                })
            );
        }
    }, [mode, editingId]);

    // mutations
    const mCreate = useMutation({
        mutationFn: (payload: Partial<Vital>) => createVital(payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["vitals"] }); resetForm(); },
    });

    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Vital>) => {
            if (editingId == null) throw new Error("No vital id to update");
            return updateVital(editingId, payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["vitals"] }); resetForm(); },
    });

    const mDelete = useMutation({
        mutationFn: (id: number | string) => deleteVital(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["vitals"] }); setConfirmId(null); },
    });

    // client search
    const rows = useMemo(() => {
        const t = search.trim().toLowerCase();
        if (!t) return data;
        return data.filter((v) => {
            const notes = (v.notes ?? "").toLowerCase();
            return (
                String(v.patientId).includes(t) ||
                String(v.pulse ?? "").includes(t) ||
                String(v.systolic ?? "").includes(t) ||
                String(v.diastolic ?? "").includes(t) ||
                String(v.spO2 ?? "").includes(t) ||
                notes.includes(t)
            );
        });
    }, [data, search]);

    // helpers
    function resetForm() {
        setMode("idle");
        setEditingId(null);
        setForm({
            patientId: undefined as unknown as number,
            takenAt: new Date().toISOString(),
            temperature: undefined,
            pulse: undefined,
            respRate: undefined,
            systolic: undefined,
            diastolic: undefined,
            spO2: undefined,
            notes: "",
        });
    }

    // Always create unless explicitly editing
    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === "edit") mUpdate.mutate(form);
        else mCreate.mutate(form);
    }

    // numeric parser that preserves 0
    const numOrUndef = (val: string) => (val === "" ? undefined : Number(val));

    return (
        <section>
            {globalCss}
            <h2>Vitals</h2>

            {/* server filter + client search */}
            <div className="controls" style={{ marginBottom: 12 }}>
                <input
                    value={patientFilter}
                    onChange={(e) => setPatientFilter(e.target.value)}
                    placeholder="Filter by patient ID (server)"
                    style={inputStyle}
                    inputMode="numeric"
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        onClick={() => qc.invalidateQueries({ queryKey: ["vitals"] })}
                        style={{ padding: "10px 14px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600 }}
                    >
                        Apply
                    </button>
                    <button
                        onClick={() => { setPatientFilter(""); setSearch(""); qc.invalidateQueries({ queryKey: ["vitals"] }); }}
                        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#111" }}
                    >
                        Clear
                    </button>
                </div>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes / patient id / BP / SpO₂"
                    style={inputStyle}
                />
            </div>

            {/* table */}
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                {isLoading && <p>Loading…</p>}
                {isError && <p style={{ color: "crimson" }}>Failed to load vitals.</p>}

                {rows.length > 0 ? (
                    <div className="table-wrap">
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                    <th style={{ padding: 8 }}>ID</th>
                                    <th style={{ padding: 8 }}>Patient</th>
                                    <th style={{ padding: 8 }}>Date/Time</th>
                                    <th style={{ padding: 8 }}>Temp (°C)</th>
                                    <th style={{ padding: 8 }}>Pulse</th>
                                    <th style={{ padding: 8 }}>BP</th>
                                    <th style={{ padding: 8 }}>SpO₂</th>
                                    <th style={{ padding: 8 }}>Notes</th>
                                    <th style={{ padding: 8, width: 320 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((v) => (
                                    <tr key={v.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                        <td style={{ padding: 8 }}>{v.id}</td>
                                        <td style={{ padding: 8 }}>{v.patientId}</td>
                                        <td style={{ padding: 8 }}>{fmt(v.takenAt)}</td>
                                        <td style={{ padding: 8 }}>{v.temperature ?? "—"}</td>
                                        <td style={{ padding: 8 }}>{v.pulse ?? "—"}</td>
                                        <td style={{ padding: 8 }}>
                                            {v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : "—"}
                                        </td>
                                        <td style={{ padding: 8 }}>{v.spO2 ?? "—"}</td>
                                        <td style={{ padding: 8 }}>{v.notes ?? "—"}</td>
                                        <td style={{ padding: 8 }}>
                                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                                <button
                                                    onClick={() => { setEditingId(v.id); setMode("edit"); }}
                                                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                                                >
                                                    Edit
                                                </button>

                                                {confirmId === v.id ? (
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                        <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                        <button
                                                            onClick={() => mDelete.mutate(v.id)}
                                                            disabled={mDelete.isPending}
                                                            style={{ padding: "6px 10px", borderRadius: 6, border: 0, background: "#e53935", color: "#fff", fontWeight: 600 }}
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
                                                        onClick={() => setConfirmId(v.id)}
                                                        style={{ padding: "6px 10px", borderRadius: 6, border: 0, background: "#e53935", color: "#fff" }}
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
                    </div>
                ) : (
                    !isLoading && <p>No vitals found.</p>
                )}
            </div>

            {/* create / edit form */}
            <form
                onSubmit={onSubmit}
                style={{ marginTop: 16, padding: 16, border: "1px solid #dde3ea", borderRadius: 8, background: "#fbfdff", display: "grid", gap: 12 }}
            >
                <h3 style={{ margin: 0 }}>{mode === "edit" ? `Edit Vital #${editingId}` : "Add Vital"}</h3>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Patient ID</span>
                        <input
                            value={form.patientId ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, patientId: e.target.value === "" ? ("" as any) : Number(e.target.value) }))
                            }
                            required
                            style={inputStyle}
                            inputMode="numeric"
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Recorded At</span>
                        <input
                            type="datetime-local"
                            value={form.takenAt ? new Date(form.takenAt).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setForm((f) => ({ ...f, takenAt: new Date(e.target.value).toISOString() }))}
                            style={inputStyle}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Temperature (°C)</span>
                        <input
                            type="number"
                            step="0.1"
                            value={form.temperature ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, temperature: numOrUndef(e.target.value) }))}
                            style={inputStyle}
                            inputMode="decimal"
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Pulse (bpm)</span>
                        <input
                            type="number"
                            value={form.pulse ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, pulse: numOrUndef(e.target.value) }))}
                            style={inputStyle}
                            inputMode="numeric"
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Resp. Rate</span>
                        <input
                            type="number"
                            value={form.respRate ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, respRate: numOrUndef(e.target.value) }))}
                            style={inputStyle}
                            inputMode="numeric"
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Systolic</span>
                        <input
                            type="number"
                            value={form.systolic ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, systolic: numOrUndef(e.target.value) }))}
                            style={inputStyle}
                            inputMode="numeric"
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Diastolic</span>
                        <input
                            type="number"
                            value={form.diastolic ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, diastolic: numOrUndef(e.target.value) }))}
                            style={inputStyle}
                            inputMode="numeric"
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>SpO₂ (%)</span>
                        <input
                            type="number"
                            value={form.spO2 ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, spO2: numOrUndef(e.target.value) }))}
                            style={inputStyle}
                            inputMode="numeric"
                        />
                    </label>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Notes</span>
                    <textarea
                        value={form.notes ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={3}
                        style={inputStyle}
                    />
                </label>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        type="submit"
                        disabled={mCreate.isPending || mUpdate.isPending}
                        style={{ padding: "10px 12px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600 }}
                    >
                        {mode === "edit" ? "Save Changes" : "Create"}
                    </button>
                    <button
                        type="button"
                        onClick={resetForm}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </section>
    );
}