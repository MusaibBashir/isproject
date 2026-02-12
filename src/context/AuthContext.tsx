import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase, isSupabaseAvailable } from "../lib/supabaseClient";

export interface UserProfile {
    id: string;
    role: "admin" | "franchise";
    full_name: string;
    created_at: string;
}

export interface Franchise {
    id: string;
    name: string;
    region: string;
    state: string;
    owner_id: string;
    created_by: string;
    is_active: boolean;
    created_at: string;
}

interface AuthContextType {
    user: any | null;
    profile: UserProfile | null;
    franchise: Franchise | null;
    isLoading: boolean;
    isAdmin: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    createFranchiseUser: (
        email: string,
        password: string,
        fullName: string,
        franchiseName: string,
        region: string,
        state: string
    ) => Promise<{ error: string | null; franchise?: Franchise }>;
    getAllFranchises: () => Promise<Franchise[]>;
    updateFranchise: (id: string, updates: Partial<Franchise>) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [franchise, setFranchise] = useState<Franchise | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const fetchProfile = useCallback(async (userId: string) => {
        if (!supabase) return null;
        try {
            console.log("[Auth] Fetching profile for:", userId);

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                console.error("Profile fetch error detected:", error.message, "Code:", error.code);
                return null;
            }
            console.log("[Auth] Profile found:", data?.role);
            return data as UserProfile;
        } catch (err: any) {
            console.error("Error fetching profile:", err?.message || err);
            return null;
        }
    }, []);

    const fetchFranchise = useCallback(async (ownerId: string) => {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from("franchises")
                .select("*")
                .eq("owner_id", ownerId)
                .eq("is_active", true)
                .single();
            if (error) return null;
            return data as Franchise;
        } catch (err) {
            return null;
        }
    }, []);

    // Initialize auth state — use onAuthStateChange as single source of truth
    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        let isLoadingUserData = false;

        // Helper to load profile + franchise (with concurrency guard and retry)
        const loadUserData = async (authUser: any) => {
            if (isLoadingUserData) return; // prevent concurrent loads
            isLoadingUserData = true;
            try {
                setUser(authUser);
                let prof = await fetchProfile(authUser.id);
                if (!isMounted) return;

                // Retry once if profile fetch failed (transient RLS / timing issue)
                if (!prof) {
                    console.warn("[Auth] Profile fetch returned null, retrying in 500ms...");
                    await new Promise(r => setTimeout(r, 500));
                    if (!isMounted) return;
                    prof = await fetchProfile(authUser.id);
                    if (!isMounted) return;
                }

                if (!prof) {
                    console.error("[Auth] Profile fetch failed after retry.");
                    setAuthError("Failed to load user profile. If you just signed up, please wait or contact admin.");
                    // We do NOT set profile to null here if we want to distinguish "loading" from "missing"
                    // But currently profile is null.
                } else {
                    setAuthError(null);
                    setProfile(prof);
                    if (prof.role === "franchise") {
                        const fran = await fetchFranchise(authUser.id);
                        if (!isMounted) return;
                        setFranchise(fran);
                    }
                }
            } finally {
                isLoadingUserData = false;
            }
        };

        // Single listener handles ALL auth events including initial session restoration
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log("[Auth] onAuthStateChange event:", event);
                if (!isMounted) return;

                if (session?.user) {
                    // Only load data if we typically shouldn't have it yet or if forced
                    await loadUserData(session.user);
                } else {
                    setUser(null);
                    setProfile(null);
                    setFranchise(null);
                    setAuthError(null);
                }

                // After handling the initial session (or lack thereof), stop loading
                if (event === 'INITIAL_SESSION') {
                    console.log("[Auth] Initial session processed, setting isLoading = false");
                    setIsLoading(false);
                }
            }
        );

        // Hard safety timeout — ALWAYS resolves loading after 8 seconds
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.warn("[Auth] Safety timeout triggered — forcing isLoading = false");
                setIsLoading(false);
            }
        }, 8000);

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, [fetchProfile, fetchFranchise]);

    const signIn = async (email: string, password: string) => {
        if (!supabase) return { error: "Supabase not available" };
        try {
            setAuthError(null); // Clear previous errors on new attempt
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { error: error.message };
            return { error: null };
        } catch (err: any) {
            return { error: err.message || "Sign in failed" };
        }
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setFranchise(null);
        setAuthError(null);
    };

    const createFranchiseUser = async (
        email: string,
        password: string,
        fullName: string,
        franchiseName: string,
        region: string,
        state: string
    ) => {
        if (!supabase) return { error: "Supabase not available" };

        try {
            // 1. Create auth user with metadata (uses signUp with anon key)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { role: "franchise", full_name: fullName },
                },
            });

            if (authError) return { error: authError.message };
            if (!authData.user) return { error: "Failed to create user" };

            const newUserId = authData.user.id;

            // 2. Create franchise record
            const { data: franchiseData, error: franchiseError } = await supabase
                .from("franchises")
                .insert({
                    name: franchiseName,
                    region,
                    state,
                    owner_id: newUserId,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (franchiseError) return { error: franchiseError.message };

            return { error: null, franchise: franchiseData as Franchise };
        } catch (err: any) {
            return { error: err.message || "Failed to create franchise" };
        }
    };

    const getAllFranchises = async (): Promise<Franchise[]> => {
        if (!supabase) return [];
        try {
            const { data, error } = await supabase
                .from("franchises")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []) as Franchise[];
        } catch (err) {
            console.error("Error fetching franchises:", err);
            return [];
        }
    };

    const updateFranchise = async (id: string, updates: Partial<Franchise>): Promise<boolean> => {
        if (!supabase) return false;
        try {
            const { error } = await supabase
                .from("franchises")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error updating franchise:", err);
            return false;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                franchise,
                isLoading,
                isAdmin: profile?.role === "admin",
                error: authError,
                signIn,
                signOut,
                createFranchiseUser,
                getAllFranchises,
                updateFranchise,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
