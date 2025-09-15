// src/components/Login.tsx
import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../Services/auth";

export default function Login() {
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const pwdRef = useRef<HTMLInputElement | null>(null);
    const nav = useNavigate();
    const loc = useLocation() as any;
    const next = loc.state?.from?.pathname || "/dashboard";

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!userName.trim() || !password) return;
        setErr(null);
        setBusy(true);
        try {
            await loginUser(userName.trim(), password);
            nav(next, { replace: true });
        } catch (ex: any) {
            const msg =
                ex?.response?.data?.title ||
                ex?.response?.data ||
                ex?.message ||
                "Login failed. Please try again.";
            setErr(typeof msg === "string" ? msg : "Login failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={styles.page}>
            {/* Brand */}
            <div style={styles.brandRow} aria-hidden>
                <div style={styles.logo}>🏥</div>
                <div>
                    <div style={styles.brandTitle}>IPD Portal</div>
                    <div style={styles.brandSub}>Secure staff sign-in</div>
                </div>
            </div>

            {/* Card */}
            <form onSubmit={onSubmit} style={styles.card} autoComplete="on">
                <div style={styles.header}>
                    <h1 style={styles.h1}>Login</h1>
                    <p style={styles.muted}>Enter your username and password to continue.</p>
                </div>

                {/* Username */}
                <label style={styles.field}>
                    <span style={styles.label}>Username or Email</span>
                    <input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onInput={(e) => setUserName((e.target as HTMLInputElement).value)} // mobile autofill
                        placeholder="e.g. admin@patient.com"
                        autoComplete="username"
                        inputMode="email"
                        style={styles.input}
                    />
                </label>

                {/* Password (mobile-robust eye) */}
                <label style={styles.field}>
                    <span style={styles.label}>Password</span>

                    <div style={{ position: "relative" }}>
                        <input
                            ref={pwdRef}
                            type={showPwd ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onInput={(e) => setPassword((e.target as HTMLInputElement).value)} // mobile autofill
                            autoComplete="current-password"
                            inputMode="text"
                            style={{ ...styles.input, paddingRight: 56 }} // space for eye
                        />

                        <button
                            type="button"
                            aria-label={showPwd ? "Hide password" : "Show password"}
                            onPointerDown={(e) => {
                                // pointer works for touch+mouse; preventDefault keeps focus/cursor in the input
                                e.preventDefault();
                                setShowPwd((s) => !s);
                            }}
                            style={styles.eyeBtn}
                        >
                            <span aria-hidden="true" style={{ fontSize: 16 }}>
                                {showPwd ? "🙈" : "👁️"}
                            </span>
                        </button>
                    </div>
                </label>

                {/* Error */}
                {err && (
                    <div role="alert" style={styles.error}>
                        {String(err)}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={busy || !userName.trim() || !password}
                    style={{
                        ...styles.primaryBtn,
                        opacity: busy || !userName.trim() || !password ? 0.6 : 1,
                    }}
                >
                    {busy ? "Signing in…" : "Sign In"}
                </button>

                <div style={styles.footerNote}>
                    <small style={styles.muted}>
                        Forgot your password? Contact your IPD administrator.
                    </small>
                </div>
            </form>
        </div>
    );
}

/* ---------- Inline styles (works everywhere) ---------- */
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        gap: 18,
        padding: 24,
        background:
            "linear-gradient(135deg, rgba(25,118,210,.12), rgba(76,175,80,.10))",
    },
    brandRow: { display: "flex", alignItems: "center", gap: 12, userSelect: "none" },
    logo: {
        width: 44, height: 44, display: "grid", placeItems: "center",
        fontSize: 28, borderRadius: 12, background: "#fff",
        border: "1px solid #e6eef8", boxShadow: "0 8px 22px rgba(12,53,92,.10)",
    },
    brandTitle: { fontSize: 22, fontWeight: 800 },
    brandSub: { color: "#60707f", marginTop: 2, fontSize: 13 },

    card: {
        width: "min(92vw, 480px)",
        display: "grid",
        gap: 12,
        background: "#fff",
        borderRadius: 14,
        padding: 22,
        border: "1px solid #e6eef8",
        boxShadow: "0 18px 50px rgba(12,53,92,.12)",
    },
    header: { marginBottom: 4 },
    h1: { margin: 0, fontSize: 24 },
    muted: { color: "#6b7785" },

    field: { display: "grid", gap: 6, marginTop: 6 },
    label: { fontSize: 13, fontWeight: 600, color: "#394856" },
    input: {
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #dfe7ef",
        outline: "none",
        background: "#fcfdff",
        width: "100%",
    },

    eyeBtn: {
        position: "absolute",
        right: 6,
        top: "50%",
        transform: "translateY(-50%)",
        width: 44,
        height: 44,
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#fff",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,.06)",
        zIndex: 2,
        touchAction: "manipulation",
    },

    error: {
        marginTop: 4,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(220,38,38,.08)",
        border: "1px solid rgba(220,38,38,.25)",
        color: "#b91c1c",
        fontSize: 13,
    },
    primaryBtn: {
        marginTop: 4,
        padding: "12px 14px",
        borderRadius: 10,
        border: 0,
        background: "linear-gradient(135deg,#1976d2,#2196f3)",
        color: "#fff",
        fontWeight: 800,
        cursor: "pointer",
    },
    footerNote: { textAlign: "center", marginTop: 4 },
};