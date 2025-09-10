// src/components/Patients.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getPatients,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient,
    getPatientSummary,
    type Patient,
} from "../Services/patients";

/* ---------------------------- helpers ---------------------------- */
function toFullName(p: Partial<Patient>) {
    const f = (p.firstName ?? "").trim();
    const l = (p.lastName ?? "").trim();
    return [f, l].filter(Boolean).join(" ");
}
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneRe = /^\+?[0-9\s-]{7,15}$/;

function validatePatient(form: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
}) {
    const errs: Record<string, string> = {};
    if (!form.firstName?.trim()) errs.firstName = "First name is required.";
    if (!form.lastName?.trim()) errs.lastName = "Last name is required.";

    if (!form.dateOfBirth) {
        errs.dateOfBirth = "Date of birth is required.";
    } else {
        const d = new Date(form.dateOfBirth);
        const today = new Date();
        if (isNaN(+d)) errs.dateOfBirth = "Enter a valid date.";
        else if (d > today) errs.dateOfBirth = "DOB cannot be in the future.";
        else if (d.getFullYear() < 1900) errs.dateOfBirth = "DOB year must be ≥ 1900.";
    }

    if (form.email && !emailRe.test(form.email)) errs.email = "Enter a valid email.";
    if (form.phone && !phoneRe.test(form.phone))
        errs.phone = "Enter a valid phone (digits/spaces/-/+, 7–15 chars).";

    return errs;
}

/* ----------------------------- component ----------------------------- */
type Mode = "idle" | "create" | "edit";

export default function Patients() {
    const qc = useQueryClient();

    // HARD stop for any stray empty/pseudo buttons (fixes “blank box”)
    const hardBlock = (
        <style>{`
/* kill pseudo-content some UI kits add */
button::before, button::after { content: none !important; }
/* if any button renders with no text at all, hide it */
button:empty { display: none !important; }

/* our own button utility styles so text is always visible */
.btn {
display:inline-flex; align-items:center; justify-content:center;
padding:10px 12px; border-radius:8px; line-height:1.2;
gap:8px; user-select:none;
font-weight:600; text-decoration:none;
}
.btn--primary { background:#1976d2; color:#fff; border:0; }
.btn--light { background:#fff; color:#111; border:1px solid #ccc; }
.btn--danger { background:#e53935; color:#fff; border:0; }
.btn--thin { padding:6px 10px; border-radius:6px; }
`}</style>
    );

    // data
    const { data, isLoading, isError } = useQuery({
        queryKey: ["patients"],
        queryFn: getPatients,
    });

    // ui state
    const [search, setSearch] = useState("");
    const [mode, setMode] = useState<Mode>("idle");
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [confirmId, setConfirmId] = useState<number | string | null>(null);

    // AI summary
    const [summaryFor, setSummaryFor] = useState<number | null>(null);
    const [summaryText, setSummaryText] = useState<string>("");

    // form model
    const [form, setForm] = useState<Partial<Patient>>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "Male",
        dateOfBirth: "",
    });
    const [formErr, setFormErr] = useState("");

    // populate form when editing
    useEffect(() => {
        if (mode === "edit" && editingId != null) {
            getPatient(editingId).then((p) =>
                setForm({
                    firstName: p.firstName ?? "",
                    lastName: p.lastName ?? "",
                    email: p.email ?? "",
                    phone: p.phone ?? "",
                    gender: p.gender ?? "Male",
                    dateOfBirth: (p.dateOfBirth ?? "").slice(0, 10),
                })
            );
            setFormErr("");
        }
    }, [mode, editingId]);

    // mutations
    const mCreate = useMutation({
        mutationFn: (payload: Partial<Patient>) => createPatient(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["patients"] });
            resetForm();
        },
    });
    const mUpdate = useMutation({
        mutationFn: (payload: Partial<Patient>) => {
            if (editingId == null) throw new Error("No patient id to update");
            return updatePatient(editingId, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["patients"] });
            resetForm();
        },
    });
    const mDelete = useMutation({
        mutationFn: (id: number | string) => deletePatient(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["patients"] });
            setConfirmId(null);
        },
    });

    // derived rows
    const rows = useMemo(() => {
        const t = search.trim().toLowerCase();
        if (!data) return [];
        if (!t) return data;
        return data.filter((p) => {
            const id = String(p.id);
            const name = toFullName(p).toLowerCase();
            const email = (p.email ?? "").toLowerCase();
            const phone = (p.phone ?? "").toLowerCase();
            const gender = (p.gender ?? "").toLowerCase();
            return id.includes(t) || name.includes(t) || email.includes(t) || phone.includes(t) || gender.includes(t);
        });
    }, [data, search]);

    // helpers
    function resetForm() {
        setMode("idle");
        setEditingId(null);
        setForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            gender: "Male",
            dateOfBirth: "",
        });
        setFormErr("");
    }
    function onEdit(p: Patient) {
        setEditingId(p.id);
        setMode("edit");
    }
    function onDeleteClick(p: Patient) {
        setConfirmId(p.id);
    }
    function onConfirmDelete(id: number | string) {
        mDelete.mutate(id);
    }
    function onCancelDelete() {
        setConfirmId(null);
    }
    async function onSummary(p: Patient) {
        setSummaryFor(p.id);
        setSummaryText("Loading summary…");
        try {
            const res = await getPatientSummary(p.id);
            setSummaryText(res.summary ?? "(No summary returned)");
        } catch {
            setSummaryText("Failed to fetch summary.");
        }
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs = validatePatient({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            dateOfBirth: form.dateOfBirth || null,
        });
        if (Object.keys(errs).length) {
            setFormErr(Object.values(errs)[0]);
            return;
        }
        const payload: Partial<Patient> = {
            firstName: form.firstName?.trim(),
            lastName: form.lastName?.trim(),
            email: form.email?.trim() || null,
            phone: form.phone?.trim() || null,
            gender: form.gender || null,
            dateOfBirth: form.dateOfBirth!, // validated
        };
        setFormErr("");
        if (mode === "create") mCreate.mutate(payload);
        if (mode === "edit") mUpdate.mutate(payload);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    /* ------------------------------- render ------------------------------- */
    return (
        <section>
            {hardBlock}
            <h2>Patients</h2>

            {/* search + add */}
            <div style={{ display: "flex", gap: 8, marginBlock: 16, alignItems: "center" }}>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, phone, gender, or ID…"
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <button
                    onClick={() => {
                        setMode("create");
                        setEditingId(null);
                        setForm({ firstName: "", lastName: "", email: "", phone: "", gender: "Male", dateOfBirth: "" });
                        setFormErr("");
                    }}
                    className="btn btn--primary"
                >
                    Add Patient
                </button>
            </div>

            {/* list / table */}
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                {isLoading && <p>Loading…</p>}
                {isError && <p style={{ color: "crimson" }}>Failed to load patients.</p>}
                {!isLoading && rows.length === 0 && <p>No patients found.</p>}

                {rows.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                <th style={{ padding: 8 }}>ID</th>
                                <th style={{ padding: 8 }}>Name</th>
                                <th style={{ padding: 8 }}>Email</th>
                                <th style={{ padding: 8 }}>Phone</th>
                                <th style={{ padding: 8 }}>Gender</th>
                                <th style={{ padding: 8, width: 360 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((p) => (
                                <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                    <td style={{ padding: 8 }}>{p.id}</td>
                                    <td style={{ padding: 8 }}>{toFullName(p) || "—"}</td>
                                    <td style={{ padding: 8 }}>{p.email || "—"}</td>
                                    <td style={{ padding: 8 }}>{p.phone || "—"}</td>
                                    <td style={{ padding: 8 }}>{p.gender || "—"}</td>
                                    <td style={{ padding: 8 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <button onClick={() => onEdit(p)} className="btn btn--light btn--thin">Edit</button>
                                            <button onClick={() => onSummary(p)} className="btn btn--light btn--thin" style={{ fontWeight: 600 }}>
                                                AI Summary
                                            </button>

                                            {confirmId === p.id ? (
                                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span style={{ fontSize: 12, color: "#555" }}>Confirm?</span>
                                                    <button
                                                        onClick={() => onConfirmDelete(p.id)}
                                                        disabled={mDelete.isPending}
                                                        className="btn btn--danger btn--thin"
                                                    >
                                                        {mDelete.isPending ? "Deleting…" : "Yes"}
                                                    </button>
                                                    <button onClick={onCancelDelete} className="btn btn--light btn--thin">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => onDeleteClick(p)} className="btn btn--danger btn--thin">Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* AI summary panel */}
            {summaryFor != null && (
                <div
                    style={{
                        marginTop: 16,
                        padding: 16,
                        border: "1px solid #dde3ea",
                        borderRadius: 8,
                        background: "#fbfdff",
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>AI Patient Summary (ID: {summaryFor})</h3>
                    <pre
                        style={{
                            whiteSpace: "pre-wrap",
                            margin: 0,
                            fontFamily: "inherit",
                            lineHeight: 1.5,
                        }}
                    >
                        {summaryText}
                    </pre>
                </div>
            )}

            {/* drawer-ish add/edit form */}
            {mode !== "idle" && (
                <form
                    onSubmit={onSubmit}
                    style={{
                        marginTop: 16,
                        padding: 16,
                        border: "1px solid #dde3ea",
                        borderRadius: 8,
                        background: "#fbfdff",
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>{mode === "create" ? "Add Patient" : `Edit Patient #${editingId}`}</h3>

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span>First name *</span>
                            <input
                                value={form.firstName ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                                required
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Last name *</span>
                            <input
                                value={form.lastName ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                                required
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Email</span>
                            <input
                                type="email"
                                value={form.email ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Phone</span>
                            <input
                                value={form.phone ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Gender</span>
                            <select
                                value={form.gender ?? "Male"}
                                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Date of birth *</span>
                            <input
                                type="date"
                                value={form.dateOfBirth ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                                required
                                min="1900-01-01"
                                max={todayStr}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </label>
                    </div>

                    {formErr && <div style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>{formErr}</div>}

                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                        <button
                            type="submit"
                            disabled={mCreate.isPending || mUpdate.isPending}
                            className="btn btn--primary"
                        >
                            {mode === "create" ? "Create" : "Save Changes"}
                        </button>

                        {/* NOTE: explicit text + visible color so it can’t appear “blank” */}
                        <button
                            type="button"
                            onClick={resetForm}
                            className="btn btn--light"
                            title="Cancel and close the form"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}
