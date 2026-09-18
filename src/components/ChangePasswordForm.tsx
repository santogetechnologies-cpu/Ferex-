import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAdminSupabaseClient } from '../lib/adminAuthClient';

interface ChangePasswordFormProps {
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  className?: string;
  variant?: 'card' | 'plain';
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  title = 'Change Account Password',
  subtitle = 'Update your secure credentials across all FEREX systems',
  onSuccess,
  className = '',
  variant = 'card',
}) => {
  const { user, profile, updatePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password strength calculation
  const getStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = getStrength(newPassword);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500', 'bg-emerald-600'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try Supabase Auth client update
      let authSuccess = false;
      const res = await updatePassword(newPassword);
      if (!res.error) {
        authSuccess = true;
      } else {
        // Direct Supabase updateUser fallback
        const { error: directErr } = await supabase.auth.updateUser({ password: newPassword });
        if (!directErr) {
          authSuccess = true;
        } else {
          // 2. Admin API fallback if available
          const admin = await getAdminSupabaseClient();
          const targetId = user?.id || profile?.id;
          if (admin && targetId) {
            const { error: adminErr } = await admin.auth.admin.updateUserById(targetId, { password: newPassword });
            if (!adminErr) {
              authSuccess = true;
            } else {
              throw new Error(adminErr.message || directErr.message || res.error);
            }
          } else {
            throw new Error(directErr.message || res.error);
          }
        }
      }

      // 3. Update local credential cache if user was provisioned via staff registry
      const userEmail = profile?.email || user?.email;
      if (userEmail) {
        const localKey = `ferex_admin_cred_${userEmail.toLowerCase()}`;
        const localCred = localStorage.getItem(localKey);
        if (localCred) {
          try {
            const parsed = JSON.parse(localCred);
            parsed.password = newPassword;
            parsed.require_password_reset = false;
            parsed.updated_at = new Date().toISOString();
            localStorage.setItem(localKey, JSON.stringify(parsed));
          } catch {}
        }
      }

      // 4. Update public.users record timestamp if logged in
      if (user?.id) {
        await supabase
          .from('users')
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          .catch(() => {});
      }

      setSuccess('Password changed successfully! Your new password is now active.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            {subtitle && <p className="text-[11px] font-semibold text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> 256-Bit SSL
        </span>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-bold"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* New Password */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 chars)"
              required
              className="w-full h-10 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength Indicator */}
          {newPassword && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-400">Password Strength:</span>
                <span className={strength >= 4 ? 'text-emerald-600' : strength >= 2 ? 'text-amber-600' : 'text-red-500'}>
                  {strengthLabels[strength]}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-full flex-1 transition-all rounded-full ${
                      level <= strength ? strengthColors[strength] : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full h-10 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <Button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-5 h-10 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {loading ? 'Updating Credentials...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );

  if (variant === 'plain') {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={`p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-left ${className}`}>
      {content}
    </div>
  );
};
