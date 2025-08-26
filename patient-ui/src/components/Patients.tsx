import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

/* Types */
type Patient = {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string; // ISO
    gender: string;
    email: string;
    phone: string;
};

type AiSummaryDto = { id: number; summary: string };
type AskDto = { reply?: string; answer?: string; content?: string; text?: string };

/* Helpers */
const dateStr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : "");
const joinName = (p?: Partial<Patient>) =>
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

export default function Patients() {
    /* Data */
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);

    /* Create form + validation */
    const [newP, setNewP] = useState<Partial<Patient>>({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        email: "",
        phone: "",
    });
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const markTouched = (k: keyof Patient) => setTouched((t) => ({ ...t, [k]: true }));

    const errors = useMemo(() => {
        const e: Record<string, string> = {};
        if (!newP.firstName?.trim()) e.firstName = "First name is required.";
        if (!newP.lastName?.trim()) e.lastName = "Last name is required.";
        if (!newP.dateOfBirth) e.dateOfBirth = "Date of birth is required.";
        if (!newP.gender?.trim()) e.gender = "Gender is required.";
        if (!newP.phone?.trim()) e.phone = "Phone is required.";
        if (!newP.email?.trim()) e.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newP.email)) e.email = "Enter a valid email.";
        return e;
    }, [newP]);
    const canCreate = Object.keys(errors).length === 0;

    /* Edit */
    const [editId, setEditId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Partial<Patient>>({});

    /* Delete confirm (inline) */
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    /* AI summary UI */
    const [summaryHtml, setSummaryHtml] = useState<string>("");
    const [summaryHeader, setSummaryHeader] = useState<string>("AI Summary");
    const [summaryPulse, setSummaryPulse] = useState(false);
    const summaryRef = useRef<HTMLDivElement | null>(null);

    /* Ask AI UI */
    const [askText, setAskText] = useState("");
    const [answerHtml, setAnswerHtml] = useState("");
    const [answerPulse, setAnswerPulse] = useState(false);
    const askRef = useRef<HTMLDivElement | null>(null);

    /* Load patients */
    const load = async () => {
        setLoading(true);
        const res = await api.get<Patient[]>("/Patient");
        setPatients(res.data);
        setLoading(false);
    };
    useEffect(() => {
        load();
    }, []);

    /* --- Create --- */
    const create = async () => {
        setTouched({
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            email: true,
            phone: true,
        });
        if (!canCreate) return;

        await api.post("/Patient", newP);
        setNewP({
            firstName: "",
            lastName: "",
            dateOfBirth: "",
            gender: "",
            email: "",
            phone: "",
        });
        setTouched({});
        await load();
    };
    const clearNew = () => {
        setNewP({
            firstName: "",
            lastName: "",
            dateOfBirth: "",
            gender: "",
            email: "",
            phone: "",
        });
        setTouched({});
    };

    /* --- Edit / Update --- */
    const beginEdit = (p: Patient) => {
        setEditId(p.id);
        setDraft({ ...p });
        setConfirmDeleteId(null);
    };
    const cancelEdit = () => {
        setEditId(null);
        setDraft({});
    };
    const update = async () => {
        if (editId == null) return;
        await api.put(`/Patient/${editId}`, draft);
        setEditId(null);
        setDraft({});
        await load();
    };

    /* --- Delete --- */
    const askDelete = (id: number) => setConfirmDeleteId(id);
    const cancelDelete = () => setConfirmDeleteId(null);
    const confirmDelete = async (id: number) => {
        await api.delete(`/Patient/${id}`);
        setConfirmDeleteId(null);
        await load();
    };

    /* --- AI Summary --- */
    const aiSummary = async (p: Patient) => {
        setSummaryHeader(`AI Summary for #${p.id} ${joinName(p)}`);
        setSummaryHtml(`<span class="muted">Thinking…</span>`);
        const res = await api.get<AiSummaryDto>(`/Patient/${p.id}/summary`);
        const raw = (res.data as any)?.summary ?? "";
        setSummaryHtml(raw || '<span class="muted">No content.</span>');
        setSummaryPulse(true);
        setTimeout(() => setSummaryPulse(false), 900);
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const copySummary = async () => {
        await navigator.clipboard.writeText(summaryHtml.replace(/<\/?[^>]+(>|$)/g, ""));
    };
    const clearSummary = () => setSummaryHtml("");

    /* --- Ask AI --- */
    const askAi = async () => {
        const prompt = askText.trim();
        if (!prompt) return;
        setAnswerHtml(`<span class="muted">Thinking…</span>`);
        setAskText("");

        // Handles reply | answer | content | text (your backend returns any of these)
        const res = await api.post<AskDto>("/Ai/ask", { prompt });
        const content =
            res.data.reply ??
            res.data.answer ??
            res.data.content ??
            res.data.text ??
            "";

        setAnswerHtml(content || '<span class="muted">No answer returned.</span>');
        setAnswerPulse(true);
        setTimeout(() => setAnswerPulse(false), 900);
        askRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const copyAnswer = async () => {
        await navigator.clipboard.writeText(answerHtml.replace(/<\/?[^>]+(>|$)/g, ""));
    };
    const clearAnswer = () => setAnswerHtml("");

    return (
        <div className="page">
            <h1>Patient Portal</h1>

            {/* CREATE */}
            <div className="card">
                <div className="section-title">Add Patient</div>

                {/* 6 equal columns, Email stays inside */}
                <div className="grid grid-6">
                    {/* First name */}
                    <div className="field">
                        <input
                            placeholder="First name"
                            value={newP.firstName || ""}
                            onChange={(e) => setNewP({ ...newP, firstName: e.target.value })}
                            onBlur={() => markTouched("firstName")}
                            className={touched.firstName && errors.firstName ? "err" : ""}
                        />
                        {touched.firstName && errors.firstName && (
                            <div className="err-msg">{errors.firstName}</div>
                        )}
                    </div>

                    {/* Last name */}
                    <div className="field">
                        <input
                            placeholder="Last name"
                            value={newP.lastName || ""}
                            onChange={(e) => setNewP({ ...newP, lastName: e.target.value })}
                            onBlur={() => markTouched("lastName")}
                            className={touched.lastName && errors.lastName ? "err" : ""}
                        />
                        {touched.lastName && errors.lastName && (
                            <div className="err-msg">{errors.lastName}</div>
                        )}
                    </div>

                    {/* DOB */}
                    <div className="field">
                        <input
                            placeholder="mm / dd / yyyy"
                            type="date"
                            value={newP.dateOfBirth || ""}
                            onChange={(e) => setNewP({ ...newP, dateOfBirth: e.target.value })}
                            onBlur={() => markTouched("dateOfBirth")}
                            className={touched.dateOfBirth && errors.dateOfBirth ? "err" : ""}
                        />
                        {touched.dateOfBirth && errors.dateOfBirth && (
                            <div className="err-msg">{errors.dateOfBirth}</div>
                        )}
                    </div>

                    {/* Gender */}
                    <div className="field">
                        <input
                            placeholder="Gender"
                            value={newP.gender || ""}
                            onChange={(e) => setNewP({ ...newP, gender: e.target.value })}
                            onBlur={() => markTouched("gender")}
                            className={touched.gender && errors.gender ? "err" : ""}
                        />
                        {touched.gender && errors.gender && (
                            <div className="err-msg">{errors.gender}</div>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="field">
                        <input
                            placeholder="Phone"
                            value={newP.phone || ""}
                            onChange={(e) => setNewP({ ...newP, phone: e.target.value })}
                            onBlur={() => markTouched("phone")}
                            className={touched.phone && errors.phone ? "err" : ""}
                        />
                        {touched.phone && errors.phone && (
                            <div className="err-msg">{errors.phone}</div>
                        )}
                    </div>

                    {/* Email */}
                    <div className="field">
                        <input
                            placeholder="Email"
                            value={newP.email || ""}
                            onChange={(e) => setNewP({ ...newP, email: e.target.value })}
                            onBlur={() => markTouched("email")}
                            className={touched.email && errors.email ? "err" : ""}
                        />
                        {touched.email && errors.email && (
                            <div className="err-msg">{errors.email}</div>
                        )}
                    </div>
                </div>

                <div className="row">
                    <button className="btn" onClick={create} disabled={!canCreate}>
                        Create
                    </button>
                    <button className="btn btn--light" onClick={clearNew}>
                        Clear
                    </button>
                </div>
            </div>

            {/* EDIT BAR */}
            {editId !== null && (
                <div className="row mt-16">
                    <button className="btn" onClick={update}>Update</button>
                    <button className="btn btn--light" onClick={cancelEdit}>Cancel</button>
                    <span className="muted">Editing: #{editId} {joinName(draft)}</span>
                </div>
            )}

            {/* TABLE */}
            <div className="section-title">Patients</div>
            <div className="table-wrap card">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: 56 }}>Id</th>
                            <th>Name</th>
                            <th>DOB</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th style={{ width: 320 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.map((p) => {
                            const isEdit = editId === p.id;
                            const isConfirm = confirmDeleteId === p.id;
                            return (
                                <tr key={p.id}>
                                    <td>{p.id}</td>

                                    {/* Name */}
                                    <td>
                                        {!isEdit ? (
                                            `${p.firstName} ${p.lastName}`
                                        ) : (
                                            <div className="row">
                                                <input
                                                    style={{ width: 140 }}
                                                    value={draft.firstName || ""}
                                                    onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                                                    placeholder="First"
                                                />
                                                <input
                                                    style={{ width: 140 }}
                                                    value={draft.lastName || ""}
                                                    onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                                                    placeholder="Last"
                                                />
                                            </div>
                                        )}
                                    </td>

                                    {/* DOB */}
                                    <td>
                                        {!isEdit ? (
                                            dateStr(p.dateOfBirth)
                                        ) : (
                                            <input
                                                type="date"
                                                value={draft.dateOfBirth || ""}
                                                onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })}
                                            />
                                        )}
                                    </td>

                                    {/* Email */}
                                    <td>
                                        {!isEdit ? (
                                            p.email
                                        ) : (
                                            <input
                                                style={{ width: 220 }}
                                                value={draft.email || ""}
                                                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                                            />
                                        )}
                                    </td>

                                    {/* Phone */}
                                    <td>
                                        {!isEdit ? (
                                            p.phone
                                        ) : (
                                            <input
                                                style={{ width: 160 }}
                                                value={draft.phone || ""}
                                                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                                            />
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td>
                                        <div className="actions">
                                            {!isEdit ? (
                                                <button className="btn btn--link" onClick={() => beginEdit(p)}>
                                                    Edit
                                                </button>
                                            ) : (
                                                <span className="muted">Editing…</span>
                                            )}

                                            {!isConfirm ? (
                                                <button className="btn btn--danger" onClick={() => askDelete(p.id)}>
                                                    Delete
                                                </button>
                                            ) : (
                                                <span className="confirm-inline">
                                                    <span>Delete this patient?</span>
                                                    <button className="btn btn--danger" onClick={() => confirmDelete(p.id)}>
                                                        Confirm
                                                    </button>
                                                    <button className="btn btn--light" onClick={cancelDelete}>
                                                        Cancel
                                                    </button>
                                                </span>
                                            )}

                                            <button className="btn btn--subtle" onClick={() => aiSummary(p)}>
                                                AI Summary
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && patients.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: "center" }}>
                                    No patients yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* AI SUMMARY PANEL */}
            <div ref={summaryRef} className="card mt-20">
                <div className="section-title">🤖 {summaryHeader}</div>
                <div className="toolbar">
                    <button className="btn btn--light" onClick={copySummary}>Copy</button>
                    <button className="btn btn--light" onClick={clearSummary}>Clear</button>
                </div>
                <div
                    className={`summary-box ${summaryPulse ? "pulse" : ""}`}
                    dangerouslySetInnerHTML={{
                        __html:
                            summaryHtml ||
                            '<span class="muted">No content yet. Click "AI Summary" in the table.</span>',
                    }}
                />
            </div>

            {/* ASK AI */}
            <div ref={askRef} className="card mt-20">
                <div className="section-title">Ask the AI (generic)</div>
                <div className="ask-row">
                    <textarea
                        placeholder="Ask anything…"
                        value={askText}
                        onChange={(e) => setAskText(e.target.value)}
                    />
                    <button className="btn" onClick={askAi}>Ask</button>
                </div>
                <div className="toolbar">
                    <button className="btn btn--light" onClick={copyAnswer}>Copy</button>
                    <button className="btn btn--light" onClick={clearAnswer}>Clear</button>
                </div>
                <div
                    className={`answer-box ${answerPulse ? "pulse" : ""}`}
                    dangerouslySetInnerHTML={{
                        __html: answerHtml || '<span class="muted">No answer returned.</span>',
                    }}
                />
            </div>
        </div>
    );
}