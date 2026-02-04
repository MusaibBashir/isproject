import { Outlet, Link, useLocation } from "react-router-dom";
import { HamburgerMenu } from "../HamburgerMenu";
import { BarChart3, Shield, Store, ArrowLeft } from "lucide-react";

interface MainLayoutProps {
    viewMode: "admin" | "franchise";
    setViewMode: (mode: "admin" | "franchise") => void;
}

export function MainLayout({ viewMode, setViewMode }: MainLayoutProps) {
    const location = useLocation();
    const isHomePage = location.pathname === "/";

    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            <div className="w-full max-w-[1400px] mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <HamburgerMenu />
                        {!isHomePage && (
                            <Link
                                to="/"
                                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                                aria-label="Back to Dashboard"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-700" />
                            </Link>
                        )}
                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                                IS Project
                            </h1>
                            <p className="text-gray-600 mt-1 text-sm">
                                Inventory & Sales Management System
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode("admin")}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${viewMode === "admin"
                                        ? "bg-gray-900 text-white shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                                Admin
                            </button>
                            <button
                                onClick={() => setViewMode("franchise")}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${viewMode === "franchise"
                                        ? "bg-gray-900 text-white shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                <Store className="w-4 h-4" />
                                Franchise
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <Outlet context={{ viewMode }} />
            </div>
        </div>
    );
}
