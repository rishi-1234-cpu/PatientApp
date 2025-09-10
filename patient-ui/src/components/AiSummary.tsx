import { useMutation } from "@tanstack/react-query";
import { askAi } from "../Services/Ai";
import { useState } from "react";

export default function AiSummary() {
    const [prompt, setPrompt] = useState("");
    const mAsk = useMutation({
        mutationFn: (p: string) => askAi(p),
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        mAsk.mutate(prompt.trim());
    };

    return (
        <section>
            <h2>AI Summary</h2>

            <form
                onSubmit={onSubmit}
                style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}
            >
                <textarea
                    rows={5}
                    placeholder="Ask the AI to summarize a patient, discharge note, or chart…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <div style={{ marginTop: 12 }}>
                    <button
                        type="submit"
                        disabled={mAsk.isPending || !prompt.trim()}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: 0,
                            background: "#1976d2",
                            color: "#fff",
                            fontWeight: 600,
                        }}
                    >
                        {mAsk.isPending ? "Asking…" : "Ask AI"}
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
                    minHeight: 80,
                    whiteSpace: "pre-wrap",
                }}
            >
                {mAsk.isError && <span style={{ color: "crimson" }}>Failed to fetch reply.</span>}
                {!mAsk.isError && (mAsk.data ?? "AI output will appear here.")}
            </div>
        </section>
    );
}
