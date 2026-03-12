import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import { BarChart3, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { LiquidGradient } from "../components/LiquidGradient";

export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/dashboard";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email and password");
            return;
        }

        setIsSigningIn(true);
        try {
            if (!supabase) {
                toast.error("Database connection not configured. Please contact the administrator.");
                setIsSigningIn(false);
                return;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    toast.error("Invalid email or password");
                } else {
                    toast.error(error.message);
                }
                return;
            }

            toast.success("Successfully signed in");
            setTimeout(() => {
                navigate(from, { replace: true });
            }, 100);
        } catch (error) {
            console.error('Sign in error:', error);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setIsSigningIn(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full relative overflow-hidden bg-[#0a0e27] items-center justify-center p-4">
            {/* Background: Full-screen Liquid Gradient */}
            <div className="absolute inset-0 z-0 opacity-80">
                <LiquidGradient />
                <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30 bg-black" />
            </div>

            {/* Foreground: Centered Glassmorphism Login Card */}
            <div className="w-full max-w-[420px] z-10 flex flex-col justify-center relative">
                <Card 
                    className="w-full relative overflow-hidden text-white border border-white/10 rounded-[2rem] shadow-2xl"
                    style={{
                        backgroundColor: "rgba(10, 10, 12, 0.4)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)"
                    }}
                >
                    {/* Top glass reflection light */}
                    <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />

                    <CardHeader className="pt-10 pb-6 text-center relative z-10">
                        <div className="w-16 h-16 bg-white/5 rounded-[1.2rem] flex items-center justify-center mx-auto mb-5 shadow-2xl relative border border-white/20 backdrop-blur-md">
                            <BarChart3 className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                        <h1 className="text-3xl font-serif italic text-white tracking-widest font-bold mb-1 drop-shadow-sm">Mercanta</h1>
                        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mt-2 text-white/60">
                            Secure Access
                        </p>
                    </CardHeader>

                    <CardContent className="px-8 pb-10 z-10 relative">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[11px] font-semibold text-white/70 uppercase tracking-widest ml-1">
                                    Email Address
                                </Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 transition-colors group-focus-within:text-white" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e: any) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        className="pl-11 h-12 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all rounded-xl outline-none"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[11px] font-semibold text-white/70 uppercase tracking-widest ml-1">
                                    Password
                                </Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 transition-colors group-focus-within:text-white" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e: any) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="pl-11 pr-11 h-12 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all rounded-xl outline-none"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
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
                                className="w-full h-12 mt-6 bg-white hover:bg-gray-200 text-black font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
                            >
                                {isSigningIn ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Authenticating...
                                    </div>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="w-full text-center mt-8 z-10">
                    <p className="text-[10px] tracking-widest uppercase font-medium text-white/50 drop-shadow-sm">
                        Contact your admin for account credentials
                    </p>
                </div>
            </div>
        </div>
    );
}
