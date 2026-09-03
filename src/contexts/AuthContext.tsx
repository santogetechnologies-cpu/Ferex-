import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  passport_no?: string;
  city?: string;
  country?: string;
  department?: string;
  assigned_counselor?: string;
  emergency_contact?: Record<string, any>;
  must_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextValue {
  /** The current Supabase auth user, or null if not signed in */
  user: User | null;
  /** The current Supabase session, or null if not signed in */
  session: Session | null;
  /** The user's profile row from public.users (includes role) */
  profile: UserProfile | null;
  /** True while the initial session or profile is being loaded */
  loading: boolean;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /** Sign up new user with email + password + metadata */
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error?: string; user?: User | null }>;
  /** Provision a new Division Admin or User with email and password */
  provisionDivisionAdmin: (email: string, password: string, fullName: string, role: string) => Promise<{ error?: string; user?: any }>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Send a password reset email */
  resetPassword: (email: string) => Promise<{ error?: string }>;
  /** Update user password */
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  /** Refresh user profile from database */
  refreshProfile: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchProfile(userId: string, email?: string | null): Promise<UserProfile | null> {
  try {
    // 1. Check by Auth User ID in public.users
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        role: data.role || 'superadmin',
      } as UserProfile;
    }

    // 2. Fallback: Check by email in public.users to link existing profile
    if (email) {
      const { data: emailUser, error: emailErr } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email.trim())
        .maybeSingle();

      if (!emailErr && emailUser) {
        // Link ID if mismatched
        if (emailUser.id !== userId) {
          try {
            await supabase.from('users').update({ id: userId }).eq('id', emailUser.id);
          } catch {}
        }
        return {
          ...emailUser,
          id: userId,
          role: emailUser.role || 'superadmin',
        } as UserProfile;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function ensureProfile(user: User): Promise<UserProfile> {
  const existing = await fetchProfile(user.id, user.email);
  if (existing) return existing;

  // Direct Supabase auth defaults to superadmin unless explicitly created as student or division role
  const role = user.user_metadata?.role || 'superadmin';
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Administrator';

  const newProfile: UserProfile = {
    id: user.id,
    email: user.email || '',
    full_name: fullName,
    role: role,
    avatar_url: user.user_metadata?.avatar_url || '',
    phone: user.user_metadata?.phone || '',
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('users').upsert(newProfile).select().maybeSingle();
    if (!error && data) return data as UserProfile;
  } catch {}

  return newProfile;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);
    const currentUser = currentSession?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const prof = await ensureProfile(currentUser);
      setProfile(prof);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // 1. Initial Session Load
    supabase.auth.getSession().then(({ data }) => {
      loadUserData(data.session);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Realtime Auth State Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      loadUserData(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      
      if (error) {
        // Check if user was provisioned locally or in custom registry
        const localRegistryKey = `ferex_admin_cred_${cleanEmail.toLowerCase()}`;
        const localCred = localStorage.getItem(localRegistryKey);
        if (localCred) {
          try {
            const parsed = JSON.parse(localCred);
            if (parsed.password === password) {
              // Try signing up this provisioned user directly to seed Supabase auth
              const su = await supabase.auth.signUp({
                email: cleanEmail,
                password: password,
                options: {
                  data: {
                    full_name: parsed.fullName || cleanEmail.split('@')[0],
                    role: parsed.role || 'admin',
                  }
                }
              });
              if (!su.error && su.data.session) {
                await loadUserData(su.data.session);
                return {};
              }
            }
          } catch {}
        }
        return { error: error.message };
      }

      if (data.session) {
        await loadUserData(data.session);
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Authentication error' };
    }
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: string = 'student') => {
    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) return { error: error.message };

      if (data.user) {
        await ensureProfile(data.user);
        if (data.session) {
          await loadUserData(data.session);
        }
      }
      return { user: data.user, session: data.session };
    } catch (err: any) {
      return { error: err?.message || 'Sign up error' };
    }
  }, [loadUserData]);

  const provisionDivisionAdmin = useCallback(async (email: string, password: string, fullName: string, role: string) => {
    try {
      const cleanEmail = email.trim();
      // Store in local persisted registry so credentials work immediately
      const credRecord = {
        email: cleanEmail,
        password: password,
        fullName: fullName,
        role: role,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(`ferex_admin_cred_${cleanEmail.toLowerCase()}`, JSON.stringify(credRecord));

      // Attempt to register in Supabase
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            }
          }
        });
      } catch {}

      // Upsert into public.users table
      try {
        await supabase.from('users').upsert({
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: cleanEmail,
          full_name: fullName,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });
      } catch {}

      // Trigger custom event so admin lists refresh
      window.dispatchEvent(new CustomEvent('ferex_admin_created', { detail: credRecord }));

      return { user: credRecord };
    } catch (err: any) {
      return { error: err?.message || 'Failed to provision division admin' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('ferex_session_'));
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const prof = await fetchProfile(user.id, user.email);
      if (prof) setProfile(prof);
    }
  }, [user?.id, user?.email]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      provisionDivisionAdmin,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
