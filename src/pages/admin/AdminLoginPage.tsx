import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardRoute, getPortalLabel } from '../../lib/roleRouter';
import { supabase } from '../../lib/supabase';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }

    setIsLoading(true);
    const cleanEmail = email.trim();

    // 1. Try real Supabase auth
    try {
      const { error: authErr } = await signIn(cleanEmail, password);
      if (!authErr) {
        const { data: { user } } = await supabase.auth.getUser();
        let role = user?.user_metadata?.role || 'superadmin';
        if (user?.id) {
          const { data: dbProfile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
          if (dbProfile?.role) role = dbProfile.role;
        }
        setSuccess(`Access granted. Loading ${getPortalLabel(role)}...`);
        setTimeout(() => navigate(getDashboardRoute(role)), 600);
        return;
      }
    } catch (e) {}

    // 2. Fallback Demo Credential Handlers
    setTimeout(() => {
      setIsLoading(false);
      if (cleanEmail === 'admin@gmail.com' && password === 'admin123') {
        localStorage.setItem('ferex_user', JSON.stringify({ id: 'admin-1', email: cleanEmail, role: 'superadmin' }));
        setSuccess('Access granted. Loading Education Admin Panel...');
        setTimeout(() => navigate('/admin/dashboard'), 600);
      } else if (cleanEmail === 'superadmin@gmail.com' && password === 'super123') {
        localStorage.setItem('ferex_user', JSON.stringify({ id: 'super-1', email: cleanEmail, role: 'superadmin' }));
        setSuccess('Access granted. Loading Central Console...');
        setTimeout(() => navigate('/central/dashboard'), 600);
      } else {
        setError('Invalid email or password. Try one of the quick demo accounts below.');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#6A1B2E]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#6A1B2E]/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative"
      >
        {/* Back Link */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-slate-500 hover:text-[#6A1B2E] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go to Student Portal
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden text-left">
          {/* Header banner */}
          <div className="bg-gradient-to-br from-[#6A1B2E] via-[#521221] to-[#3a0a14] px-8 py-7 text-center relative overflow-hidden text-white">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative z-10 flex flex-col items-center">
              <Logo variant="full" color="white" size="md" subtitle="ADMIN CONSOLE" align="center" />
              <p className="text-[11px] font-semibold text-rose-200/90 mt-2">
                FEREX Education • Management & Admissions
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="px-7 py-6">
            <h2 className="text-base font-extrabold text-slate-900 mb-1">Administrative Sign In</h2>
            <p className="text-xs font-semibold text-slate-400 mb-4">Enter staff or administrator credentials</p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/50 focus:ring-2 focus:ring-[#6A1B2E]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/50 focus:ring-2 focus:ring-[#6A1B2E]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-[#6A1B2E]/20 mt-4 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating...
                  </>
                ) : 'Sign In to Admin Panel'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[10px] font-semibold text-slate-400 mt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Authorized Academic & Operations Staff Only
        </p>
      </motion.div>
    </div>
  );
};
