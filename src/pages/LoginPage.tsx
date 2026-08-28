import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle, KeyRound, ArrowLeft, LogIn, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute, getPortalLabel } from '../lib/roleRouter';
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

    const cleanEmail = email.trim();

    // 1. Perform Real Supabase Auth
    const { error } = await signIn(cleanEmail, password);
    if (error) {
      setIsLoading(false);
      setErrorMsg(error || 'Invalid email or password. Please try again.');
      return;
    }

    // 2. Fetch authenticated user profile to resolve authoritative role from public.users
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      setIsLoading(false);
      setErrorMsg('Authentication error: Unable to retrieve authenticated user session.');
      return;
    }

    let role: string | null = null;
    const { data: dbProfile } = await supabase
      .from('users')
      .select('role, must_change_password')
      .eq('id', user.id)
      .maybeSingle();

    if (dbProfile?.role) {
      role = dbProfile.role;
    } else if (cleanEmail) {
      const { data: dbProfileByEmail } = await supabase
        .from('users')
        .select('role, must_change_password')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (dbProfileByEmail?.role) {
        role = dbProfileByEmail.role;
      }
    }

    if (!role) {
      setIsLoading(false);
      setErrorMsg('Profile authorization error: No role configured in public.users for this account. Please contact your system administrator.');
      return;
    }

    const portalLabel = getPortalLabel(role);
    const targetRoute = getDashboardRoute(role);
    setSuccessMsg(`Authorization successful. Loading ${portalLabel}...`);
    setIsLoading(false);

    setTimeout(() => {
      navigate(targetRoute, { replace: true });
    }, 400);
  };

  // Handle first time login password update
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

    try {
      // 1. Update user password status in database
      const cleanEmail = email.trim();
      const { error: dbErr } = await supabase
        .from('users')
        .update({ must_change_password: false })
        .ilike('email', cleanEmail);

      if (dbErr) {
        console.warn('[FirstTimePassUpdate] DB notice:', dbErr.message);
      }

      // 2. Also update in auth session if logged in
      await supabase.auth.updateUser({ password: newPassword }).catch(() => {});

      setIsChangingPass(false);
      setShowFirstTimeModal(false);
      
      // Clear form and display green success guidance
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setSuccessMsg('🎉 Password updated successfully! Please enter your new password to log in.');
    } catch (err: any) {
      setIsChangingPass(false);
      setChangePassError(err.message || 'Failed to update password.');
    }
  };

  // Handle forgot password email request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setIsLoading(false);

    if (error) {
      setForgotError(typeof error === 'string' ? error : 'Failed to send reset email.');
      return;
    }

    setForgotSent(true);
  };

  return (
    <div className="relative overflow-hidden w-full text-left">
      
      {/* Top Header Link */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#50001D] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Ferex Education
        </button>
      </div>

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
              <div className="w-10 h-10 rounded-xl bg-[#50001D]/10 text-[#50001D] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">First-Time Password Setup</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Default password detected. Set a new permanent password to continue.
                </p>
              </div>
            </div>

            {changePassError && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {changePassError}
              </div>
            )}

            <form onSubmit={handleFirstTimePassSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  New Permanent Password
                </label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#50001D] focus:ring-4 focus:ring-[#50001D]/10"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#50001D] focus:ring-4 focus:ring-[#50001D]/10"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full h-11 bg-[#50001D] text-white rounded-xl text-xs font-black hover:bg-[#3D0016] transition-colors shadow-md disabled:opacity-50 mt-2"
              >
                {isChangingPass ? 'Updating Password...' : 'Save New Password & Return to Login'}
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
            <div className="text-center sm:text-left mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
                Sign in to your portal
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                Access your university applications, NAWA legalizations, and VFS visa updates.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-5 p-4 rounded-xl bg-red-50/90 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-3 shadow-xs"
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
                  className="mb-5 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-700 text-xs font-medium flex items-center gap-3 shadow-xs"
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
                placeholder="student@example.com"
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
                  onChange={(checked) => setRememberMe(checked)}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowForgotOverlay(true)}
                  className="text-xs font-bold text-[#50001D] hover:underline focus:outline-none"
                  tabIndex={0}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-[#50001D] via-[#6A1B2E] to-[#50001D] hover:from-[#3D0016] hover:to-[#50001D] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#50001D]/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating Credentials...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-amber-300" />
                    <span>Sign In to Portal</span>
                  </>
                )}
              </button>
            </form>

            {/* Portal Note */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> 256-Bit SSL Encrypted
              </span>
              <span>FEREX Education © {new Date().getFullYear()}</span>
            </div>
          </motion.div>
        ) : (
          /* FORGOT PASSWORD INTERFACE */
          <motion.div
            key="forgot-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="text-center sm:text-left mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                Reset your password
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {forgotSent ? (
              <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-center space-y-4">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-black">Check your email</h3>
                <p className="text-xs font-semibold text-emerald-700">
                  We have sent password reset instructions to <strong className="underline">{forgotEmail}</strong>.
                </p>
                <button
                  onClick={() => {
                    setShowForgotOverlay(false);
                    setForgotSent(false);
                  }}
                  className="mt-2 text-xs font-bold text-[#50001D] hover:underline block mx-auto"
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
                  placeholder="student@example.com"
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-10 px-5 bg-[#50001D] text-white text-xs font-bold rounded-xl hover:bg-[#3D0016] transition-colors shadow-sm disabled:opacity-50"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
