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

// pages (siblings in this folder)
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

// auth helpers (one level up)
import { initAuthFromStorage, isLoggedIn, logout } from "../Services/auth";
import { useEffect } from "react";

export default function App() {
    const location = useLocation();
    const navigate = useNavigate();

    // Ensure axios Authorization header is aligned with localStorage
    useEffect(() => {
        initAuthFromStorage();
    }, []);

    // If user hits a private URL without a token (e.g., via address bar),
    // bounce straight to /login. (ProtectedRoute also enforces this.)
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
                {/* App shell (nav + outlet) is INSIDE the guard,
so it never shows while logged out. */}
                <Route
                    element={
                        <>
                            <nav
                                style={{
                                    display: "flex",
                                    gap: 18,
                                    padding: 14,
                                    borderBottom: "1px solid #eee",
                                }}
                            >
                                <NavLink to="/dashboard">Dashboard</NavLink>
                                <NavLink to="/patients">Patients</NavLink>
                                <NavLink to="/admissions">Admissions</NavLink>
                                <NavLink to="/vitals">Vitals</NavLink>
                                <NavLink to="/billing">Billing</NavLink>
                                <NavLink to="/discharge">Discharge</NavLink>
                                <NavLink to="/ai-summary">AI Summary</NavLink>
                                <NavLink to="/ai-treatment">AI Treatment</NavLink>
                                <NavLink to="/chat">Chat</NavLink>

                                <a
                                    href="#logout"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        logout();
                                        navigate("/login", { replace: true });
                                    }}
                                    style={{ marginLeft: "auto" }}
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
