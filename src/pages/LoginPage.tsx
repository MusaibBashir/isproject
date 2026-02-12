import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { BarChart3, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
    const { signIn, user, profile, isLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!email.trim() || !password.trim()) {
            toast.error("Please enter email and password");
            return;
        }

        setIsSigningIn(true);
        const { error } = await signIn(email, password);

        if (error) {
            toast.error(error);
            setIsSigningIn(false);
        } else {
            toast.success("Signed in successfully!");
            // Small delay to let auth state propagate
            setTimeout(() => {
                navigate("/");
                setIsSigningIn(false);
            }, 500);
        }
    };

    // If already authenticated, redirect to role-based dashboard
    if (!isLoading && user) {
        if (profile?.role === "admin") {
            return <Navigate to="/admin" replace />;
        }
        if (profile?.role === "franchise") {
            return <Navigate to="/dashboard" replace />;
        }
        // Profile exists but has unknown role, or profile missing — go to / which handles this
        return <Navigate to="/" replace />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">IS Project</h1>
                    <p className="text-gray-500 mt-2 text-sm">Inventory & Sales Management System</p>
                </div>

                <Card className="border border-gray-200 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl text-center text-gray-900">Sign In</CardTitle>
                        <p className="text-sm text-center text-gray-500">
                            Enter your credentials to continue
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e: any) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="pl-10 h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e: any) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="pl-10 pr-10 h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSigningIn}
                                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium transition-all duration-200 shadow-sm"
                            >
                                {isSigningIn ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </div>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Contact your admin for account credentials
                </p>
            </div>
        </div>
    );
}
