import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
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
  /** Sign in with email + password. Returns an error message string on failure. */
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Send a password reset email */
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('[AuthContext] Could not fetch user profile:', error.message);
    return null;
  }
  return data as UserProfile;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      let currentUser: User | null = data.session?.user ?? null;
      let currentProfile: UserProfile | null = null;

      if (currentUser) {
        currentProfile = await fetchProfile(currentUser.id);
      } else {
        try {
          const rawLocalUser = localStorage.getItem('ferex_user');
          if (rawLocalUser) {
            const parsed = JSON.parse(rawLocalUser);
            if (parsed && parsed.id) {
              currentUser = {
                id: parsed.id,
                email: parsed.email || '',
                user_metadata: { role: parsed.role || 'student' },
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
              } as any;
              currentProfile = await fetchProfile(parsed.id);
              if (!currentProfile) {
                currentProfile = {
                  id: parsed.id,
                  email: parsed.email || '',
                  full_name: parsed.email?.split('@')[0] || 'Student',
                  role: parsed.role || 'student',
                  avatar_url: '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
              }
            }
          }
        } catch (e) {}
      }

      setUser(currentUser);
      setProfile(currentProfile);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        const prof = await fetchProfile(newSession.user.id);
        setProfile(prof);
      } else {
        // Fall back to ferex_user if active
        try {
          const rawLocalUser = localStorage.getItem('ferex_user');
          if (rawLocalUser) {
            const parsed = JSON.parse(rawLocalUser);
            if (parsed && parsed.id) {
              const u = {
                id: parsed.id,
                email: parsed.email || '',
                user_metadata: { role: parsed.role || 'student' },
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
              } as any;
              setUser(u);
              const prof = await fetchProfile(parsed.id);
              setProfile(prof);
              return;
            }
          }
        } catch (e) {}
        setUser(null);
        setProfile(null);
      }
    });

    // Listen for custom ferex_auth_change events (e.g. login without Supabase Auth session)
    const syncLocalAuth = async () => {
      try {
        const rawLocalUser = localStorage.getItem('ferex_user');
        if (rawLocalUser) {
          const parsed = JSON.parse(rawLocalUser);
          if (parsed && parsed.id) {
            const u = {
              id: parsed.id,
              email: parsed.email || '',
              user_metadata: { role: parsed.role || 'student' },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as any;
            setUser(u);
            const prof = await fetchProfile(parsed.id);
            if (prof) {
              setProfile(prof);
            } else {
              setProfile({
                id: parsed.id,
                email: parsed.email || '',
                full_name: parsed.full_name || parsed.name || parsed.email?.split('@')[0] || 'Student',
                role: parsed.role || 'student',
                avatar_url: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        }
      } catch (e) {}
    };

    window.addEventListener('ferex_auth_change', syncLocalAuth);
    window.addEventListener('storage', syncLocalAuth);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener('ferex_auth_change', syncLocalAuth);
      window.removeEventListener('storage', syncLocalAuth);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return {};
  }, []);

  const clearFerexCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    clearFerexCache();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) {
      return { error: error.message };
    }
    return {};
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, resetPassword }}>
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
