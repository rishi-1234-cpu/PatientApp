// src/components/Dashboard.tsx
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";

type AuthUser = { userName?: string; email?: string; roles?: string[] };

function useCount(path: string) {
    return useQuery({
        queryKey: ["count", path],
        queryFn: async () => {
            const { data } = await api.get(path);
            return Array.isArray(data) ? data.length : 0;
        },
    });
}

export default function Dashboard() {
    const qc = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        try { setUser(JSON.parse(localStorage.getItem("auth_user") || "null")); } catch { }
    }, []);

    const patients = useCount("Patient");
    const admissions = useCount("Admissions");
    const vitals = useCount("Vitals");
    const billings = useCount("Billings");
    const discharges = useCount("Discharges");

    const anyLoading =
        patients.isLoading || admissions.isLoading || vitals.isLoading || billings.isLoading || discharges.isLoading;

    const cards = [
        { label: "Patients", value: patients.data ?? 0, href: "/patients" },
        { label: "Admissions", value: admissions.data ?? 0, href: "/admissions" },
        { label: "Vitals", value: vitals.data ?? 0, href: "/vitals" },
        { label: "Billings", value: billings.data ?? 0, href: "/billing" },
        { label: "Discharges", value: discharges.data ?? 0, href: "/discharge" },
        { label: "Chat", value: "Open", href: "/chat" },
    ];

    function refresh() {
        qc.invalidateQueries({ queryKey: ["count"] });
    }

    return (
        <section style={{ display: "grid", gap: 16 }}>
            {/* Welcome */}
            <div style={{
                padding: 16, borderRadius: 10,
                background: "linear-gradient(135deg, rgba(25,118,210,.1), rgba(25,118,210,.05))",
                border: "1px solid #e3eef9", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                        👋 Welcome, {user?.userName || user?.email || "there"}!
                    </div>
                    {user?.roles?.length ? (
                        <div style={{ color: "#5f6b7a", marginTop: 4 }}>
                            Roles: <strong>{user.roles.join(", ")}</strong>
                        </div>
                    ) : null}
                </div>
                <button onClick={refresh} style={{ padding: "8px 12px", borderRadius: 8, border: 0, background: "#1976d2", color: "#fff", fontWeight: 600 }}>
                    Refresh
                </button>
            </div>

            {/* KPI Cards only */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {cards.map((c) => (
                    <a key={c.label} href={c.href} style={{
                        textDecoration: "none", color: "inherit", border: "1px solid #eee",
                        borderRadius: 10, background: "#fff", padding: 16, display: "grid", gap: 6
                    }}>
                        <div style={{ fontSize: 12, color: "#748091" }}>{c.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800 }}>{anyLoading && typeof c.value === "number" ? "…" : c.value}</div>
                    </a>
                ))}
            </div>
        </section>
    );
}
