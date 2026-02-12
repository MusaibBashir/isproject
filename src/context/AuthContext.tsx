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

    const fetchProfile = useCallback(async (userId: string) => {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();
            if (error) {
                console.error("Profile fetch error:", error.message, "Code:", error.code, "Details:", error.details);
                throw error;
            }
            console.log("Profile loaded:", data);
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

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            try {
                if (session?.user) {
                    setUser(session.user);
                    const prof = await fetchProfile(session.user.id);
                    setProfile(prof);
                    if (prof?.role === "franchise") {
                        const fran = await fetchFranchise(session.user.id);
                        setFranchise(fran);
                    }
                }
            } catch (err) {
                console.error("Error initializing auth:", err);
            } finally {
                setIsLoading(false);
            }
        }).catch((err) => {
            console.error("Error getting session:", err);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    const prof = await fetchProfile(session.user.id);
                    setProfile(prof);
                    if (prof?.role === "franchise") {
                        const fran = await fetchFranchise(session.user.id);
                        setFranchise(fran);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                    setFranchise(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile, fetchFranchise]);

    const signIn = async (email: string, password: string) => {
        if (!supabase) return { error: "Supabase not available" };
        try {
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
            // 1. Create auth user with metadata
            const { data: authData, error: authError } = await supabase.auth.admin
                ? await (supabase as any).auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { role: "franchise", full_name: fullName },
                })
                : await supabase.auth.signUp({
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
