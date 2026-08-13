import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle, KeyRound, CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute, getPortalLabel, isValidRole } from '../lib/roleRouter';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAuth();

  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Auth statuses
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password overlay
  const [showForgotOverlay, setShowForgotOverlay] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // First Time Login Password Change Overlay
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingRole, setPendingRole] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Front-end Validation
  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Supabase sign-in submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setIsLoading(true);

    const isDefaultPassword = password === 'Student123' || password === 'student123';
    let { error } = await signIn(email.trim(), password);

    // If initial sign in fails with default password, check if student exists and auto-provision
    if (error && isDefaultPassword) {
      const { data: dbProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      if (dbProfile && dbProfile.must_change_password !== false) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: dbProfile.full_name || 'Student',
              role: dbProfile.role || 'student',
              must_change_password: true
            }
          }
        });

        if (signUpErr) {
          error = signUpErr.message;
        } else if (signUpData.user) {
          const authId = signUpData.user.id;
          const oldId = dbProfile.id;

          if (authId !== oldId) {
            try {
              // Delete skeleton row inserted by trigger for authId to prevent primary key conflicts
              await supabase.from('users').delete().eq('id', authId);
              
              // Migrate referencing rows to the new auth user ID
              await Promise.all([
                supabase.from('applications').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('journey_stages').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('student_documents').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('student_documents').update({ reviewer_id: authId }).eq('reviewer_id', oldId),
                supabase.from('offer_letters').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('payments').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('invoices').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('receipts').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('meetings').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('meetings').update({ advisor_id: authId }).eq('advisor_id', oldId),
                supabase.from('support_tickets').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('support_tickets').update({ assigned_to: authId }).eq('assigned_to', oldId),
                supabase.from('ticket_replies').update({ sender_id: authId }).eq('sender_id', oldId),
                supabase.from('notifications').update({ user_id: authId }).eq('user_id', oldId),
                supabase.from('tasks').update({ student_id: authId }).eq('student_id', oldId),
                supabase.from('tasks').update({ created_by: authId }).eq('created_by', oldId),
                supabase.from('tasks').update({ assigned_to: authId }).eq('assigned_to', oldId),
              ]);

              // Update the original user record to use authId
              await supabase.from('users').update({
                id: authId,
                must_change_password: true
              }).eq('id', oldId);
            } catch (mergeErr) {
              console.warn('[Profile merge warning]:', mergeErr);
            }
          }

          if (!signUpData.session) {
            error = 'A verification email has been sent. Please confirm your email or ask your administrator to disable "Confirm Email" in Supabase Auth settings to log in immediately.';
          } else {
            error = undefined;
          }
        }
      }
    }

    if (error) {
      setIsLoading(false);
      setErrorMsg(error);
      return;
    }

    // Fetch user profile from public.users to get their role & change_password status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      setErrorMsg('Failed to retrieve user session. Please try again.');
      return;
    }

    const { data: profileRow } = await supabase
      .from('users')
      .select('role, must_change_password')
      .eq('id', user.id)
      .maybeSingle();

    const role: string = profileRow?.role || user.user_metadata?.role || 'student';

    if (!isValidRole(role)) {
      setIsLoading(false);
      setErrorMsg(
        'Your account does not have an assigned portal role. Please contact your administrator.'
      );
      return;
    }

    const mustChange = user.user_metadata?.must_change_password || profileRow?.must_change_password || isDefaultPassword;

    if (mustChange) {
      setIsLoading(false);
      setPendingRole(role);
      setShowFirstTimeModal(true);
      return;
    }

    const portalLabel = getPortalLabel(role);
    setSuccessMsg(`Authorization successful. Loading ${portalLabel}...`);
    setIsLoading(false);

    setTimeout(() => {
      navigate(getDashboardRoute(role));
    }, 800);
  };

  const handleFirstTimePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');

    if (!newPassword || newPassword.length < 6) {
      setChangePassError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError('Passwords do not match.');
      return;
    }

    setIsChangingPass(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          password: newPassword,
          data: { must_change_password: false }
        });
        await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);
      }

      setIsChangingPass(false);
      setShowFirstTimeModal(false);
      setSuccessMsg(`Password set successfully! Loading ${getPortalLabel(pendingRole || 'student')}...`);

      setTimeout(() => {
        navigate(getDashboardRoute(pendingRole || 'student'));
      }, 800);
    } catch (err: any) {
      setIsChangingPass(false);
      setChangePassError(err.message || 'Failed to update password');
    }
  };

  // Supabase forgot password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    } else if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    await resetPassword(forgotEmail.trim());
    setIsLoading(false);
    setForgotSent(true);
  };

  return (
    <div className="relative overflow-hidden w-full text-left">
      <AnimatePresence mode="wait">
        {showFirstTimeModal ? (
          /* FIRST TIME LOGIN PASSWORD CHANGE MODAL */
          <motion.div
            key="first-time-pass"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">First-Time Password Setup</h3>
                <p className="text-xs font-semibold text-slate-400">
                  Default password (<code className="text-[#6A1B2E] font-bold">Student123</code>) detected. Set a new permanent password to continue.
                </p>
              </div>
            </div>

            {changePassError && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {changePassError}
              </div>
            )}

            <form onSubmit={handleFirstTimePassSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  New Permanent Password
                </label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full h-10 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#4A101E] transition-colors shadow-sm disabled:opacity-50 mt-2"
              >
                {isChangingPass ? 'Updating Password...' : 'Save New Password & Log In'}
              </button>
            </form>
          </motion.div>
        ) : !showForgotOverlay ? (
          /* LOGIN INTERFACE */
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Header */}
            <div className="text-center sm:text-left mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                Sign in to your account
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Welcome back! Please enter your credentials to access your dashboard.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-50/90 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-3 shadow-xs"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-700 text-xs font-medium flex items-center gap-3 shadow-xs"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                disabled={isLoading}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="current-password"
                disabled={isLoading}
              />

              {/* Options Row */}
              <div className="flex items-center justify-between pt-1">
                <Checkbox
                  label="Remember me for 30 days"
                  checked={rememberMe}
                  onChange={(checked) => setRememberMe(typeof checked === 'boolean' ? checked : (checked as any).target?.checked ?? false)}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotOverlay(true);
                    setErrorMsg('');
                  }}
                  className="text-xs font-bold text-[#6A1B2E] hover:text-[#4A101E] transition-colors focus:outline-none focus:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button type="submit" isLoading={isLoading} className="w-full h-11">
                  Sign in
                </Button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* FORGOT PASSWORD OVERLAY */
          <motion.div
            key="forgot-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="text-center sm:text-left mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                Reset your password
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {forgotSent ? (
              <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-center space-y-4">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-extrabold">Check your email</h3>
                <p className="text-xs font-semibold text-emerald-700">
                  We have sent password reset instructions to <strong className="underline">{forgotEmail}</strong>.
                </p>
                <button
                  onClick={() => {
                    setShowForgotOverlay(false);
                    setForgotSent(false);
                  }}
                  className="mt-2 text-xs font-bold text-[#6A1B2E] hover:underline block mx-auto"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    {forgotError}
                  </div>
                )}

                <Input
                  label="Email address"
                  type="email"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotOverlay(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    ← Back to Sign In
                  </button>

                  <Button type="submit" isLoading={isLoading}>
                    Send Reset Link
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
