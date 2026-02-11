import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: "admin" | "franchise";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, profile, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && profile?.role !== requiredRole) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = profile?.role === "admin" ? "/admin" : "/dashboard";
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
}
