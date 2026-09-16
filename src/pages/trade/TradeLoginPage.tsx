import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff, Ship, Globe, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradeLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // First time password modal state
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [pendingUserObj, setPendingUserObj] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const em = email.trim().toLowerCase();
    const pass = password;

    if (!em || !pass) {
      setErrorMsg('Please enter both trade account email and password.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Check local provisioned credentials
      const localCredKey = `ferex_admin_cred_${em}`;
      const localCredRaw = localStorage.getItem(localCredKey);
      let localCred: any = null;
      if (localCredRaw) {
        try {
          localCred = JSON.parse(localCredRaw);
        } catch {}
      }

      // 1b. Also check ferex_trade_clients_v2
      if (!localCred) {
        try {
          const clientsRaw = localStorage.getItem('ferex_trade_clients_v2');
          if (clientsRaw) {
            const parsedClients = JSON.parse(clientsRaw);
            const foundClient = parsedClients.find((c: any) => c.email?.toLowerCase() === em);
            if (foundClient) {
              localCred = {
                id: foundClient.id,
                email: foundClient.email,
                password: foundClient.temp_password,
                fullName: foundClient.contact_person,
                company_name: foundClient.company_name,
                role: 'trade_client',
              };
            }
          }
        } catch {}
      }

      // Check if it's a demo account or provisioned account
      const isDemoAdmin = (em === 'trade@ferex.com' || em === 'ferexglobal@gmail.com') && pass === 'trade123';
      const isDemoClient = (em === 'client@trade.com') && pass === 'trade123';

      if (localCred && localCred.password === pass) {
        const userObj = {
          id: localCred.id || localCred.partner_id || `trade-user-${em.replace(/[^a-z0-9]/g, '')}`,
          email: em,
          full_name: localCred.fullName || localCred.full_name || 'Trade Representative',
          company_name: localCred.company_name || 'Global Trade Partner',
          role: localCred.role || 'trade_client',
        };

        if (localCred.require_password_reset) {
          setPendingUserObj(userObj);
          setIsLoading(false);
          setShowFirstTimeModal(true);
          return;
        }

        localStorage.setItem('ferex_user', JSON.stringify(userObj));
        try {
          await supabase.from('users').upsert({
            email: em,
            full_name: userObj.full_name,
            role: userObj.role,
            department: `Trade:${userObj.company_name}`,
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        } catch {}

        setIsLoading(false);
        setSuccessMsg(`Welcome, ${userObj.full_name}. Entering partner portal...`);
        setTimeout(() => {
          navigate(userObj.role === 'trade_admin' ? '/trade/dashboard' : '/trade/client-portal', { replace: true });
        }, 500);
        return;
      }

      if (isDemoClient) {
        const userObj = {
          id: 'trade-demo-client',
          email: em,
          full_name: 'Maritime Client Representative',
          company_name: 'Global Trade Partner Corp',
          role: 'trade_client'
        };
        localStorage.setItem('ferex_user', JSON.stringify(userObj));
        setIsLoading(false);
        navigate('/trade/client-portal', { replace: true });
        return;
      }

      if (isDemoAdmin) {
        const userObj = {
          id: 'trade-demo-admin',
          email: em,
          full_name: 'FEREX Global Trade Director',
          company_name: 'Ferex Global Trade Corp',
          role: 'trade_admin'
        };
        localStorage.setItem('ferex_user', JSON.stringify(userObj));
        setIsLoading(false);
        navigate('/trade/dashboard', { replace: true });
        return;
      }

      // Try Supabase signIn as fallback
      const { error } = await signIn(em, pass);
      if (!error) {
        const raw = localStorage.getItem('ferex_user');
        const user = raw ? JSON.parse(raw) : null;
        setIsLoading(false);
        if (user?.role === 'trade_client') {
          navigate('/trade/client-portal', { replace: true });
        } else {
          navigate('/trade/dashboard', { replace: true });
        }
        return;
      }

      setIsLoading(false);
      setErrorMsg('Invalid login credentials. Please verify your trade email and security password.');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Authentication failed.');
    }
  };

  const handleFirstTimePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');

    if (newPassword.length < 6) {
      setChangePassError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePassError('Passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    const em = email.trim().toLowerCase();

    try {
      const localCredKey = `ferex_admin_cred_${em}`;
      const saved = localStorage.getItem(localCredKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.password = newPassword;
        parsed.require_password_reset = false;
        localStorage.setItem(localCredKey, JSON.stringify(parsed));

        if (parsed.partner_id) {
          const partnerCredKey = `ferex_trade_partner_cred_${parsed.partner_id}`;
          const partnerCred = localStorage.getItem(partnerCredKey);
          if (partnerCred) {
            const parsedPartner = JSON.parse(partnerCred);
            parsedPartner.tempPassword = newPassword;
            parsedPartner.requirePasswordReset = false;
            localStorage.setItem(partnerCredKey, JSON.stringify(parsedPartner));
          }
        }
      }

      try {
        await supabase.from('users').update({ must_change_password: false }).ilike('email', em);
      } catch {}

      if (pendingUserObj) {
        localStorage.setItem('ferex_user', JSON.stringify(pendingUserObj));
      }

      setIsChangingPass(false);
      setShowFirstTimeModal(false);
      setSuccessMsg('Password updated successfully! Redirecting to Trade Partner Portal...');

      setTimeout(() => {
        navigate(pendingUserObj?.role === 'trade_admin' ? '/trade/dashboard' : '/trade/client-portal', { replace: true });
      }, 600);
    } catch (err: any) {
      setIsChangingPass(false);
      setChangePassError(err.message || 'Failed to update password.');
    }
  };

  const handleQuickLogin = (type: 'admin' | 'client' | 'ferexglobal') => {
    setErrorMsg('');
    if (type === 'ferexglobal') {
      setEmail('ferexglobal@gmail.com');
      setPassword('trade123');
    } else if (type === 'admin') {
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
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#58051E]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#58051E]/20 rounded-full blur-3xl pointer-events-none" />

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

        {showFirstTimeModal ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">First-Time Password Setup</h3>
                <p className="text-[11px] font-semibold text-slate-500">
                  Temporary password detected. Set your permanent password to continue.
                </p>
              </div>
            </div>

            {changePassError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {changePassError}
              </div>
            )}

            <form onSubmit={handleFirstTimePassSubmit} className="space-y-3">
              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  New Permanent Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat permanent password"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
              </div>

              <Button
                type="submit"
                isLoading={isChangingPass}
                className="w-full h-11 bg-[#58051E] hover:bg-[#430316] text-xs font-black tracking-wide shadow-md shadow-[#58051E]/20 mt-2 cursor-pointer"
              >
                Save Password & Enter Portal
              </Button>
            </form>
          </motion.div>
        ) : (
          /* Main Login Form */
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
                  placeholder="e.g. vvvvvvv@gmail.com or trade@ferex.com"
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E] focus:ring-4 focus:ring-[#58051E]/10 transition-all"
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
                  className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E] focus:ring-4 focus:ring-[#58051E]/10 transition-all"
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
                      ? 'bg-[#58051E] text-white border-[#58051E] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Ship className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" /> Trade Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('client')}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                    email === 'client@trade.com'
                      ? 'bg-[#58051E] text-white border-[#58051E] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" /> Client / Buyer
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-11 bg-[#58051E] hover:bg-[#430316] text-xs font-black tracking-wide shadow-md shadow-[#58051E]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              Access Trade Console <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400">
          <button onClick={() => navigate('/')} className="hover:text-[#58051E] transition-colors cursor-pointer">
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
