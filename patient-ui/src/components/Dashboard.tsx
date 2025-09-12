// src/components/Dashboard.tsx
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom"; // ★ use client-side routing
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
        { label: "Patients", value: patients.data ?? 0, href: "/patients", color: "#4f46e5" },
        { label: "Admissions", value: admissions.data ?? 0, href: "/admissions", color: "#0ea5e9" },
        { label: "Vitals", value: vitals.data ?? 0, href: "/vitals", color: "#14b8a6" },
        { label: "Billings", value: billings.data ?? 0, href: "/billing", color: "#f97316" },
        { label: "Discharges", value: discharges.data ?? 0, href: "/discharge", color: "#ef4444" },
        { label: "Chat", value: "Open", href: "/chat", color: "#8b5cf6" },
    ];

    function refresh() { qc.invalidateQueries({ queryKey: ["count"] }); }

    // Rotating tips
    const tips = [
        "💡 Manage patient admissions with ease and accuracy",
        "💡 AI summaries help you make faster, smarter decisions",
        "💡 Streamline billing and reduce errors instantly",
        "💡 Plan better discharges with AI-powered insights",
        "💡 Real-time chat for faster collaboration",
        "💡 AI treatment suggestions tailored to patient needs",
    ];
    const [tipIdx, setTipIdx] = useState(0);
    const [fade, setFade] = useState(true);
    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setTipIdx((i) => (i + 1) % tips.length);
                setFade(true);
            }, 280);
        }, 5600);
        return () => clearInterval(interval);
    }, []);

    return (
        <section style={{ display: "grid", gap: 16 }}>
            <style>{`
:root{
--brand-grad: linear-gradient(90deg,#6366f1,#22c1c3,#0ea5e9);
}

/* HERO (title + marquee) */
.hero {
border: 1px solid #e8eef8;
background: #fff;
border-radius: 14px;
padding: 16px;
box-shadow: 0 8px 22px rgba(2,12,27,.06);
}
.brandRow{
display:flex; align-items:center; gap:12px; flex-wrap:wrap;
}
.brandIcon{ font-size: 22px; filter: drop-shadow(0 1px 0 rgba(255,255,255,.5)); }
.brandTitle{
font-weight: 900; font-size: 22px; letter-spacing:.2px; line-height:1.1;
background: var(--brand-grad); -webkit-background-clip:text; background-clip:text; color:transparent;
white-space: nowrap;
}
.brandSub{ margin-top:6px; color:#4b5563; font-size:14px; }

/* Marquee inside hero */
@keyframes marqueeSlide {
0% { transform: translateX(100%); }
100% { transform: translateX(-100%); }
}
.marqueeWrap{
margin-top:12px; width:100%; height:44px; border-radius:10px; overflow:hidden;
border:1px solid #e8eef8;
background: linear-gradient(90deg,#ff6b6b,#f7b267,#ffd166,#06d6a0,#4cc9f0,#a78bfa);
position:relative;
}
.marqueeWrap::after{
content:""; position:absolute; inset:0;
background: linear-gradient(180deg,rgba(255,255,255,.35),rgba(255,255,255,0));
pointer-events:none;
}
.marqueeInner{
position:absolute; inset:0 auto 0 0;
display:inline-flex; align-items:center; gap:28px; padding:0 16px;
white-space:nowrap;
/* SLOWER SPEED HERE (was 14s) */
animation: marqueeSlide 24s linear infinite;
}
.marqueePill{
display:inline-flex; align-items:center; gap:8px;
padding:8px 14px; border-radius:999px;
background: rgba(255,255,255,.92);
color:#0f172a; font-weight:800; font-size:16px;
line-height:1; letter-spacing:.2px;
border:1px solid rgba(15,23,42,.08);
box-shadow: 0 2px 10px rgba(0,0,0,.08);
backdrop-filter: blur(2px);
}
.marqueePill .brandWord{
background: var(--brand-grad); -webkit-background-clip:text; background-clip:text; color:transparent;
font-weight:900;
}
.brandFooter{
display:flex; flex-wrap:wrap; gap:10px; align-items:center;
margin-top:10px;
}
.creditChip{
display:inline-flex; align-items:center; gap:8px;
padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px;
background:#0ea5e9; color:#fff; box-shadow:0 2px 10px rgba(14,165,233,.25);
}
.creditChip .heart{ filter: drop-shadow(0 1px 0 rgba(255,255,255,.3)); }

@media (prefers-reduced-motion: reduce){
.marqueeInner{ animation:none; transform:translateX(0)!important; }
}

/* Welcome */
.welcome{
padding:18px; border-radius:14px;
background: linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,255,255,.7));
border:1px solid #e8eef8;
display:flex; align-items:center; justify-content:space-between; gap:14px;
box-shadow:0 6px 18px rgba(0,0,0,.06);
}

/* KPIs */
.kpiGrid{ display:grid; grid-template-columns: repeat(6,1fr); gap:12px; }
@media (max-width:1100px){ .kpiGrid{ grid-template-columns: repeat(3,1fr); } }
@media (max-width:640px){ .kpiGrid{ grid-template-columns: repeat(2,1fr); } }

.kpiCard{
text-decoration:none; color:inherit; border-radius:14px;
background:#ffffffcc; border:1px solid #e6ebf5; padding:16px; display:grid; gap:6px;
box-shadow:0 4px 14px rgba(0,0,0,.06);
transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.kpiCard:hover{ transform: translateY(-4px) scale(1.01); box-shadow:0 10px 24px rgba(0,0,0,.12); background:#fff; }
.kpiLabel{ font-size:12px; color:#748091; display:inline-flex; align-items:center; gap:8px; }
.kpiDot{ width:8px; height:8px; border-radius:50%; box-shadow:0 0 0 4px rgba(0,0,0,.02); }
.kpiValue{ font-size:28px; font-weight:800; letter-spacing:.2px; }

/* Tips */
.tipsBar{
border:1px dashed #c7d2fe; background: linear-gradient(135deg,#eef2ff,#f5f3ff);
color:#1f2937; border-radius:12px; padding:12px 14px;
display:flex; align-items:center; gap:10px; box-shadow:0 4px 12px rgba(99,102,241,.12) inset;
}
.tipText{ transition:opacity .28s ease; }
.tipText.fadeOut{ opacity:0; }

/* ---------- Mobile tweaks ---------- */
@media (max-width: 480px){
.hero{ padding: 12px; }
.brandIcon{ font-size: 20px; }
.brandTitle{ font-size: 18px; }
.brandSub{ font-size: 13px; }

.marqueeWrap{ height: 40px; }
/* EVEN SLOWER ON MOBILE (was 24s) */
.marqueeInner{ gap: 18px; padding: 0 10px; animation-duration: 28s; }
.marqueePill{ font-size: 14px; padding: 7px 12px; }

.brandFooter{ gap:8px; }
.creditChip{ font-size: 11px; padding: 5px 9px; }

.welcome{
flex-direction: column;
align-items: stretch;
gap: 10px;
}
.welcome button{
width: 100%;
}
.kpiValue{ font-size: 24px; }
}
`}</style>

            {/* HERO */}
            <div className="hero">
                <div className="brandRow">
                    <span className="brandIcon" role="img" aria-label="hospital">🏥</span>
                    <span className="brandIcon" role="img" aria-label="ai">🤖</span>
                    <h2 className="brandTitle" style={{ margin: 0 }}>CareConnect AI</h2>
                </div>
                <div className="brandSub">
                    An AI-driven hospital assistant for clear summaries, treatment support, smoother billing & smarter discharges.
                </div>

                {/* Marquee inside hero with readable pills */}
                <div className="marqueeWrap" aria-hidden="true">
                    <div className="marqueeInner">
                        <span className="marqueePill">
                            This IPD Portal is powered by <span className="brandWord">Artificial Intelligence</span> for faster, safer care
                        </span>
                        <span className="marqueePill">
                            <span className="brandWord">CareConnect AI</span> — smarter workflows with summaries, chat & treatment support
                        </span>
                        <span className="marqueePill">
                            Built with ❤️ to keep teams in sync and patients first
                        </span>
                    </div>
                </div>

                {/* Credit chip */}
                <div className="brandFooter">
                    <span className="creditChip" title="Creator credit">
                        <span className="heart">💙</span> Created by <strong style={{ marginLeft: 4 }}>Rishikesh</strong>
                    </span>
                </div>
            </div>

            {/* Welcome */}
            <div className="welcome">
                <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>👋 Welcome, {user?.userName || user?.email || "admin"}!</div>
                    {user?.roles?.length ? (
                        <div style={{ color: "#5f6b7a", marginTop: 4 }}>
                            Roles: <strong>{user.roles.join(", ")}</strong>
                        </div>
                    ) : null}
                </div>
                <button
                    onClick={refresh}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: 0,
                        background: "linear-gradient(180deg,#3b82f6,#2563eb)",
                        color: "#fff",
                        fontWeight: 700,
                        boxShadow: "0 10px 18px rgba(37,99,235,.25)",
                    }}
                >
                    Refresh
                </button>
            </div>

            {/* KPI cards — now using Link for SPA navigation */}
            <div className="kpiGrid">
                {cards.map((c) => (
                    <Link key={c.label} to={c.href} className="kpiCard">
                        <div className="kpiLabel">
                            <span className="kpiDot" style={{ background: c.color }} />
                            {c.label}
                        </div>
                        <div className="kpiValue">{anyLoading && typeof c.value === "number" ? "…" : c.value}</div>
                    </Link>
                ))}
            </div>

            {/* Tips */}
            <div className="tipsBar" role="status" aria-live="polite">
                <span style={{ fontSize: 18, lineHeight: 1 }} role="img" aria-label="ai">🤖</span>
                <span className={`tipText ${fade ? "" : "fadeOut"}`}>{tips[tipIdx]}</span>
            </div>
        </section>
    );
}
