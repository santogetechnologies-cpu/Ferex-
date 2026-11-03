import { provisionAccount } from '../lib/api/provisionAccount';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isSuperAdmin } from '../lib/roleRouter';
import { saveCustomStaffMember, ROLE_DISPLAY_NAMES, getDivisionFromRole } from '../lib/api/staff';

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
  permissions?: any[];
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
  /** Provision a new Division Admin or Staff User with email, password, role and metadata */
  provisionDivisionAdmin: (
    email: string,
    password: string,
    fullName: string,
    role: string,
    extra?: { department?: string; phone?: string; permissions?: any[] }
  ) => Promise<{ error?: string; user?: any }>;
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

import { getAdminSupabaseClient } from '../lib/adminAuthClient';

async function fetchProfile(userId: string, _email?: string | null): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}
async function ensureProfile(user: User): Promise<UserProfile> {
  const profile = await fetchProfile(user.id);
  if (!profile) throw new Error('Your account profile could not be loaded. Contact your administrator.');
  return profile;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const authGeneration = useRef(0);
  const loadUserData = useCallback(async (currentSession: Session | null) => {
    const generation = ++authGeneration.current;
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setProfile(null);
    setLoading(true);
    try {
      if (currentSession?.user) {
        const authoritativeProfile = await ensureProfile(currentSession.user);
        if (generation === authGeneration.current) setProfile(authoritativeProfile);
      }
    } catch {
      // A profile lookup failure never grants a role from metadata or local storage.
      if (generation === authGeneration.current) setProfile(null);
    } finally {
      if (generation === authGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    for (const key of Object.keys(localStorage)) { if (key.startsWith('ferex_admin_cred_')) localStorage.removeItem(key); }
    // 1. Initial Session Load
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        // If refresh token failed with 400 or invalid grant, clean up stale token
        supabase.auth.signOut().catch(() => {});
        loadUserData(null);
        return;
      }
      loadUserData(data.session);
    }).catch(() => {
      loadUserData(null);
    });

    // 2. Realtime Auth State Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event: any, newSession) => {
      if ((event as any) === 'TOKEN_REFRESH_FAILED') {
        supabase.auth.signOut().catch(() => {});
        loadUserData(null);
        return;
      }
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
      
      if (error) return { error: error.message };

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
            role: 'student',
          },
        },
      });

      if (error) return { error: error.message };

      if (data.session) await loadUserData(data.session);
      return { user: data.user, session: data.session };
    } catch (err: any) {
      return { error: err?.message || 'Sign up error' };
    }
  }, [loadUserData]);

  const provisionDivisionAdmin = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: string,
    extra?: { department?: string; phone?: string; permissions?: any[] }
  ) => {
    try {
      const created = await provisionAccount({ email: email.trim(), password, full_name: fullName, role, ...extra });
      return { user: created };
    } catch (error) { return { error: (error as Error).message }; }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('ferex_session_') || ['ferex_user', 'ferex_student_target_country', 'ferex_student_selected_uni', 'ferex_selected_course'].includes(k));
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
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
