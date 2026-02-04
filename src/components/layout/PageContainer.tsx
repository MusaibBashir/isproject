import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface PageContainerProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    iconBgColor?: string;
}

export function PageContainer({
    children,
    title,
    subtitle,
    icon,
    iconBgColor = "bg-gray-100",
}: PageContainerProps) {
    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            <div className="w-full max-w-[1400px] mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/"
                            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                            aria-label="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </Link>
                        {icon && (
                            <div
                                className={`w-10 h-10 ${iconBgColor} rounded-lg flex items-center justify-center`}
                            >
                                {icon}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                            {subtitle && (
                                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">{children}</div>
            </div>
        </div>
    );
}
