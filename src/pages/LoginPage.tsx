import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle, KeyRound, ArrowLeft, LogIn, UserPlus, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute, getPortalLabel } from '../lib/roleRouter';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword } = useAuth();

  // Tab mode: 'signin' | 'signup'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Sign In Specific Fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Sign Up Specific Fields (Completely isolated and initialized empty)
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Validation errors
  const [errors, setErrors] = useState<{
    signInEmail?: string;
    signInPassword?: string;
    signUpFullName?: string;
    signUpEmail?: string;
    signUpPassword?: string;
    signUpConfirmPassword?: string;
    terms?: string;
  }>({});

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

  // Switch to sign up and reset sign up fields cleanly
  const switchToSignUp = () => {
    setAuthMode('signup');
    setSignUpFullName('');
    setSignUpEmail('');
    setSignUpPassword('');
    setSignUpConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setErrors({});
  };

  const switchToSignIn = () => {
    setAuthMode('signin');
    setErrorMsg('');
    setSuccessMsg('');
    setErrors({});
  };

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      switchToSignUp();
    } else if (mode === 'signin') {
      switchToSignIn();
    }
  }, [searchParams]);

  // Front-end Validation
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (authMode === 'signin') {
      if (!signInEmail.trim()) {
        newErrors.signInEmail = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(signInEmail)) {
        newErrors.signInEmail = 'Please enter a valid email address';
      }

      if (!signInPassword) {
        newErrors.signInPassword = 'Password is required';
      } else if (signInPassword.length < 6) {
        newErrors.signInPassword = 'Password must be at least 6 characters';
      }
    } else {
      if (!signUpFullName.trim()) {
        newErrors.signUpFullName = 'Full name is required';
      }

      if (!signUpEmail.trim()) {
        newErrors.signUpEmail = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(signUpEmail)) {
        newErrors.signUpEmail = 'Please enter a valid email address';
      }

      if (!signUpPassword) {
        newErrors.signUpPassword = 'Password is required';
      } else if (signUpPassword.length < 6) {
        newErrors.signUpPassword = 'Password must be at least 6 characters';
      }

      if (!signUpConfirmPassword) {
        newErrors.signUpConfirmPassword = 'Confirm your password';
      } else if (signUpPassword !== signUpConfirmPassword) {
        newErrors.signUpConfirmPassword = 'Passwords do not match';
      }

      if (!agreeTerms) {
        newErrors.terms = 'Please accept the terms of enrollment';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setIsLoading(true);
    const cleanEmail = signInEmail.trim();

    // 1. Perform Real Supabase Auth
    const { error } = await signIn(cleanEmail, signInPassword);
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

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setIsLoading(true);
    const cleanEmail = signUpEmail.trim();
    const cleanName = signUpFullName.trim();

    // Perform Real Supabase Auth SignUp (strictly role = 'student')
    const { error } = await signUp(cleanEmail, signUpPassword, cleanName, 'student');

    if (error) {
      setIsLoading(false);
      setErrorMsg(error || 'Sign up failed. Please try again or use another email.');
      return;
    }

    // Account creation successful
    setSuccessMsg('🎉 Account created successfully! Preparing your Student Portal...');
    setIsLoading(false);

    setTimeout(() => {
      navigate('/student/dashboard', { replace: true });
    }, 600);
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
      const cleanEmail = signInEmail.trim();
      const { error: dbErr } = await supabase
        .from('users')
        .update({ must_change_password: false })
        .ilike('email', cleanEmail);

      if (dbErr) {
        console.warn('[FirstTimePassUpdate] DB notice:', dbErr.message);
      }

      await supabase.auth.updateUser({ password: newPassword }).catch(() => { });

      setIsChangingPass(false);
      setShowFirstTimeModal(false);

      setNewPassword('');
      setConfirmPassword('');
      setSignInPassword('');
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#50001D] transition-colors cursor-pointer"
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
              <Input
                label="New Permanent Password"
                type="password"
                showPasswordToggle={true}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
              />

              <Input
                label="Confirm New Password"
                type="password"
                showPasswordToggle={true}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full h-11 bg-[#50001D] text-white rounded-xl text-xs font-black hover:bg-[#3D0016] transition-colors shadow-md disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isChangingPass ? 'Updating Password...' : 'Save New Password & Return to Login'}
              </button>
            </form>
          </motion.div>
        ) : !showForgotOverlay ? (
          /* AUTHENTICATION INTERFACE (SIGN IN / SIGN UP) */
          <motion.div
            key="auth-form-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Header with Tab Switcher */}
            <div className="text-center sm:text-left mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="p-1 bg-slate-100/90 rounded-2xl flex items-center gap-1 border border-slate-200/80 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={switchToSignIn}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authMode === 'signin'
                        ? 'bg-[#50001D] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={switchToSignUp}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authMode === 'signup'
                        ? 'bg-[#50001D] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Sign Up
                  </button>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
                {authMode === 'signin' ? 'Sign in to your portal' : 'Create your student account'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                {authMode === 'signin'
                  ? 'Access your university applications, NAWA legalizations, and VFS visa updates.'
                  : 'Start your European higher education journey with Ferex Education.'}
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

            {/* Forms */}
            {authMode === 'signin' ? (
              /* SIGN IN FORM */
              <form onSubmit={handleSignIn} className="space-y-4" autoComplete="on">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="student@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  error={errors.signInEmail}
                  autoComplete="email"
                  disabled={isLoading}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  error={errors.signInPassword}
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
                    className="text-xs font-bold text-[#50001D] hover:underline focus:outline-none cursor-pointer"
                    tabIndex={0}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#50001D] via-[#6A1B2E] to-[#50001D] hover:from-[#3D0016] hover:to-[#50001D] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#50001D]/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2 cursor-pointer"
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
            ) : (
              /* SIGN UP FORM — ALWAYS OPENS WITH EMPTY FIELDS */
              <form onSubmit={handleSignUp} className="space-y-4" autoComplete="off">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Alexander Bennett"
                  value={signUpFullName}
                  onChange={(e) => setSignUpFullName(e.target.value)}
                  error={errors.signUpFullName}
                  autoComplete="off"
                  disabled={isLoading}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  error={errors.signUpEmail}
                  autoComplete="off"
                  disabled={isLoading}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Create a password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    error={errors.signUpPassword}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Repeat password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    error={errors.signUpConfirmPassword}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>

                <div className="pt-1">
                  <Checkbox
                    label="I agree to the Terms of Service and Privacy Policy"
                    checked={agreeTerms}
                    onChange={(checked) => setAgreeTerms(checked)}
                    disabled={isLoading}
                  />
                  {errors.terms && <p className="text-[11px] font-bold text-red-600 mt-1">{errors.terms}</p>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#50001D] via-[#6A1B2E] to-[#50001D] hover:from-[#3D0016] hover:to-[#50001D] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#50001D]/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-amber-300" />
                      <span>Create Student Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

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
                  className="mt-2 text-xs font-bold text-[#50001D] hover:underline block mx-auto cursor-pointer"
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
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-10 px-5 bg-[#50001D] text-white text-xs font-bold rounded-xl hover:bg-[#3D0016] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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


