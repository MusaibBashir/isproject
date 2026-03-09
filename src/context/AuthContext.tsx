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

    // Initialize auth state
    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        let isFetching = false;

        const loadProfileData = async (userId: string) => {
            if (isFetching || !isMounted || !supabase) return;
            isFetching = true;
            try {
                // Fetch profile
                const { data: prof, error: profErr } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", userId)
                    .maybeSingle();

                if (!isMounted) return;

                if (profErr || !prof) {
                    console.error("[Auth] Profile fetch failed:", profErr);
                    setAuthError("Failed to load user profile. If you just signed up, please wait or contact admin.");
                    setProfile(null);
                    setFranchise(null);
                } else {
                    setAuthError(null);
                    setProfile(prof as UserProfile);

                    // Fetch franchise if role requires it
                    if (prof.role === "franchise") {
                        const { data: fran, error: franErr } = await supabase
                            .from("franchises")
                            .select("*")
                            .eq("owner_id", userId)
                            .eq("is_active", true)
                            .maybeSingle();
                        if (isMounted && !franErr) {
                            setFranchise(fran as Franchise);
                        }
                    }
                }
            } catch (err) {
                console.error("[Auth] Unexpected error fetching data:", err);
            } finally {
                isFetching = false;
                if (isMounted) setIsLoading(false);
            }
        };

        const handleAuthSession = (session: any) => {
            if (session?.user) {
                setUser(session.user);
                loadProfileData(session.user.id);
            } else {
                setUser(null);
                setProfile(null);
                setFranchise(null);
                setIsLoading(false);
            }
        };

        // 1. Initial State Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) {
                handleAuthSession(session);
            }
        });

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("[Auth] onAuthStateChange event:", event);
            if (!isMounted) return;

            // We handle the initial state manually above
            if (event === 'INITIAL_SESSION') return;

            if (event === 'SIGNED_IN') {
                setIsLoading(true);
                handleAuthSession(session);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setFranchise(null);
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

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
        try {
            console.log("[Auth] Signing out...");
            if (supabase) {
                await supabase.auth.signOut();
            }
        } catch (err) {
            console.error("[Auth] signOut error (non-fatal):", err);
        }
        // Always clear local state regardless of Supabase response
        setUser(null);
        setProfile(null);
        setFranchise(null);
        setAuthError(null);
        console.log("[Auth] Local state cleared, redirecting to /login");
        // Force hard navigation to guarantee we reach login page
        window.location.href = "/login";
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
