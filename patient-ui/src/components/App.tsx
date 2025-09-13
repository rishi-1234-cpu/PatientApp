// src/components/App.tsx
import "../App.css";
import {
    NavLink,
    Route,
    Routes,
    Navigate,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

// pages
import Dashboard from "./Dashboard";
import Patients from "./Patients";
import Admissions from "./Admissions";
import Vitals from "./Vitals";
import Billing from "./Billing";
import Discharge from "./Discharge";
import AiSummary from "./AiSummary";
import AiTreatmentSuggest from "./AiTreatmentSuggest";
import Chat from "./Chat";
import Login from "./Login";

// auth helpers
import { initAuthFromStorage, isLoggedIn, logout } from "../Services/auth";

// ✅ wake the API (helps Render cold starts: login & SignalR)
import { warmApi } from "../Services/chat";

import { useEffect } from "react";

export default function App() {
    const location = useLocation();
    const navigate = useNavigate();

    // Ensure axios Authorization header is aligned with localStorage
    useEffect(() => {
        initAuthFromStorage();
        // Warm the backend (cheap GET) so first navigation & SignalR connect smoothly
        warmApi();
    }, []);

    // If user hits a private URL without a token (via address bar),
    // bounce to /login. (ProtectedRoute also enforces this.)
    useEffect(() => {
        if (!isLoggedIn() && location.pathname !== "/login") {
            navigate("/login", { replace: true });
        }
    }, [location.pathname, navigate]);

    return (
        <Routes>
            {/* --------- PUBLIC --------- */}
            <Route path="/login" element={<Login />} />

            {/* --------- PRIVATE AREA (Guard + App Layout) --------- */}
            <Route element={<ProtectedRoute />}>
                {/* App shell (nav + outlet) is INSIDE the guard */}
                <Route
                    element={
                        <>
                            <nav
                                style={{
                                    display: "flex",
                                    gap: 18,
                                    padding: 14,
                                    borderBottom: "1px solid #eee",
                                    background: "#f8fafc",
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 10,
                                }}
                            >
                                {[
                                    ["Dashboard", "/dashboard"],
                                    ["Patients", "/patients"],
                                    ["Admissions", "/admissions"],
                                    ["Vitals", "/vitals"],
                                    ["Billing", "/billing"],
                                    ["Discharge", "/discharge"],
                                    ["AI Summary", "/ai-summary"],
                                    ["AI Treatment", "/ai-treatment"],
                                    ["Chat", "/chat"],
                                ].map(([label, href]) => (
                                    <NavLink
                                        key={href}
                                        to={href}
                                        style={({ isActive }) => ({
                                            textDecoration: "none",
                                            fontWeight: isActive ? 800 : 600,
                                            color: isActive ? "#0f172a" : "#334155",
                                        })}
                                    >
                                        {label}
                                    </NavLink>
                                ))}

                                <a
                                    href="#logout"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        logout();
                                        navigate("/login", { replace: true });
                                    }}
                                    style={{ marginLeft: "auto", color: "#ef4444", fontWeight: 700 }}
                                >
                                    Logout
                                </a>
                            </nav>

                            <main style={{ padding: 16 }}>
                                <Outlet />
                            </main>
                        </>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/admissions" element={<Admissions />} />
                    <Route path="/vitals" element={<Vitals />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/discharge" element={<Discharge />} />
                    <Route path="/ai-summary" element={<AiSummary />} />
                    <Route path="/ai-treatment" element={<AiTreatmentSuggest />} />
                    <Route path="/chat" element={<Chat />} />
                </Route>

                {/* default inside the guard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
