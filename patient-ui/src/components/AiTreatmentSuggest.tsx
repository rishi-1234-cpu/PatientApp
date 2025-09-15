// src/components/AiTreatmentSuggest.tsx
import React, { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    treatmentSuggest,
    getLatestVitals,
    type TreatmentSuggestRequest,
    type TreatmentSuggestResult,
    type LatestVitalsResponse,
} from "../Services/Ai";

const initialForm: TreatmentSuggestRequest = {
    patientId: undefined,
    diagnosis: "",
    symptoms: [],
    tempC: undefined,
    pulse: undefined,
    respRate: undefined,
    systolic: undefined,
    diastolic: undefined,
    spO2: undefined,
    allergies: [],
    medications: [],
    notes: "",
};

type Banner =
    | { kind: "ok"; msg: string }
    | { kind: "warn"; msg: string }
    | { kind: "err"; msg: string }
    | null;

export default function AiTreatmentSuggest() {
    const [form, setForm] = useState<TreatmentSuggestRequest>(initialForm);
    const [banner, setBanner] = useState<Banner>(null);

    const mSuggest = useMutation({
        mutationFn: (payload: TreatmentSuggestRequest) => treatmentSuggest(payload),
    });

    const set = (k: keyof TreatmentSuggestRequest, v: any) =>
        setForm((f) => ({ ...f, [k]: v }));

    const parseCSV = (s: string) =>
        s
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);

    const numOrUndef = (s: string) => (s === "" ? undefined : Number(s));

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setBanner(null);
        mSuggest.mutate(form);
    };

    const onReset = () => {
        setForm(initialForm);
        setBanner(null);
        mSuggest.reset();
    };

    const onAutofill = async () => {
        setBanner(null);
        const id = form.patientId;
        if (!id || id <= 0) {
            setBanner({ kind: "warn", msg: "Enter a valid Patient ID to autofill." });
            return;
        }
        try {
            const r: LatestVitalsResponse = await getLatestVitals(id);
            if (!r.latest) {
                setBanner({ kind: "warn", msg: "No vitals found for this patient." });
                return;
            }
            setForm((f) => ({
                ...f,
                tempC: r.latest?.tempC ?? f.tempC,
                pulse: r.latest?.pulse ?? f.pulse,
                respRate: r.latest?.respRate ?? f.respRate,
                systolic: r.latest?.systolic ?? f.systolic,
                diastolic: r.latest?.diastolic ?? f.diastolic,
                spO2: r.latest?.spO2 ?? f.spO2,
            }));
            const when = new Date(r.latest.recordedAt);
            setBanner({
                kind: "ok",
                msg: `Latest vitals fetched at ${when.toLocaleString()}`,
            });
        } catch (err: any) {
            setBanner({ kind: "err", msg: err?.message ?? "Autofill failed." });
        }
    };

    const isPending = mSuggest.isPending;
    const isDirty = useMemo(
        () => JSON.stringify(form) !== JSON.stringify(initialForm),
        [form]
    );

    // --- shared styles (mobile-first) ---
    const styles = {
        card: {
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 8,
            background: "#fff",
        } as React.CSSProperties,
        grid: {
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        } as React.CSSProperties,
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
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#111827",
            fontWeight: 600,
            cursor: "pointer",
        } as React.CSSProperties,
    };

    return (
        <section>
            <h2>AI Treatment Suggest</h2>

            <form onSubmit={onSubmit} style={styles.card} autoComplete="off">
                <div style={styles.grid}>
                    <Field label="Patient ID (optional)">
                        <div style={{ display: "flex", gap: 8, width: "100%" }}>
                            <input
                                type="number"
                                inputMode="numeric"
                                value={form.patientId ?? ""}
                                onChange={(e) => set("patientId", numOrUndef(e.target.value))}
                                style={styles.input}
                            />
                            <button
                                type="button"
                                onClick={onAutofill}
                                disabled={isPending}
                                title="Autofill latest vitals from DB"
                                style={{
                                    ...styles.btnPrimary,
                                    whiteSpace: "nowrap",
                                    opacity: isPending ? 0.7 : 1,
                                }}
                            >
                                Autofill
                            </button>
                        </div>
                    </Field>

                    <Field label="Diagnosis">
                        <input
                            value={form.diagnosis ?? ""}
                            onChange={(e) => set("diagnosis", e.target.value)}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Symptoms (comma separated)">
                        <input
                            value={(form.symptoms ?? []).join(", ")}
                            onChange={(e) => set("symptoms", parseCSV(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Temperature (°C)">
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value={form.tempC ?? ""}
                            onChange={(e) => set("tempC", numOrUndef(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Pulse (bpm)">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={form.pulse ?? ""}
                            onChange={(e) => set("pulse", numOrUndef(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Resp. Rate">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={form.respRate ?? ""}
                            onChange={(e) => set("respRate", numOrUndef(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Systolic">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={form.systolic ?? ""}
                            onChange={(e) => set("systolic", numOrUndef(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Diastolic">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={form.diastolic ?? ""}
                            onChange={(e) => set("diastolic", numOrUndef(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="SpO₂">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={form.spO2 ?? ""}
                            onChange={(e) => set("spO2", numOrUndef(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Allergies (comma separated)">
                        <input
                            value={(form.allergies ?? []).join(", ")}
                            onChange={(e) => set("allergies", parseCSV(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Medications (comma separated)">
                        <input
                            value={(form.medications ?? []).join(", ")}
                            onChange={(e) => set("medications", parseCSV(e.target.value))}
                            style={styles.input}
                        />
                    </Field>

                    <Field label="Notes" full>
                        <textarea
                            rows={3}
                            value={form.notes ?? ""}
                            onChange={(e) => set("notes", e.target.value)}
                            style={{ ...styles.input, minHeight: 100 }}
                        />
                    </Field>
                </div>

                {/* Banner */}
                {banner && (
                    <div
                        style={{
                            marginTop: 12,
                            padding: 10,
                            borderRadius: 8,
                            background:
                                banner.kind === "ok"
                                    ? "#e7f5ee"
                                    : banner.kind === "warn"
                                        ? "#fff4e5"
                                        : "#fdecec",
                            color:
                                banner.kind === "ok"
                                    ? "#166534"
                                    : banner.kind === "warn"
                                        ? "#92400e"
                                        : "#991b1b",
                            border:
                                banner.kind === "ok"
                                    ? "1px solid #b7e4c7"
                                    : banner.kind === "warn"
                                        ? "1px solid #facc15"
                                        : "1px solid #fca5a5",
                        }}
                    >
                        {banner.msg}
                    </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        type="submit"
                        disabled={isPending}
                        style={{ ...styles.btnPrimary, opacity: isPending ? 0.7 : 1 }}
                    >
                        {isPending ? "Generating…" : "Suggest Treatment"}
                    </button>

                    <button
                        type="button"
                        onClick={onReset}
                        disabled={isPending || !isDirty}
                        style={{
                            ...styles.btnSecondary,
                            opacity: isPending || !isDirty ? 0.6 : 1,
                        }}
                        title="Clear all fields"
                    >
                        Reset
                    </button>
                </div>
            </form>

            <div style={{ ...styles.card, marginTop: 16, background: "#fbfdff" }}>
                {mSuggest.isError ? (
                    <span style={{ color: "crimson" }}>Failed to fetch suggestions.</span>
                ) : (
                    <PrettyResult data={mSuggest.data} />
                )}
            </div>
        </section>
    );
}

/* ---------- pretty rendering ---------- */
function PrettyResult({ data }: { data?: TreatmentSuggestResult }) {
    if (!data) return <p style={{ margin: 0, color: "#6b7280" }}>No output yet.</p>;
    if ("result" in data) return <pre style={{ margin: 0 }}>{data.result}</pre>;

    const r = data;
    return (
        <div style={{ display: "grid", gap: 10 }}>
            {r.triageLevel && (
                <div>
                    <strong>Triage level:</strong> {r.triageLevel}
                </div>
            )}

            {Array.isArray(r.redFlags) && r.redFlags.length > 0 && (
                <Section title="Red flags" items={r.redFlags} />
            )}
            {Array.isArray(r.recommendedTests) && r.recommendedTests.length > 0 && (
                <Section title="Recommended tests" items={r.recommendedTests} />
            )}
            {Array.isArray(r.initialManagement) && r.initialManagement.length > 0 && (
                <Section title="Initial management" items={r.initialManagement} />
            )}
            {Array.isArray(r.medicationOptions) && r.medicationOptions.length > 0 && (
                <div>
                    <h4 style={{ margin: "8px 0" }}>Medication options</h4>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {r.medicationOptions.map((m: any, i: number) => (
                            <li key={i} style={{ marginBottom: 6 }}>
                                <div>
                                    <strong>{m.name}</strong>
                                    {m.class ? ` — ${m.class}` : ""}{" "}
                                    {m.typicalDose ? `• ${m.typicalDose}` : ""}
                                </div>
                                {m.notes && (
                                    <div style={{ color: "#4b5563", fontSize: 14 }}>{m.notes}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {r.followUp && (
                <div>
                    <h4 style={{ margin: "8px 0" }}>Follow-up</h4>
                    <p style={{ margin: 0 }}>{r.followUp}</p>
                </div>
            )}
            {r.disclaimer && (
                <p style={{ margin: 0, color: "#6b7280", fontStyle: "italic" }}>
                    {r.disclaimer}
                </p>
            )}
        </div>
    );
}

function Section({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <h4 style={{ margin: "8px 0" }}>{title}</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
                {items.map((x, i) => (
                    <li key={i}>{x}</li>
                ))}
            </ul>
        </div>
    );
}

/* ---------- small styled field wrapper ---------- */
function Field({
    label,
    children,
    full = false,
}: {
    label: string;
    children: React.ReactNode;
    full?: boolean;
}) {
    return (
        <label
            style={{
                display: "grid",
                gap: 6,
                gridColumn: full ? "1 / -1" : undefined,
            }}
        >
            <span>{label}</span>
            <div style={{ display: "flex" }}>
                <div style={{ width: "100%" }}>{styleInput(children)}</div>
            </div>
        </label>
    );
}

function styleInput(node: React.ReactNode): React.ReactNode {
    if (!React.isValidElement(node)) return node;
    const base: React.CSSProperties = {
        width: "100%",
        padding: 12,
        minHeight: 44,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fff",
        fontSize: 16,
    };
    const extra: any = {};
    const t = (node.props as any)?.type;
    if (t === "number") {
        extra.inputMode = (node.props as any)?.step ? "decimal" : "numeric";
    }
    return React.cloneElement(node as any, {
        style: { ...base, ...(node.props as any)?.style },
        ...extra,
    });
}
