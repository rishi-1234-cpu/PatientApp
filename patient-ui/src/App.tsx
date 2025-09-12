import "./App.css";
import { NavLink, Route, Routes, Navigate, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useMemo } from "react";

import Dashboard from "./components/Dashboard";
import Patients from "./components/Patients";
import Admissions from "./components/Admissions";
import Vitals from "./components/Vitals";
import Billing from "./components/Billing";
import Discharge from "./components/Discharge";
import AiSummary from "./components/AiSummary";
import AiTreatmentSuggest from "./components/AiTreatmentSuggest";
import Chat from "./components/Chat";
import Login from "./components/Login";

/** Storage key for JWT (keeps working locally & on Render) */
const JWT_KEY = (import.meta as any)?.env?.VITE_JWT_STORAGE_KEY || "jwt";

/** Require login for protected routes (React Router v6) */
function RequireAuth() {
    const token = typeof window !== "undefined" ? localStorage.getItem(JWT_KEY) : null;
    const location = useLocation();
    if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
    return <Outlet />;
}

export default function App() {
    const navigate = useNavigate();

    const links: Array<[string, string]> = useMemo(
        () => [
            ["Dashboard", "/dashboard"],
            ["Patients", "/patients"],
            ["Admissions", "/admissions"],
            ["Vitals", "/vitals"],
            ["Billing", "/billing"],
            ["Discharge", "/discharge"],
            ["AI Summary", "/ai"],
            ["AI Treatment", "/ai/treatment-suggest"],
            ["Chat", "/chat"],
        ],
        []
    );

    const onLogout = () => {
        try {
            localStorage.removeItem(JWT_KEY);
            localStorage.removeItem("auth_user");
        } catch { }
        navigate("/login", { replace: true });
    };

    return (
        <>
            {/* Top nav only useful when logged in */}
            <nav
                style={{
                    display: "flex",
                    gap: 12,
                    padding: 12,
                    background: "#f6f7fb",
                    borderBottom: "1px solid #e6e8ef",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {links.map(([label, href]) => (
                        <NavLink
                            key={href}
                            to={href}
                            style={({ isActive }) => ({
                                textDecoration: "none",
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? "#1f2937" : "#374151",
                            })}
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <NavLink
                        to="/login"
                        style={({ isActive }) => ({
                            textDecoration: "none",
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? "#1f2937" : "#374151",
                        })}
                    >
                        Login
                    </NavLink>
                    <button
                        onClick={onLogout}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #dbe3ee",
                            background: "#fff",
                            cursor: "pointer",
                            fontWeight: 700,
                        }}
                        title="Logout"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div style={{ padding: 16 }}>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />

                    {/* Redirect bare root to dashboard (protected) */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* Protected */}
                    <Route element={<RequireAuth />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/patients" element={<Patients />} />
                        <Route path="/admissions" element={<Admissions />} />
                        <Route path="/vitals" element={<Vitals />} />
                        <Route path="/billing" element={<Billing />} />
                        <Route path="/discharge" element={<Discharge />} />
                        <Route path="/ai" element={<AiSummary />} />
                        <Route path="/ai/treatment-suggest" element={<AiTreatmentSuggest />} />
                        <Route path="/chat" element={<Chat />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </div>
        </>
    );
}
