// src/components/Billing.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getBillings,
    getBillingsByPatient,
    getBillingsByAdmission,
    getBilling,
    createBilling,
    updateBilling,
    deleteBilling,
    type Billing,
} from "../Services/Billing";

type Mode = "idle" | "create" | "edit";

function fmtDate(dt?: string | null) {
    if (!dt) return "—";
    try {
        return new Date(dt).toLocaleString();
    } catch {
        return dt as string;
    }
}

export default function BillingPage() {
    const qc = useQueryClient();

    // Defensive: hide empty rogue elements
    const hideEmpty = (
        <style>{`button:empty, a:empty { display: none !important; }`}</style>
    );

    // ---- filters/search state ----
    const [patientFilter, setPatientFilter] = useState<string>("");
    const [admissionFilter, setAdmissionFilter] = useState<string>("");
    const [search, setSearch] = useState("");

    // ---- ui/form state ----
    const [mode, setMode] = useState<Mode>("idle");
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [confirmId, setConfirmId] = useState<number | string | null>(null);
    const [form, setForm] = useState<Partial<Billing>>({
        patientId: undefined as unknown as number,
        admissionId: undefined as unknown as number,
        billedAt: new Date().toISOString(),
        roomCharges: 0,
        treatmentCharges: 0,
        medicationCharges: 0,
        otherCharges: 0,
        discount: 0,
        tax: 0,
        status: "",
        notes: "",
    });

    // ---- data load (server filters) ----
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["billings", patientFilter || "", admissionFilter || ""],
        queryFn: () => {
            if (patientFilter.trim()) return getBillingsByPatient(patientFilter.trim());
            if (admissionFilter.trim()) return getBillingsByAdmission(admissionFilter.trim());
            return getBillings();
        },
    });

    // ---- mutations ----
    const mCreate = useMutation({
        mutationFn: (payload: Partial<Billing>) => createBilling(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["billings"] });
            resetForm();
        },
    });

    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Billing>) => {
            if (editingId == null) throw new Error("No id to update");
            return updateBilling(editingId, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["billings"] });
            resetForm();
        },
    });

    const mDelete = useMutation({
        mutationFn: (id: number | string) => deleteBilling(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["billings"] });
            setConfirmId(null);
        },
    });

    // ---- edit loader ----
    useEffect(() => {
        if (mode === "edit" && editingId != null) {
            getBilling(editingId).then((b) =>
                setForm({
                    patientId: b.patientId,
                    admissionId: b.admissionId,
                    billedAt: b.billedAt ?? new Date().toISOString(),
                    roomCharges: b.roomCharges ?? 0,
                    treatmentCharges: b.treatmentCharges ?? 0,
                    medicationCharges: b.medicationCharges ?? 0,
                    otherCharges: b.otherCharges ?? 0,
                    discount: b.discount ?? 0,
                    tax: b.tax ?? 0,
                    status: b.status ?? "",
                    notes: b.notes ?? "",
                })
            );
        }
    }, [mode, editingId]);

    function resetForm() {
        setMode("idle");
        setEditingId(null);
        setForm({
            patientId: undefined as unknown as number,
            admissionId: undefined as unknown as number,
            billedAt: new Date().toISOString(),
            roomCharges: 0,
            treatmentCharges: 0,
            medicationCharges: 0,
            otherCharges: 0,
            discount: 0,
            tax: 0,
            status: "",
            notes: "",
        });
    }

    // ---- client search ----
    const rows = useMemo(() => {
        const t = search.trim().toLowerCase();
        if (!t) return data;
        return data.filter((b) => {
            const id = String(b.id);
            const pid = String(b.patientId);
            const aid = String(b.admissionId);
            const status = (b.status ?? "").toLowerCase();
            const notes = (b.notes ?? "").toLowerCase();
            return [id, pid, aid, status, notes].some((v) => v.includes(t));
        });
    }, [data, search]);

    // ---- styles (mobile-first) ----
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

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === "create") mCreate.mutate(form);
        if (mode === "edit") mUpdate.mutate(form);
    }

    return (
        <section>
            {hideEmpty}
            <h2>Billing</h2>

            {/* server filters + client search */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
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
                <button type="button" onClick={() => refetch()} style={styles.btnPrimary}>
                    Apply
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setPatientFilter("");
                        setAdmissionFilter("");
                        setSearch("");
                        refetch();
                    }}
                    style={styles.btnSecondary}
                    title="Clear filters & search"
                >
                    Clear
                </button>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search status / notes / ids (client)"
                    style={{ ...styles.input, flex: 1 }}
                />
            </div>

            {/* table */}
            <div style={styles.card}>
                {isLoading && <p>Loading…</p>}
                {isError && <p style={{ color: "crimson" }}>Failed to load billings.</p>}
                {!isLoading && rows.length === 0 && <p>No billing records found.</p>}

                {rows.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th style={{ padding: 8 }}>ID</th>
                                <th style={{ padding: 8 }}>Patient</th>
                                <th style={{ padding: 8 }}>Admission</th>
                                <th style={{ padding: 8 }}>Billed At</th>
                                <th style={{ padding: 8 }}>Total</th>
                                <th style={{ padding: 8 }}>Status</th>
                                <th style={{ padding: 8 }}>Notes</th>
                                <th style={{ padding: 8, minWidth: 240 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((b) => (
                                <tr key={b.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                    <td style={{ padding: 8 }}>{b.id}</td>
                                    <td style={{ padding: 8 }}>{b.patientId}</td>
                                    <td style={{ padding: 8 }}>{b.admissionId}</td>
                                    <td style={{ padding: 8 }}>{fmtDate(b.billedAt)}</td>
                                    <td style={{ padding: 8 }}>{b.totalAmount ?? "—"}</td>
                                    <td style={{ padding: 8 }}>{b.status ?? "—"}</td>
                                    <td style={{ padding: 8 }}>{b.notes ?? "—"}</td>
                                    <td style={{ padding: 8 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(b.id);
                                                    setMode("edit");
                                                }}
                                                style={styles.btnSecondary}
                                            >
                                                Edit
                                            </button>

                                            {confirmId === b.id ? (
                                                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => mDelete.mutate(b.id)}
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
                                                    onClick={() => setConfirmId(b.id)}
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
            </div>

            {/* form */}
            {mode !== "idle" && (
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
                        {mode === "create" ? "Add Billing" : `Edit Billing #${editingId}`}
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
                                    setForm((f) => ({
                                        ...f,
                                        patientId: Number(e.target.value) || ("" as any),
                                    }))
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
                                    setForm((f) => ({
                                        ...f,
                                        admissionId: Number(e.target.value) || ("" as any),
                                    }))
                                }
                                inputMode="numeric"
                                required
                                style={styles.input}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Billed At</span>
                            <input
                                type="datetime-local"
                                value={
                                    form.billedAt ? new Date(form.billedAt).toISOString().slice(0, 16) : ""
                                }
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, billedAt: new Date(e.target.value).toISOString() }))
                                }
                                style={styles.input}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Status</span>
                            <input
                                value={form.status ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                style={styles.input}
                            />
                        </label>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gap: 12,
                            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        }}
                    >
                        {([
                            ["Room Charges", "roomCharges"],
                            ["Treatment Charges", "treatmentCharges"],
                            ["Medication Charges", "medicationCharges"],
                            ["Other Charges", "otherCharges"],
                            ["Discount", "discount"],
                            ["Tax", "tax"],
                        ] as const).map(([label, key]) => (
                            <label key={key} style={{ display: "grid", gap: 6 }}>
                                <span>{label}</span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    value={(form as any)[key] ?? 0}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 } as any))
                                    }
                                    style={styles.input}
                                />
                            </label>
                        ))}
                    </div>

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
                            {mode === "create" ? "Create" : "Save Changes"}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            style={styles.btnSecondary}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* add button */}
            {mode === "idle" && (
                <div style={{ marginTop: 12 }}>
                    <button
                        type="button"
                        onClick={() => setMode("create")}
                        style={styles.btnPrimary}
                    >
                        Add Billing
                    </button>
                </div>
            )}
        </section>
    );
}
