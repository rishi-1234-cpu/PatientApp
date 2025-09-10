// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLoggedIn } from "../Services/auth";

export default function ProtectedRoute() {
    const loc = useLocation();
    if (!isLoggedIn()) {
        // bounce to login and remember where user was heading
        return <Navigate to="/login" replace state={{ from: loc }} />;
    }
    return <Outlet />;
}