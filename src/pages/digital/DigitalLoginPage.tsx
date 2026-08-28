import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../../components/Logo';

export const DigitalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('digital@ferex.com');
  const [password, setPassword] = useState('digital123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (email.trim().toLowerCase() === 'digital@ferex.com' && password === 'digital123') {
        navigate('/digital/dashboard');
      } else {
        setErrorMsg('Invalid credentials. Use email: digital@ferex.com & password: digital123');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-left relative overflow-hidden antialiased">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6A1B2E]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#6A1B2E]/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 z-10 relative">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo variant="full" color="maroon" size="md" subtitle="DIGITAL" align="center" />
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />{errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Agency Account Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="digital@ferex.com" className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E] focus:ring-4 focus:ring-[#6A1B2E]/10 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Security Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E] focus:ring-4 focus:ring-[#6A1B2E]/10 transition-all" />
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

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10.5px] font-semibold text-slate-500 space-y-0.5">
            <span className="font-extrabold text-slate-700 block">Demo Credentials:</span>
            <div className="flex justify-between font-mono text-[10px]"><span>digital@ferex.com</span><span>digital123</span></div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full h-11 bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-black tracking-wide rounded-xl shadow-md shadow-[#6A1B2E]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70">
            {isLoading ? 'Authenticating...' : <>Access Ferex Digital <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400">
          <button onClick={() => navigate('/')} className="hover:text-[#6A1B2E] transition-colors">← Main Portal Selection</button>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Agency Grade Security</span>
        </div>
      </motion.div>
    </div>
  );
};
