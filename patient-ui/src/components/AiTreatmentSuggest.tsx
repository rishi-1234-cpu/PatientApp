// src/components/AiTreatmentSuggest.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    treatmentSuggest,
    type TreatmentSuggestRequest,
    type TreatmentSuggestResult,
} from "../Services/Ai";

export default function AiTreatmentSuggest() {
    const [form, setForm] = useState<TreatmentSuggestRequest>({
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
    });

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
        mSuggest.mutate(form);
    };

    // ---------- pretty rendering ----------
    function PrettyResult({ data }: { data?: TreatmentSuggestResult }) {
        if (!data) return <p style={{ margin: 0, color: "#6b7280" }}>No output yet.</p>;
        if ("result" in data) return <pre style={{ margin: 0 }}>{data.result}</pre>; // fallback text

        const r = data; // structured JSON
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
                            {r.medicationOptions.map((m, i) => (
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

    return (
        <section>
            <h2>AI Treatment Suggest</h2>

            <form
                onSubmit={onSubmit}
                style={{
                    padding: 16,
                    border: "1px solid #eee",
                    borderRadius: 8,
                    background: "#fff",
                }}
                autoComplete="off"
            >
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <Field label="Patient ID (optional)">
                        <input
                            type="number"
                            value={form.patientId ?? ""}
                            onChange={(e) => set("patientId", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="Diagnosis">
                        <input
                            value={form.diagnosis ?? ""}
                            onChange={(e) => set("diagnosis", e.target.value)}
                        />
                    </Field>

                    <Field label="Symptoms (comma separated)">
                        <input
                            value={(form.symptoms ?? []).join(", ")}
                            onChange={(e) => set("symptoms", parseCSV(e.target.value))}
                        />
                    </Field>

                    <Field label="Temperature (°C)">
                        <input
                            type="number"
                            step="0.1"
                            value={form.tempC ?? ""}
                            onChange={(e) => set("tempC", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="Pulse (bpm)">
                        <input
                            type="number"
                            value={form.pulse ?? ""}
                            onChange={(e) => set("pulse", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="Resp. Rate">
                        <input
                            type="number"
                            value={form.respRate ?? ""}
                            onChange={(e) => set("respRate", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="Systolic">
                        <input
                            type="number"
                            value={form.systolic ?? ""}
                            onChange={(e) => set("systolic", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="Diastolic">
                        <input
                            type="number"
                            value={form.diastolic ?? ""}
                            onChange={(e) => set("diastolic", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="SpO₂">
                        <input
                            type="number"
                            value={form.spO2 ?? ""}
                            onChange={(e) => set("spO2", numOrUndef(e.target.value))}
                        />
                    </Field>

                    <Field label="Allergies (comma separated)">
                        <input
                            value={(form.allergies ?? []).join(", ")}
                            onChange={(e) => set("allergies", parseCSV(e.target.value))}
                        />
                    </Field>

                    <Field label="Medications (comma separated)">
                        <input
                            value={(form.medications ?? []).join(", ")}
                            onChange={(e) => set("medications", parseCSV(e.target.value))}
                        />
                    </Field>

                    <Field label="Notes" full>
                        <textarea
                            rows={3}
                            value={form.notes ?? ""}
                            onChange={(e) => set("notes", e.target.value)}
                        />
                    </Field>
                </div>

                <div style={{ marginTop: 12 }}>
                    <button
                        type="submit"
                        disabled={mSuggest.isPending}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: 0,
                            background: "#1976d2",
                            color: "#fff",
                            fontWeight: 600,
                        }}
                    >
                        {mSuggest.isPending ? "Generating…" : "Suggest Treatment"}
                    </button>
                </div>
            </form>

            <div
                style={{
                    marginTop: 16,
                    padding: 16,
                    border: "1px solid #dde3ea",
                    borderRadius: 8,
                    background: "#fbfdff",
                }}
            >
                {mSuggest.isError ? (
                    <span style={{ color: "crimson" }}>Failed to fetch suggestions.</span>
                ) : (
                    <PrettyResult data={mSuggest.data} />
                )}
            </div>
        </section>
    );
}

// small styled field wrapper
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
            <div
                style={{
                    display: "flex",
                }}
            >
                {/* apply consistent input styling */}
                {children &&
                    (Array.isArray(children) ? (
                        children
                    ) : (
                        // @ts-ignore – we set style at runtime
                        <div style={{ width: "100%" }}>
                            {cloneWithInputStyle(children as any)}
                        </div>
                    ))}
            </div>
        </label>
    );
}

function cloneWithInputStyle(el: any) {
    if (!el || typeof el !== "object") return el;
    const style = {
        padding: 10,
        borderRadius: 8,
        border: "1px solid #ddd",
        width: "100%",
    } as const;
    return { ...el, props: { ...el.props, style: { ...style, ...(el.props?.style || {}) } } };
}