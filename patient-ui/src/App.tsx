// src/App.tsx
import "./App.css";
import { NavLink, Route, Routes } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import Patients from "./components/Patients"; // NEW in your nav
import Admissions from "./components/Admissions";
import Vitals from "./components/Vitals";
import Billing from "./components/Billing";
import Discharge from "./components/Discharge";
import AiSummary from "./components/AiSummary"; // “AI Ask / Generic”
import AiTreatmentSuggest from "./components/AiTreatmentSuggest"; // NEW
import Chat from "./components/Chat";
import Login from "./components/Login";

export default function App() {
    const links: Array<[string, string]> = [
        ["Dashboard", "/"],
        ["Patients", "/patients"],
        ["Admissions", "/admissions"],
        ["Vitals", "/vitals"],
        ["Billing", "/billing"],
        ["Discharge", "/discharge"],
        ["AI Summary", "/ai"], // generic ask
        ["AI Treatment", "/ai/treatment-suggest"], // NEW route
        ["Chat", "/chat"],
        ["Login", "/login"],
    ];

    return (
        <>
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
                }}
            >
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
            </nav>

            <div style={{ padding: 16 }}>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/admissions" element={<Admissions />} />
                    <Route path="/vitals" element={<Vitals />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/discharge" element={<Discharge />} />
                    <Route path="/ai" element={<AiSummary />} />
                    <Route path="/ai/treatment-suggest" element={<AiTreatmentSuggest />} /> {/* NEW */}
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/login" element={<Login />} />
                </Routes>
            </div>
        </>
    );
}
