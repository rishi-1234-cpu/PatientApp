import { useMutation } from "@tanstack/react-query";
import { askAi, aiSummary } from "../Services/Ai";
import type { AiSummaryRequest, AiSummaryResponse } from "../Services/Ai";
import { useState } from "react";

type Mode = "summary" | "generic";

export default function AiSummary() {
    const [mode, setMode] = useState<Mode>("summary");

    // generic
    const [prompt, setPrompt] = useState("");

    // summary
    const [notes, setNotes] = useState("");
    const [patientId, setPatientId] = useState<number | "">("");
    const [age, setAge] = useState<number | "">("");
    const [temperatureC, setTemperatureC] = useState<number | "">("");
    const [duration, setDuration] = useState("");
    const [medicationsTried, setMedicationsTried] = useState("");
    const [dischargedStable, setDischargedStable] = useState(false); // now used

    const mAsk = useMutation({
        mutationFn: (p: string) => askAi(p),
    });

    const mSummary = useMutation({
        mutationFn: (req: AiSummaryRequest) => aiSummary(req),
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === "generic") {
            if (!prompt.trim()) return;
            mSummary.reset();
            mAsk.mutate(prompt.trim());
            return;
        }

        // summary payload
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

    // --- styles for tabs (clear active/hover) ---
    const buttonBase: React.CSSProperties = {
        padding: "10px 14px",
        borderRadius: 8,
        border: "2px solid #1976d2",
        background: "#f5f9ff",
        color: "#1976d2",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
    };
    const buttonActive: React.CSSProperties = {
        ...buttonBase,
        background: "#1976d2",
        color: "#fff",
    };
    const buttonHover: React.CSSProperties = {
        ...buttonBase,
        background: "#1565c0",
        color: "#fff",
        borderColor: "#1565c0",
    };

    const isLoading = mAsk.isPending || mSummary.isPending;

    return (
        <section>
            <h2>AI Summary</h2>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    style={mode === "summary" ? buttonActive : buttonBase}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHover)}
                    onMouseOut={(e) =>
                        Object.assign(e.currentTarget.style, mode === "summary" ? buttonActive : buttonBase)
                    }
                    onClick={() => setMode("summary")}
                >
                    Case Summary
                </button>
                <button
                    type="button"
                    style={mode === "generic" ? buttonActive : buttonBase}
                    onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHover)}
                    onMouseOut={(e) =>
                        Object.assign(e.currentTarget.style, mode === "generic" ? buttonActive : buttonBase)
                    }
                    onClick={() => setMode("generic")}
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
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                ) : (
                    <>
                        <textarea
                            placeholder='Notes (manual), e.g., "fever 3 days, 38.5°C, responded to paracetamol, discharged stable"'
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{
                                width: "100%",
                                padding: 12,
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                marginBottom: 12,
                            }}
                        />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <input
                                type="number"
                                placeholder="Patient Id (optional)"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value === "" ? "" : Number(e.target.value))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                            <input
                                type="number"
                                placeholder="Age (optional)"
                                value={age}
                                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Temperature °C (optional)"
                                value={temperatureC}
                                onChange={(e) =>
                                    setTemperatureC(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                            <input
                                type="text"
                                placeholder='Duration (optional), e.g., "3 days"'
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                            <input
                                type="text"
                                placeholder="Medications tried (optional)"
                                value={medicationsTried}
                                onChange={(e) => setMedicationsTried(e.target.value)}
                                style={{ gridColumn: "1 / span 2", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <input
                                type="checkbox"
                                checked={dischargedStable}
                                onChange={(e) => setDischargedStable(e.target.checked)}
                            />
                            Discharged stable
                        </label>
                    </>
                )}

                <div style={{ marginTop: 12 }}>
                    <button
                        type="submit"
                        disabled={isLoading || (mode === "generic" && !prompt.trim())}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: 0,
                            background: "#1976d2",
                            color: "#fff",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "background 0.2s ease-in-out",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#1565c0")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#1976d2")}
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
