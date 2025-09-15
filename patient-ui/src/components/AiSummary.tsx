// src/components/AiSummary.tsx
import { useMutation } from "@tanstack/react-query";
import { askAi, aiSummary } from "../Services/Ai";
import type { AiSummaryRequest, AiSummaryResponse } from "../Services/Ai";
import { useState } from "react";

type Mode = "summary" | "generic";

export default function AiSummary() {
    const [mode, setMode] = useState<Mode>("summary");

    // generic
    const [prompt, setPrompt] = useState("");

    // summary inputs
    const [notes, setNotes] = useState("");
    const [patientId, setPatientId] = useState<number | "">("");
    const [age, setAge] = useState<number | "">("");
    const [temperatureC, setTemperatureC] = useState<number | "">("");
    const [duration, setDuration] = useState("");
    const [medicationsTried, setMedicationsTried] = useState("");
    const [dischargedStable, setDischargedStable] = useState(false);

    const mAsk = useMutation({ mutationFn: (p: string) => askAi(p) });
    const mSummary = useMutation({ mutationFn: (req: AiSummaryRequest) => aiSummary(req) });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === "generic") {
            if (!prompt.trim()) return;
            mSummary.reset();
            mAsk.mutate(prompt.trim());
            return;
        }

        const payload: AiSummaryRequest = {
            notes: notes.trim() ? notes.trim() : null,
            patientId: patientId === "" ? null : Number(patientId),
            age: age === "" ? null : Number(age),
            temperatureC: temperatureC === "" ? null : Number(temperatureC),
            duration: duration.trim() ? duration.trim() : null,
            medicationsTried: medicationsTried.trim() ? medicationsTried.trim() : null,
            dischargedStable,
        };

        mAsk.reset();
        mSummary.mutate(payload);
    };

    const isLoading = mAsk.isPending || mSummary.isPending;

    // ----- shared styles (mobile-friendly) -----
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
        textArea: {
            width: "100%",
            padding: 12,
            minHeight: 100,
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
        } as React.CSSProperties,
        btnBase: {
            padding: "10px 14px",
            minHeight: 44,
            borderRadius: 8,
            border: 0,
            fontWeight: 600,
            cursor: "pointer",
        } as React.CSSProperties,
        btnPrimary: {
            background: "#1976d2",
            color: "#fff",
        } as React.CSSProperties,
        btnOutline: {
            border: "2px solid #1976d2",
            background: "#f5f9ff",
            color: "#1976d2",
        } as React.CSSProperties,
        btnOutlineActive: {
            background: "#1976d2",
            color: "#fff",
            borderColor: "#1976d2",
        } as React.CSSProperties,
        gridAuto: {
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        } as React.CSSProperties,
    };

    return (
        <section>
            <style>{`
/* small helper for stacking on tiny screens */
@media (max-width: 600px){
.stack-sm { flex-direction: column; align-items: stretch; }
.stack-sm > * { width: 100% }
}
`}</style>

            <h2>AI Summary</h2>

            {/* Tabs */}
            <div className="stack-sm" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    onClick={() => setMode("summary")}
                    style={{
                        ...styles.btnBase,
                        ...(mode === "summary" ? styles.btnOutlineActive : styles.btnOutline),
                    }}
                    aria-pressed={mode === "summary"}
                >
                    Case Summary
                </button>
                <button
                    type="button"
                    onClick={() => setMode("generic")}
                    style={{
                        ...styles.btnBase,
                        ...(mode === "generic" ? styles.btnOutlineActive : styles.btnOutline),
                    }}
                    aria-pressed={mode === "generic"}
                >
                    Generic Ask
                </button>
            </div>

            {/* Form */}
            <form
                onSubmit={onSubmit}
                style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}
            >
                {mode === "generic" ? (
                    <textarea
                        rows={5}
                        placeholder="Ask the AI anything…"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        style={styles.textArea}
                    />
                ) : (
                    <>
                        <textarea
                            placeholder='Notes (manual), e.g., "fever 3 days, 38.5°C, responded to paracetamol, discharged stable"'
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ ...styles.textArea, marginBottom: 12 }}
                        />

                        <div style={styles.gridAuto}>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Patient Id (optional)"
                                value={patientId}
                                onChange={(e) =>
                                    setPatientId(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                style={styles.input}
                                aria-label="Patient Id (optional)"
                            />
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Age (optional)"
                                value={age}
                                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                                style={styles.input}
                                aria-label="Age (optional)"
                            />
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                placeholder="Temperature °C (optional)"
                                value={temperatureC}
                                onChange={(e) =>
                                    setTemperatureC(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                style={styles.input}
                                aria-label="Temperature in Celsius (optional)"
                            />
                            <input
                                type="text"
                                placeholder='Duration (optional), e.g., "3 days"'
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                style={styles.input}
                                aria-label="Duration (optional)"
                                autoComplete="off"
                            />
                            <input
                                type="text"
                                placeholder="Medications tried (optional)"
                                value={medicationsTried}
                                onChange={(e) => setMedicationsTried(e.target.value)}
                                style={{ ...styles.input, gridColumn: "1 / -1" }}
                                aria-label="Medications tried (optional)"
                                autoComplete="off"
                            />
                        </div>

                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginTop: 12,
                                lineHeight: 1.2,
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={dischargedStable}
                                onChange={(e) => setDischargedStable(e.target.checked)}
                                style={{ width: 20, height: 20 }}
                            />
                            Discharged stable
                        </label>
                    </>
                )}

                <div style={{ marginTop: 12 }}>
                    <button
                        type="submit"
                        disabled={isLoading || (mode === "generic" && !prompt.trim())}
                        style={{ ...styles.btnBase, ...styles.btnPrimary }}
                    >
                        {mode === "generic"
                            ? mAsk.isPending
                                ? "Asking…"
                                : "Ask AI"
                            : mSummary.isPending
                                ? "Summarizing…"
                                : "Get Summary"}
                    </button>
                </div>
            </form>

            {/* Output */}
            <div
                style={{
                    marginTop: 16,
                    padding: 16,
                    border: "1px solid #dde3ea",
                    borderRadius: 8,
                    background: "#fbfdff",
                    minHeight: 80,
                    whiteSpace: "pre-wrap",
                }}
            >
                {mode === "generic" ? (
                    mAsk.isError ? (
                        <span style={{ color: "crimson" }}>Failed to fetch reply.</span>
                    ) : (
                        mAsk.data ?? "AI output will appear here."
                    )
                ) : mSummary.isError ? (
                    <span style={{ color: "crimson" }}>Failed to fetch summary.</span>
                ) : mSummary.data ? (
                    <>
                        {(mSummary.data as AiSummaryResponse).summary}
                        {"traceId" in (mSummary.data as AiSummaryResponse) && (
                            <div style={{ marginTop: 8, fontSize: 12, color: "#637381" }}>
                                traceId: {(mSummary.data as AiSummaryResponse).traceId}
                            </div>
                        )}
                    </>
                ) : (
                    "AI output will appear here."
                )}
            </div>
        </section>
    );
}
