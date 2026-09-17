import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft, Shield, UserPlus, LogIn, Lock } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardRoute, getPortalLabel, isSuperAdmin } from '../../lib/roleRouter';
import { supabase } from '../../lib/supabase';
import { getAdminSupabaseClient } from '../../lib/adminAuthClient';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Handle Super Admin Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }

    setIsLoading(true);
    const cleanEmail = email.trim();

    try {
      const { error: authErr } = await signIn(cleanEmail, password);
      if (!authErr) {
        const { data: { user } } = await supabase.auth.getUser();
        const admin = await getAdminSupabaseClient();
        const client = admin || supabase;

        // Ensure user is given superadmin privileges when logging in via Super Admin portal
        if (user?.id) {
          try {
            await client.from('users').upsert({
              id: user.id,
              email: cleanEmail,
              full_name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
              role: 'superadmin',
              updated_at: new Date().toISOString()
            });
          } catch {}
        }

        try {
          localStorage.setItem('ferex_user', JSON.stringify({
            id: user?.id || 'super-user',
            email: cleanEmail,
            role: 'superadmin',
            full_name: user?.user_metadata?.full_name || 'Central Super Admin'
          }));
        } catch {}

        setSuccess('Super Admin authorization verified. Opening Central Command Center...');
        setTimeout(() => navigate('/central/dashboard', { replace: true }), 500);
        return;
      }
    } catch (e) {}

    // Fallback Demo Credential Handlers
    setTimeout(() => {
      setIsLoading(false);
      if (
        (cleanEmail === 'superadmin@gmail.com' && password === 'super123') ||
        (cleanEmail === 'admin@gmail.com' && password === 'admin123') ||
        (cleanEmail === 'admin@ferex.com' && password === 'admin123')
      ) {
        localStorage.setItem('ferex_user', JSON.stringify({ id: 'super-1', email: cleanEmail, role: 'superadmin', full_name: 'Central Super Admin' }));
        setSuccess('Access granted. Loading Central Command Center...');
        setTimeout(() => navigate('/central/dashboard', { replace: true }), 500);
      } else {
        setError('Invalid credentials. Please check your email/password or create a new Super Admin account below.');
      }
    }, 500);
  };

  // 2. Handle Create Super Admin Credentials (Sign Up)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!signUpName.trim()) { setError('Full name is required.'); return; }
    if (!signUpEmail.trim()) { setError('Super Admin Email is required.'); return; }
    if (!signUpPassword || signUpPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (signUpPassword !== signUpConfirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    const cleanEmail = signUpEmail.trim();
    const cleanName = signUpName.trim();

    try {
      // 1. Supabase Auth Sign Up with role = 'superadmin'
      const { error: regErr } = await signUp(cleanEmail, signUpPassword, cleanName, 'superadmin');
      
      if (regErr && !regErr.includes('already registered')) {
        setIsLoading(false);
        setError(regErr);
        return;
      }

      // 2. Set authoritative superadmin in DB
      const { data: { user } } = await supabase.auth.getUser();
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;

      if (user?.id) {
        try {
          await client.from('users').upsert({
            id: user.id,
            email: cleanEmail,
            full_name: cleanName,
            role: 'superadmin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } catch {}
      }

      // 3. Save local authoritative session
      try {
        localStorage.setItem('ferex_user', JSON.stringify({
          id: user?.id || `super-${Date.now()}`,
          email: cleanEmail,
          role: 'superadmin',
          full_name: cleanName
        }));
      } catch {}

      setSuccess('Super Admin account created successfully! Launching Central Console...');
      setIsLoading(false);
      setTimeout(() => navigate('/central/dashboard', { replace: true }), 600);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to create Super Admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#570229]/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#8C1D4F]/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Navigation links */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Portal
          </button>
          <span className="text-[11px] font-bold text-rose-400/90 flex items-center gap-1">
            <Shield className="w-3 h-3 text-rose-400" /> Super Admin Authority
          </span>
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-700/70 overflow-hidden text-left text-white">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-[#570229] via-[#40021E] to-[#250111] px-8 py-7 text-center relative overflow-hidden text-white border-b border-rose-900/40">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative z-10 flex flex-col items-center">
              <Logo variant="full" color="white" size="md" subtitle="CENTRAL COMMAND CONSOLE" align="center" />
              <p className="text-[11px] font-semibold text-rose-200/90 mt-2">
                FEREX Multi-Enterprise Super Administration Portal
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-700/60 bg-slate-900/40 p-1.5 m-4 rounded-2xl">
            <button
              type="button"
              onClick={() => { setTab('signin'); setError(''); setSuccess(''); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#570229] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#570229] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Create Super Admin
            </button>
          </div>

          {/* Form Container */}
          <div className="px-7 pb-7">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-white">
                {tab === 'signin' ? 'Super Admin Authentication' : 'Provision Super Admin Account'}
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                {tab === 'signin'
                  ? 'Sign in to access global governance, financials, and division portals'
                  : 'Create master administrator credentials with full system authority'}
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-2 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs font-bold text-red-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── SIGN IN FORM ── */}
            {tab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Super Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@ferexventures.com"
                    className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3.5 pr-10 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#570229] hover:bg-[#6F0335] text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#570229]/40 mt-4 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Authenticating Super Admin...
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Sign In as Super Admin
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ── CREATE SUPER ADMIN FORM ── */
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Super Admin Full Name
                  </label>
                  <input
                    type="text"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="Chief Operations Officer"
                    className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Super Admin Email
                  </label>
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="executive@ferexventures.com"
                    className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Master Password
                  </label>
                  <input
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full h-10 px-3.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-rose-900/30 text-[11px] text-rose-200/80 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Creating credentials via this portal provisions root-level <strong>Super Admin</strong> access across all enterprise divisions (Education, Trade, FMCG, Digital Agency).
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#570229] hover:bg-[#6F0335] text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#570229]/40 mt-3 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating Super Admin Credentials...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Create Super Admin Account
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] font-medium text-slate-400 mt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> Santoge Technologies • Global Executive Governance
        </p>
      </motion.div>
    </div>
  );
};

