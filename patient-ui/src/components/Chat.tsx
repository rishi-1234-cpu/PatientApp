// src/components/Chat.tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getRecent,
    sendMessageHttp,
    type ChatCreateDto,
    type ChatMessage,
} from "../Services/chat";
import {
    HubConnection,
    HubConnectionBuilder,
    LogLevel,
    HttpTransportType,
} from "@microsoft/signalr";

type ConnState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

/** Resolve hub URL from Vite env, e.g. https://patient-portal-api-ny3y.onrender.com */
const API_BASE =
    (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "") || "";
const HUB_URL = `${API_BASE}/hubs/chat`;

function buildConnection(): HubConnection {
    return new HubConnectionBuilder()
        .withUrl(HUB_URL, {
            // Render works best with direct WebSockets from the static site
            transport: HttpTransportType.WebSockets,
            skipNegotiation: true,
            withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(LogLevel.Information)
        .build();
}

export default function Chat() {
    const qc = useQueryClient();

    // ---- UI state ----
    const [room, setRoom] = useState("lobby");
    const [sender, setSender] = useState("staff:alice");
    const [patientId, setPatientId] = useState<number | "">("");
    const [text, setText] = useState("");

    // ---- connection state ----
    const [connState, setConnState] = useState<ConnState>("idle");
    const hubRef = useRef<HubConnection | null>(null);
    const prevRoomRef = useRef<string>("lobby");

    // ---- history (cache per room) ----
    const listRef = useRef<HTMLDivElement | null>(null);
    const {
        data: history = [],
        refetch,
    } = useQuery<ChatMessage[], Error>({
        queryKey: ["chat", room],
        queryFn: () => getRecent(room, 50),
        staleTime: 0,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
    });

    const messages = useMemo<ChatMessage[]>(() => history, [history]);

    // ---- auto-scroll on new messages or room change ----
    useLayoutEffect(() => {
        if (!listRef.current) return;
        requestAnimationFrame(() => {
            listRef.current!.scrollTop = listRef.current!.scrollHeight;
        });
    }, [messages.length, room]);

    // ---- start ONE SignalR connection (mount/unmount) ----
    useEffect(() => {
        let mounted = true;

        async function start() {
            setConnState("connecting");

            // stop old conn if any
            if (hubRef.current) {
                try {
                    await hubRef.current.stop();
                } catch { }
                hubRef.current = null;
            }

            const hub = buildConnection();
            hubRef.current = hub;

            hub.onreconnecting(() => setConnState("reconnecting"));
            hub.onreconnected(() => setConnState("connected"));
            hub.onclose(() => setConnState("disconnected"));

            // realtime: append into the correct room cache
            hub.on("newMessage", (payload: ChatMessage) => {
                const r = (payload?.room ?? "lobby") as string;
                qc.setQueryData<ChatMessage[]>(["chat", r], (prev) =>
                    prev ? [...prev, payload] : [payload]
                );
            });

            try {
                await hub.start();
                if (!mounted) return;
                setConnState("connected");

                // join the initial room
                prevRoomRef.current = room;
                try {
                    await hub.invoke("JoinRoom", room);
                } catch (e) {
                    console.warn("JoinRoom failed:", e);
                }

                // fetch history for initial room
                await refetch();
            } catch (e) {
                console.error("SignalR start failed:", e);
                if (mounted) setConnState("disconnected");
            }
        }

        start();

        // re-try on tab focus if disconnected
        const onFocus = () => {
            if (hubRef.current && hubRef.current.state !== "Connected") {
                start();
            }
        };
        window.addEventListener("focus", onFocus);

        return () => {
            mounted = false;
            window.removeEventListener("focus", onFocus);
            const hub = hubRef.current;
            hubRef.current = null;
            if (hub) {
                hub.invoke("LeaveRoom", prevRoomRef.current).catch(() => { });
                hub.stop().catch(() => { });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // mount once

    // ---- on room change: leave previous, join new, refetch history ----
    useEffect(() => {
        const run = async () => {
            const hub = hubRef.current;
            if (!hub) return;

            const prev = prevRoomRef.current;
            if (prev && prev !== room) {
                try {
                    await hub.invoke("LeaveRoom", prev);
                } catch { }
            }
            try {
                await hub.invoke("JoinRoom", room);
                prevRoomRef.current = room;
                await refetch();
            } catch (e) {
                console.warn("JoinRoom on room change failed:", e);
            }
        };
        run();
    }, [room, refetch]);

    // ---- send message via HTTP (server broadcasts to SignalR) ----
    const mSend = useMutation({
        mutationFn: (payload: ChatCreateDto) => sendMessageHttp(payload),
        onSuccess: async (saved) => {
            const r = saved.room ?? room;
            qc.setQueryData<ChatMessage[]>(["chat", r], (prev) =>
                prev ? [...prev, saved] : [saved]
            );
            setText("");
            setTimeout(() => {
                refetch();
            }, 50);
        },
    });

    const canSend =
        text.trim().length > 0 && connState === "connected" && !mSend.isPending;

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSend) return;

        mSend.mutate({
            room: room || "lobby",
            sender: sender || "",
            text: text.trim(),
            patientId: patientId === "" ? undefined : Number(patientId),
        });
    }

    return (
        <section>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Chat{" "}
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        display: "inline-block",
                        background:
                            connState === "connected"
                                ? "#2e7d32"
                                : connState === "reconnecting"
                                    ? "#f9a825"
                                    : "#c62828",
                    }}
                    title={connState}
                />
                <small style={{ color: "#777" }}>{connState}</small>
            </h2>

            {/* top inputs */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 12,
                }}
            >
                <label style={{ display: "grid", gap: 6 }}>
                    <span>Room</span>
                    <input
                        value={room}
                        onChange={(e) => setRoom(e.target.value.trim() || "lobby")}
                        placeholder='e.g. "lobby" or "patient-2"'
                        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Sender</span>
                    <input
                        value={sender}
                        onChange={(e) => setSender(e.target.value)}
                        placeholder='e.g. "staff:alice"'
                        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span>Patient ID (optional)</span>
                    <input
                        type="number"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : "")}
                        placeholder="e.g. 2"
                        style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    />
                </label>
            </div>

            {/* messages */}
            <div
                ref={listRef}
                style={{
                    border: "1px solid #eee",
                    borderRadius: 8,
                    padding: 12,
                    minHeight: 260,
                    background: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflowY: "auto",
                    scrollBehavior: "smooth",
                }}
            >
                {messages.length === 0 ? (
                    <div style={{ color: "#999" }}>No messages yet in this room.</div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id}>
                            <div style={{ fontSize: 12, color: "#666" }}>
                                <strong>{m.sender || "unknown"}</strong> ·{" "}
                                {new Date(m.sentAt).toLocaleString()}
                                {m.patientId ? ` · patient:${m.patientId}` : ""}
                            </div>
                            <div>{m.text}</div>
                        </div>
                    ))
                )}
            </div>

            {/* composer */}
            <form onSubmit={onSubmit} style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <input
                    placeholder="Type a message…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit(e);
                        }
                    }}
                    style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        background: "#fff",
                    }}
                />
                <button
                    type="submit"
                    disabled={!canSend}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: 0,
                        background: canSend ? "#1976d2" : "#b0bec5",
                        color: "#fff",
                        fontWeight: 600,
                        minWidth: 90,
                        cursor: canSend ? "pointer" : "not-allowed",
                    }}
                >
                    Send
                </button>
            </form>
        </section>
    );
}