import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/Logo';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (email === 'admin@gmail.com' && password === 'admin123') {
        setSuccess('Access granted. Loading admin panel...');
        setTimeout(() => navigate('/admin/dashboard'), 800);
      } else if (email === 'superadmin@gmail.com' && password === 'super123') {
        setSuccess('Access granted. Loading Central Console...');
        setTimeout(() => navigate('/central/dashboard'), 800);
      } else {
        setError('Invalid email or password');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#6A1B2E]/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#6A1B2E]/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header banner */}
          <div className="bg-gradient-to-br from-[#6A1B2E] to-[#4A101E] px-8 py-8 text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative z-10 flex justify-center">
              <Logo variant="full" color="white" size="md" subtitle="ADMIN CONSOLE" align="center" />
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <h2 className="text-base font-extrabold text-slate-900 mb-1">Sign In</h2>
            <p className="text-xs font-semibold text-slate-400 mb-6">Enter your admin credentials to continue</p>

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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/50 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/50 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#6A1B2E] hover:bg-[#4A101E] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-[#6A1B2E]/20 mt-6"
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

            <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400">Demo Credentials</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">admin@gmail.com · admin123</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-semibold text-slate-400 mt-4">
          Ferex Education · Admin Access Only
        </p>
      </motion.div>
    </div>
  );
};
