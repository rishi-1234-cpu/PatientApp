// src/components/Admissions.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAdmissions,
    getAdmission,
    createAdmission,
    updateAdmission,
    deleteAdmission,
    type Admission,
} from "../Services/admissions";

// small formatter
function fmt(dt?: string | null) {
    if (!dt) return "—";
    try {
        return new Date(dt).toLocaleString();
    } catch {
        return dt!;
    }
}

type Mode = "idle" | "create" | "edit";

export default function Admissions() {
    const qc = useQueryClient();

    // tiny helper to hide stray empty anchors/buttons
    const hideEmpty = (
        <style>{`button:empty, a:empty { display:none !important; }`}</style>
    );

    // ---- filters & search ----
    const [patientFilter, setPatientFilter] = useState<string>("");
    const [search, setSearch] = useState("");

    // ---- mode & ids ----
    const [mode, setMode] = useState<Mode>("idle");
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [confirmId, setConfirmId] = useState<number | string | null>(null);

    // ---- form model ----
    const [form, setForm] = useState<Partial<Admission>>({
        patientId: undefined as unknown as number,
        admissionDate: new Date().toISOString(),
        dischargeDate: undefined,
        doctorName: "",
        ward: "",
        bedNumber: "",
        reason: "",
        notes: "",
    });

    // ---- styles (mobile-first) ----
    const styles = {
        input: {
            width: "100%",
            padding: 12,
            minHeight: 44,
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
        } as React.CSSProperties,
        btnPrimary: {
            padding: "10px 14px",
            minHeight: 40,
            borderRadius: 8,
            border: 0,
            background: "#1976d2",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
        } as React.CSSProperties,
        btnSecondary: {
            padding: "10px 14px",
            minHeight: 40,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            color: "#111",
            fontWeight: 500,
            cursor: "pointer",
        } as React.CSSProperties,
        btnDanger: {
            padding: "6px 10px",
            borderRadius: 6,
            border: 0,
            background: "#e53935",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
        } as React.CSSProperties,
        gridAuto: {
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        } as React.CSSProperties,
    };

    // ---- load list (filter included in key) ----
    const { data = [], isLoading, isError } = useQuery({
        queryKey: ["admissions", patientFilter || ""],
        queryFn: () => getAdmissions(patientFilter ? Number(patientFilter) : undefined),
    });

    // ---- populate form on edit ----
    useEffect(() => {
        if (mode === "edit" && editingId != null) {
            getAdmission(editingId).then((a) =>
                setForm({
                    id: a.id,
                    patientId: a.patientId,
                    admissionDate: a.admissionDate,
                    dischargeDate: a.dischargeDate ?? undefined,
                    doctorName: a.doctorName ?? "",
                    ward: a.ward ?? "",
                    bedNumber: a.bedNumber ?? "",
                    reason: a.reason ?? "",
                    notes: a.notes ?? "",
                })
            );
        }
    }, [mode, editingId]);

    // ---- mutations ----
    const mCreate = useMutation({
        mutationFn: (payload: Partial<Admission>) => createAdmission(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admissions"] });
            resetForm();
        },
    });

    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Admission>) => {
            if (editingId == null) throw new Error("No admission id to update");
            return updateAdmission(editingId, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admissions"] });
            resetForm();
        },
    });

    const mDelete = useMutation({
        mutationFn: (id: number | string) => deleteAdmission(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admissions"] });
            setConfirmId(null);
        },
    });

    // ---- client-side search ----
    const rows = useMemo(() => {
        const t = search.trim().toLowerCase();
        if (!t) return data;
        return data.filter((a) => {
            const doc = (a.doctorName ?? "").toLowerCase();
            const ward = (a.ward ?? "").toLowerCase();
            const reason = (a.reason ?? "").toLowerCase();
            const notes = (a.notes ?? "").toLowerCase();
            const bed = (a.bedNumber ?? "").toLowerCase();
            return (
                doc.includes(t) ||
                ward.includes(t) ||
                reason.includes(t) ||
                notes.includes(t) ||
                bed.includes(t) ||
                String(a.patientId).includes(t)
            );
        });
    }, [data, search]);

    // ---- helpers ----
    function resetForm() {
        setMode("idle");
        setEditingId(null);
        setForm({
            patientId: undefined as unknown as number,
            admissionDate: new Date().toISOString(),
            dischargeDate: undefined,
            doctorName: "",
            ward: "",
            bedNumber: "",
            reason: "",
            notes: "",
        });
    }

    function startCreate() {
        setMode("create");
        setEditingId(null);
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === "create") mCreate.mutate(form);
        if (mode === "edit") mUpdate.mutate(form);
    }

    return (
        <section>
            {hideEmpty}
            <style>{`
/* make table scroll on small screens */
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; min-width:780px; }
th, td { padding:8px; text-align:left; border-bottom:1px solid #f2f2f2; }
`}</style>

            <h2>Admissions</h2>

            {/* filter + search */}
            <div className="stack-sm" style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input
                    value={patientFilter}
                    onChange={(e) => setPatientFilter(e.target.value)}
                    placeholder="Filter by Patient ID (server)"
                    style={styles.input}
                    inputMode="numeric"
                />
                <button
                    type="button"
                    onClick={() => qc.invalidateQueries({ queryKey: ["admissions"] })}
                    style={styles.btnPrimary}
                >
                    Apply
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setPatientFilter("");
                        setSearch("");
                        qc.invalidateQueries({ queryKey: ["admissions"] });
                    }}
                    style={styles.btnSecondary}
                    title="Clear filter & search"
                >
                    Clear
                </button>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search doctor / ward / reason / notes / bed / patient id…"
                    style={{ ...styles.input, marginLeft: "auto" }}
                />
            </div>

            {/* table */}
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                {isLoading && <p>Loading…</p>}
                {isError && <p style={{ color: "crimson" }}>Failed to load admissions.</p>}

                {rows.length > 0 ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Patient</th>
                                    <th>Admit</th>
                                    <th>Discharge</th>
                                    <th>Doctor</th>
                                    <th>Ward</th>
                                    <th>Bed</th>
                                    <th>Reason</th>
                                    <th>Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((a) => (
                                    <tr key={a.id}>
                                        <td>{a.id}</td>
                                        <td>{a.patientId}</td>
                                        <td>{fmt(a.admissionDate)}</td>
                                        <td>{fmt(a.dischargeDate)}</td>
                                        <td>{a.doctorName ?? "—"}</td>
                                        <td>{a.ward ?? "—"}</td>
                                        <td>{a.bedNumber ?? "—"}</td>
                                        <td>{a.reason ?? "—"}</td>
                                        <td>{a.notes ?? "—"}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(a.id);
                                                        setMode("edit");
                                                    }}
                                                    style={styles.btnSecondary}
                                                >
                                                    Edit
                                                </button>

                                                {confirmId === a.id ? (
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => mDelete.mutate(a.id)}
                                                            disabled={mDelete.isPending}
                                                            style={styles.btnDanger}
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
                                                        onClick={() => setConfirmId(a.id)}
                                                        style={styles.btnDanger}
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
                    !isLoading && <p>No admissions found.</p>
                )}
            </div>

            {/* add/edit form */}
            {mode !== "idle" && (
                <form
                    onSubmit={onSubmit}
                    style={{
                        marginTop: 16,
                        padding: 16,
                        border: "1px solid #dde3ea",
                        borderRadius: 8,
                        background: "#fbfdff",
                        display: "grid",
                        gap: 12,
                    }}
                >
                    <h3 style={{ margin: 0 }}>
                        {mode === "edit" ? `Edit Admission #${editingId}` : "Add Admission"}
                    </h3>

                    <div style={styles.gridAuto}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Patient ID *</span>
                            <input
                                value={form.patientId ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        patientId: Number(e.target.value) || ("" as any),
                                    }))
                                }
                                required
                                style={styles.input}
                                inputMode="numeric"
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Admission date/time *</span>
                            <input
                                type="datetime-local"
                                value={
                                    form.admissionDate
                                        ? new Date(form.admissionDate).toISOString().slice(0, 16)
                                        : ""
                                }
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        admissionDate: new Date(e.target.value).toISOString(),
                                    }))
                                }
                                required
                                style={styles.input}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Discharge date/time</span>
                            <input
                                type="datetime-local"
                                value={
                                    form.dischargeDate
                                        ? new Date(form.dischargeDate).toISOString().slice(0, 16)
                                        : ""
                                }
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        dischargeDate: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : undefined,
                                    }))
                                }
                                style={styles.input}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Doctor</span>
                            <input
                                value={form.doctorName ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, doctorName: e.target.value }))}
                                style={styles.input}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Ward</span>
                            <input
                                value={form.ward ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                                style={styles.input}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Bed</span>
                            <input
                                value={form.bedNumber ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, bedNumber: e.target.value }))}
                                style={styles.input}
                            />
                        </label>
                    </div>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Reason</span>
                        <input
                            value={form.reason ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                            style={styles.input}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span>Notes</span>
                        <textarea
                            rows={3}
                            value={form.notes ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            style={{ ...styles.input, minHeight: 100 }}
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
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* entry point when idle */}
            {mode === "idle" && (
                <div style={{ marginTop: 16 }}>
                    <button type="button" onClick={startCreate} style={styles.btnSecondary}>
                        Add Admission
                    </button>
                </div>
            )}
        </section>
    );
}
