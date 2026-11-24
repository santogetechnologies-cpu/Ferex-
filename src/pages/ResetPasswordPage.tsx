import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { completePasswordReset, passwordProblem } from '../lib/api/password';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { CapLoader } from '../components/CapLoader';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  // The page only works from the link in the reset email. Opening it any other way (or an expired link) shows a clear message.
  const [linkState, setLinkState] = useState<'checking' | 'valid' | 'invalid'>('checking');
  React.useEffect(() => {
    const fromEmail = /type=recovery|access_token|[?&]code=/.test(window.location.hash + window.location.search);
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setLinkState('valid'); });
    const t = setTimeout(() => setLinkState(cur => cur === 'checking' ? (fromEmail ? 'valid' : 'invalid') : cur), 1800);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    const problem = passwordProblem(newPassword);
    if (problem) { setErrorMsg(problem); return; }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordReset(newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden w-full text-left">
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5A0122] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {/* Header */}
        <div className="text-center sm:text-left mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#5A0122]/10 text-[#5A0122] flex items-center justify-center font-bold mb-4 sm:mx-0 mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
            Set New Password
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Use at least 8 characters with upper-case, lower-case and a number.
          </p>
        </div>

        {linkState === 'checking' && !isSuccess ? (
          <p className="text-sm font-semibold text-slate-500 py-6">Checking your reset link…</p>
        ) : linkState === 'invalid' && !isSuccess ? (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-3" role="alert">
            <h3 className="text-base font-black text-slate-900">This reset link is not valid</h3>
            <p className="text-xs font-semibold text-amber-800">Open the link from the password reset email you received. Links expire after a short time and work once. You can ask for a new one from the sign-in page.</p>
            <button onClick={() => navigate('/login', { replace: true })} className="w-full h-11 bg-[#5A0122] text-white rounded-xl text-xs font-black hover:bg-[#68092A] transition-colors">Back to sign in</button>
          </div>
        ) : isSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900">Password Updated Successfully!</h3>
            <p className="text-xs font-semibold text-emerald-700">
              Your password has been changed and a confirmation email is on its way. All devices were signed out, so sign in again with the new password.
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-4 w-full h-11 bg-[#5A0122] text-white rounded-xl text-xs font-black hover:bg-[#68092A] transition-colors shadow-md flex items-center justify-center gap-2"
            >
              Sign In with New Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="p-4 rounded-xl bg-red-50/90 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-3 shadow-xs"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label="New Password"
              type="password"
              showPasswordToggle={true}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />

            <Input
              label="Confirm New Password"
              type="password"
              showPasswordToggle={true}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#5A0122] hover:bg-[#68092A] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#5A0122]/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <CapLoader size="xs" tone="light" />
                  Updating Password...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Save New Password
                </span>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
