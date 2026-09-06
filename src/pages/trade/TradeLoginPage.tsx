import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';

export const TradeLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('trade@ferex.com');
  const [password, setPassword] = useState('trade123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(async () => {
      setIsLoading(false);
      const em = email.trim().toLowerCase();

      if (em.includes('client') || em.includes('partner') || em.includes('buyer') || em === 'client@trade.com') {
        try {
          await supabase.from('users').upsert({
            email: em,
            full_name: 'Maritime Client Representative',
            role: 'trade_client',
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        } catch {}
        navigate('/trade/client');
      } else {
        try {
          await supabase.from('users').upsert({
            email: em,
            full_name: 'FEREX Global Trade Director',
            role: 'trade_admin',
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        } catch {}
        navigate('/trade/dashboard');
      }
    }, 600);
  };

  const handleQuickLogin = (type: 'admin' | 'client') => {
    if (type === 'admin') {
      setEmail('trade@ferex.com');
      setPassword('trade123');
    } else {
      setEmail('client@trade.com');
      setPassword('trade123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-left relative overflow-hidden antialiased">
      {/* Background Orbs */}
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
          <Logo variant="full" color="maroon" size="md" subtitle="GLOBAL TRADE" align="center" />
        </div>

        {/* Error Alert */}
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
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Trade Account Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trade@ferex.com"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              1-Click Demo Login Roles:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                  email === 'trade@ferex.com'
                    ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🚢 Trade Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('client')}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                  email === 'client@trade.com'
                    ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🌍 Client / Buyer
              </button>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full h-11 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-black tracking-wide shadow-md shadow-[#6A1B2E]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            Access Trade Console <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400">
          <button onClick={() => navigate('/')} className="hover:text-[#6A1B2E] transition-colors">
            ← Main Portal Selection
          </button>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-bit Encrypted
          </span>
        </div>
      </motion.div>
    </div>
  );
};
