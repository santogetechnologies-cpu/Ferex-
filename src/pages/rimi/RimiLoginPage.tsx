import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff, CheckCircle2, Snowflake, Store } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const RimiLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('rimi@ferex.com');
  const [password, setPassword] = useState('rimi123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Attempt real Supabase authentication
      const { error } = await signIn(cleanEmail, password);
      
      if (!error) {
        setSuccessMsg('Authorization successful. Redirecting...');
        setTimeout(() => {
          if (cleanEmail.includes('customer') || cleanEmail.includes('distributor') || cleanEmail.includes('retail')) {
            navigate('/rimi/customer-portal', { replace: true });
          } else {
            navigate('/rimi/dashboard', { replace: true });
          }
        }, 300);
        return;
      }

      // 2. Demo credentials fallback: Rimi Cold Chain Admin
      if (cleanEmail === 'rimi@ferex.com' && password === 'rimi123') {
        localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
          email: cleanEmail,
          role: 'rimi_admin',
          full_name: 'Rimi Cold Chain Manager'
        }));

        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            role: 'rimi_admin',
            full_name: 'Rimi Cold Chain Manager',
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        } catch {}

        setSuccessMsg('Authenticated as Rimi Cold Chain Admin. Loading Console...');
        setTimeout(() => {
          navigate('/rimi/dashboard', { replace: true });
        }, 300);
        return;
      }

      // 3. Demo credentials fallback: Rimi Customer / Distributor
      if ((cleanEmail === 'customer@rimi.com' || cleanEmail === 'distributor@ferex.com' || cleanEmail.includes('customer') || cleanEmail.includes('distributor')) && (password === 'rimi123' || password === 'ferex123')) {
        localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
          email: cleanEmail,
          role: 'rimi_client',
          full_name: 'HyperCity Retail Procurement Lead'
        }));

        try {
          await supabase.from('users').upsert({
            email: cleanEmail,
            role: 'rimi_client',
            full_name: 'HyperCity Retail Procurement Lead',
            department: 'Rimi:HyperCity Retail Hub',
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        } catch {}

        setSuccessMsg('Authenticated as Rimi Wholesale Customer. Loading Customer Portal...');
        setTimeout(() => {
          navigate('/rimi/customer-portal', { replace: true });
        }, 300);
        return;
      }

      setErrorMsg(error || 'Invalid credentials. Please verify your email and password.');
    } catch {
      if (cleanEmail === 'rimi@ferex.com' && password === 'rimi123') {
        navigate('/rimi/dashboard', { replace: true });
        return;
      }
      if (cleanEmail.includes('customer') || cleanEmail.includes('distributor')) {
        navigate('/rimi/customer-portal', { replace: true });
        return;
      }
      setErrorMsg('An error occurred during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (type: 'admin' | 'customer') => {
    if (type === 'admin') {
      setEmail('rimi@ferex.com');
      setPassword('rimi123');
    } else {
      setEmail('customer@rimi.com');
      setPassword('rimi123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-left relative overflow-hidden antialiased">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6A1B2E]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#6A1B2E]/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 z-10 relative"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo variant="full" color="maroon" size="md" subtitle="RIMI FROZEN" align="center" />
          <p className="text-xs font-semibold text-slate-500 mt-2">
            Cold Chain Distribution & Reefer Logistics Console
          </p>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
              email === 'rimi@ferex.com'
                ? 'bg-[#6A1B2E]/10 border-[#6A1B2E] text-[#6A1B2E] shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Snowflake className="w-4 h-4 text-[#6A1B2E]" />
            <span className="text-[11px] font-black">❄️ Rimi Admin</span>
            <span className="text-[9px] text-slate-400 font-normal">rimi@ferex.com</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('customer')}
            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
              email === 'customer@rimi.com'
                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-[11px] font-black">🏪 Customer Portal</span>
            <span className="text-[9px] text-slate-400 font-normal">customer@rimi.com</span>
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              {errorMsg}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              FMCG Account Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rimi@ferex.com"
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E] focus:ring-4 focus:ring-[#6A1B2E]/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Security Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E] focus:ring-4 focus:ring-[#6A1B2E]/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full h-11 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-black tracking-wide shadow-md shadow-[#6A1B2E]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {email.includes('customer') || email.includes('distributor') ? 'Access Customer Portal' : 'Access Rimi Console'} <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400">
          <button onClick={() => navigate('/')} className="hover:text-[#6A1B2E] transition-colors cursor-pointer">
            ← Main Portal Selection
          </button>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Cold Chain Telemetry
          </span>
        </div>
      </motion.div>
    </div>
  );
};
