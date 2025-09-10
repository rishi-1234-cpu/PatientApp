// src/components/Billing.tsx
import { useEffect, useMemo, useState } from "react";
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
    try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function BillingPage() {
    const qc = useQueryClient();

    // Hide accidental empty elements (defensive)
    const hideEmpty = (
        <style>{`button:empty, a:empty { display: none !important; }`}</style>
    );

    // server filters (either)
    const [patientFilter, setPatientFilter] = useState<string>("");
    const [admissionFilter, setAdmissionFilter] = useState<string>("");

    // client search
    const [search, setSearch] = useState("");

    // ui/form
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

    // data load with server-side filters
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["billings", patientFilter || "", admissionFilter || ""],
        queryFn: () => {
            if (patientFilter.trim()) return getBillingsByPatient(patientFilter.trim());
            if (admissionFilter.trim()) return getBillingsByAdmission(admissionFilter.trim());
            return getBillings();
        },
    });

    // mutations
    const mCreate = useMutation({
        mutationFn: (payload: Partial<Billing>) => createBilling(payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["billings"] }); resetForm(); },
    });

    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Billing>) => {
            if (editingId == null) throw new Error("No id to update");
            return updateBilling(editingId, payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["billings"] }); resetForm(); },
    });

    const mDelete = useMutation({
        mutationFn: (id: number | string) => deleteBilling(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["billings"] }); setConfirmId(null); },
    });

    // edit loader
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

    // client search on the loaded rows
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
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
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
                    onClick={() => refetch()}
                    style={{ padding: "10px 14px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600 }}
                >
                    Apply
                </button>
                <button
                    onClick={() => { setPatientFilter(""); setAdmissionFilter(""); setSearch(""); refetch(); }}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                >
                    Clear
                </button>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search status / notes / ids (client)"
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd", marginLeft: "auto" }}
                />
            </div>

            {/* table */}
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
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
                                <th style={{ padding: 8, width: 320 }}>Actions</th>
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
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <button
                                                onClick={() => { setEditingId(b.id); setMode("edit"); }}
                                                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", color: "#111", lineHeight: 1.2 }}
                                            >
                                                Edit
                                            </button>

                                            {confirmId === b.id ? (
                                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                    <button
                                                        onClick={() => mDelete.mutate(b.id)}
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
                                                    onClick={() => setConfirmId(b.id)}
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
                )}
            </div>

            {/* form */}
            {mode !== "idle" && (
                <form
                    onSubmit={onSubmit}
                    style={{ marginTop: 16, padding: 16, border: "1px solid #dde3ea", borderRadius: 8, background: "#fbfdff", display: "grid", gap: 12 }}
                >
                    <h3 style={{ margin: 0 }}>{mode === "create" ? "Add Billing" : `Edit Billing #${editingId}`}</h3>

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
                            <span>Billed At</span>
                            <input
                                type="datetime-local"
                                value={form.billedAt ? new Date(form.billedAt).toISOString().slice(0, 16) : ""}
                                onChange={(e) => setForm((f) => ({ ...f, billedAt: new Date(e.target.value).toISOString() }))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Status</span>
                            <input
                                value={form.status ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                        {[
                            ["Room Charges", "roomCharges"],
                            ["Treatment Charges", "treatmentCharges"],
                            ["Medication Charges", "medicationCharges"],
                            ["Other Charges", "otherCharges"],
                            ["Discount", "discount"],
                            ["Tax", "tax"],
                        ].map(([label, key]) => (
                            <label key={key} style={{ display: "grid", gap: 6 }}>
                                <span>{label}</span>
                                <input
                                    value={(form as any)[key] ?? 0}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 } as any))}
                                    style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
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
                            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                        />
                    </label>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="submit"
                            disabled={mCreate.isPending || mUpdate.isPending}
                            style={{ padding: "10px 12px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600 }}
                        >
                            {mode === "create" ? "Create" : "Save Changes"}
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
            )}

            {/* add button */}
            {mode === "idle" && (
                <div style={{ marginTop: 12 }}>
                    <button
                        onClick={() => setMode("create")}
                        style={{ padding: "10px 12px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600 }}
                    >
                        Add Billing
                    </button>
                </div>
            )}
        </section>
    );
}
