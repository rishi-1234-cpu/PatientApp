// src/components/Login.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser } from "../Services/auth";

export default function Login() {
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const navigate = useNavigate();
    const loc = useLocation() as any;
    const next = loc.state?.from?.pathname || "/dashboard";

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!userName.trim() || !password) return;
        setErr(null);
        setBusy(true);
        try {
            await loginUser(userName.trim(), password);
            navigate(next, { replace: true });
        } catch (ex: any) {
            const msg =
                ex?.response?.data?.title ||
                ex?.response?.data ||
                ex?.message ||
                "Sign-in failed. Please check your credentials.";
            setErr(typeof msg === "string" ? msg : "Sign-in failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={styles.page}>
            {/* Brand header */}
            <div style={styles.brandRow} aria-hidden>
                <div style={styles.logo}>🏥</div>
                <div>
                    <div style={styles.brandTitle}>IPD Portal</div>
                    <div style={styles.brandSub}>Secure staff sign-in</div>
                </div>
            </div>

            {/* Card */}
            <form onSubmit={onSubmit} style={styles.card} aria-label="IPD login form">
                <div style={styles.header}>
                    <h1 style={styles.h1}>Login</h1>
                    <p style={styles.muted}>Enter your username and password to continue.</p>
                </div>

                <label style={styles.field}>
                    <span style={styles.label}>Username or Email</span>
                    <input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. alice.smith"
                        autoComplete="username"
                        style={styles.input}
                    />
                </label>

                <label style={styles.field}>
                    <span style={styles.label}>Password</span>
                    <div className="pwWrap" style={{ position: "relative" }}>
                        <input
                            type={showPwd ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            // IMPORTANT: more right padding so text doesn't go under the button
                            style={{ ...styles.input, paddingRight: 56 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd((s) => !s)}
                            aria-label={showPwd ? "Hide password" : "Show password"}
                            className="pwToggle"
                            style={styles.eyeBtn}
                        >
                            <span aria-hidden="true" style={{ fontSize: 16 }}>
                                {showPwd ? "🙈" : "👁️"}
                            </span>
                        </button>
                    </div>
                </label>

                {err && (
                    <div role="alert" style={styles.error}>
                        {String(err)}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={busy || !userName.trim() || !password}
                    style={{
                        ...styles.primaryBtn,
                        opacity: busy || !userName.trim() || !password ? 0.7 : 1,
                    }}
                >
                    {busy ? (
                        <span style={styles.spinnerRow}>
                            <span style={styles.spinner} /> Signing in…
                        </span>
                    ) : (
                        "Sign in"
                    )}
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

/* ---------- Styles ---------- */
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
    brandRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        userSelect: "none",
    },
    logo: {
        width: 44,
        height: 44,
        display: "grid",
        placeItems: "center",
        fontSize: 28,
        borderRadius: 12,
        background: "#fff",
        border: "1px solid #e6eef8",
        boxShadow: "0 8px 22px rgba(12, 53, 92, .10)",
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
        boxShadow: "0 18px 50px rgba(12, 53, 92, .12)",
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
    },

    // ★ Bigger, tappable eye button with light border/background
    eyeBtn: {
        position: "absolute",
        right: 8,
        top: "50%",
        transform: "translateY(-50%)",
        height: 40,
        minWidth: 40,
        padding: 0,
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#fff",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 2px rgba(0,0,0,.06)",
        touchAction: "manipulation",
    },

    error: {
        marginTop: 4,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(220, 38, 38, .08)",
        border: "1px solid rgba(220, 38, 38, .25)",
        color: "#b91c1c",
        fontSize: 13,
    },

    primaryBtn: {
        marginTop: 4,
        padding: "12px 14px",
        borderRadius: 10,
        border: 0,
        background:
            "linear-gradient(135deg, rgba(25,118,210,1), rgba(33,150,243,1))",
        color: "#fff",
        fontWeight: 800,
        cursor: "pointer",
    },

    footerNote: { textAlign: "center", marginTop: 4 },

    spinnerRow: { display: "inline-flex", alignItems: "center", gap: 8 },
    spinner: {
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,.6)",
        borderTopColor: "transparent",
        animation: "spin .8s linear infinite",
    },
};

/* Inject tiny CSS for spinner + mobile padding bump */
const styleElId = "__ipd_login_extras";
if (!document.getElementById(styleElId)) {
    const el = document.createElement("style");
    el.id = styleElId;
    el.textContent = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@media (max-width: 480px) {
.pwWrap input { padding-right: 62px !important; } /* extra room under eye button on phones */
}
`;
    document.head.appendChild(el);
}
