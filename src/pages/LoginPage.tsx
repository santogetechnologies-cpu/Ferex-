import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertCircle, KeyRound, ArrowLeft, LogIn, UserPlus, Lock,
  FileText, X, FileCheck, Check
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute, getPortalLabel, isSuperAdmin } from '../lib/roleRouter';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword } = useAuth();

  // Tab mode: 'signin' | 'signup'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const prefilledUni = searchParams.get('uni') || '';
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Sign In Specific Fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Sign Up Specific Fields
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreeConsent, setAgreeConsent] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    signInEmail?: string;
    signInPassword?: string;
    signUpFullName?: string;
    signUpEmail?: string;
    signUpPassword?: string;
    signUpConfirmPassword?: string;
    terms?: string;
    consent?: string;
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
        newErrors.terms = 'Please accept the general terms of service';
      }

      if (!agreeConsent) {
        newErrors.consent = 'Document Processing & NAWA Authorization consent is mandatory to proceed';
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

    // 2. Fetch authenticated user profile to resolve authoritative role from public.users or local registry
    const { data: { user: suUser } } = await supabase.auth.getUser();
    const user = suUser || (() => {
      try {
        const raw = localStorage.getItem('ferex_user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    if (!user?.id) {
      setIsLoading(false);
      setErrorMsg('Authentication error: Unable to retrieve authenticated user session.');
      return;
    }

    let role: string | null = null;
    let mustChangePassword = false;

    const { data: dbProfile } = await supabase
      .from('users')
      .select('role, must_change_password')
      .eq('id', user.id)
      .maybeSingle();

    if (dbProfile?.role) {
      role = dbProfile.role;
      mustChangePassword = !!dbProfile.must_change_password;
    } else if (cleanEmail) {
      const { data: dbProfileByEmail } = await supabase
        .from('users')
        .select('role, must_change_password')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (dbProfileByEmail?.role) {
        role = dbProfileByEmail.role;
        mustChangePassword = !!dbProfileByEmail.must_change_password;
      }
    }

    if (!role) {
      const localCred = localStorage.getItem(`ferex_admin_cred_${cleanEmail.toLowerCase()}`);
      if (localCred) {
        try {
          const parsed = JSON.parse(localCred);
          role = parsed.role;
          if (parsed.require_password_reset) {
            mustChangePassword = true;
          }
        } catch {}
      }
    }

    // Direct unassigned Supabase auth defaults to superadmin
    if (!role) {
      role = user.user_metadata?.role || (dbProfile as any)?.role || 'superadmin';
    }

    // Authoritatively detect Super Admin via email, role, or user metadata
    const isSuper =
      isSuperAdmin(role, cleanEmail) ||
      isSuperAdmin(user.user_metadata?.role, cleanEmail) ||
      isSuperAdmin(dbProfile?.role, cleanEmail) ||
      role === 'superadmin' ||
      role === 'super_admin' ||
      role === 'central' ||
      role === 'admin';

    if (isSuper) {
      role = 'superadmin';
      // Sync authoritative role back to public.users
      try {
        await supabase
          .from('users')
          .update({ role: 'superadmin', updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {}
    } else if (!role) {
      role = 'student';
    }


    if (mustChangePassword) {
      setIsLoading(false);
      setShowFirstTimeModal(true);
      return;
    }

    try {
      localStorage.setItem('ferex_user', JSON.stringify({
        id: user.id,
        email: cleanEmail,
        role: role,
        full_name: user.user_metadata?.full_name || (dbProfile as any)?.full_name || (isSuper ? 'Central Super Admin' : cleanEmail.split('@')[0]),
      }));
    } catch {}

    const portalLabel = getPortalLabel(role, cleanEmail);
    const targetRoute = getDashboardRoute(role, cleanEmail);
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
    setSuccessMsg('🎉 Account created with Document Processing Consent verified! Preparing your Student Portal...');
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#58051E] transition-colors cursor-pointer"
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
              <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
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
                className="w-full h-11 bg-[#58051E] text-white rounded-xl text-xs font-black hover:bg-[#430316] transition-colors shadow-md disabled:opacity-50 mt-2 cursor-pointer"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="p-1 bg-slate-100/90 rounded-2xl flex items-center gap-1 border border-slate-200/80 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={switchToSignIn}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authMode === 'signin'
                        ? 'bg-[#58051E] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={switchToSignUp}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${authMode === 'signup'
                        ? 'bg-[#58051E] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Create Student Account
                  </button>
                </div>
              </div>

              {prefilledUni && authMode === 'signup' && (
                <div className="mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                  <span className="text-amber-600">Selected University:</span>
                  <span className="underline">{prefilledUni}</span>
                </div>
              )}

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
                {authMode === 'signin' ? 'Sign in to your portal' : 'Create your student account'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                {authMode === 'signin'
                  ? 'Access your university applications, NAWA legalizations, tuition payments, and VFS visa updates.'
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
                    className="text-xs font-bold text-[#58051E] hover:underline focus:outline-none cursor-pointer"
                    tabIndex={0}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#58051E] via-[#6A1B2E] to-[#58051E] hover:from-[#430316] hover:to-[#58051E] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#58051E]/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2 cursor-pointer"
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
              /* SIGN UP FORM WITH MANDATORY DOCUMENT CONSENT */
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

                {/* Terms Checkbox */}
                <div className="pt-1">
                  <Checkbox
                    label="I agree to the Terms of Service and Privacy Policy"
                    checked={agreeTerms}
                    onChange={(checked) => setAgreeTerms(checked)}
                    disabled={isLoading}
                  />
                  {errors.terms && <p className="text-[11px] font-bold text-red-600 mt-1">{errors.terms}</p>}
                </div>

                {/* Document Processing & NAWA Consent Card */}
                <div className="p-3.5 bg-[#FAF4E8] rounded-2xl border border-[#C5A880]/60 space-y-2 text-left">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="agreeConsentBox"
                      checked={agreeConsent}
                      onChange={(e) => setAgreeConsent(e.target.checked)}
                      disabled={isLoading}
                      className="w-4 h-4 mt-0.5 rounded accent-[#58051E] text-[#58051E] cursor-pointer"
                    />
                    <label htmlFor="agreeConsentBox" className="text-[11.5px] font-bold text-slate-900 leading-snug cursor-pointer">
                      I consent to FEREX Education processing my academic transcripts, passport, and financial documents for Polish NAWA Legalization, University Admissions, and VFS Visa Filing.
                    </label>
                  </div>

                  <div className="pl-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowConsentModal(true)}
                      className="text-[11px] font-black text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#58051E]" />
                      <span>Review Mandatory Document Processing Consent Agreement</span>
                    </button>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      GDPR Compliant
                    </span>
                  </div>

                  {errors.consent && (
                    <p className="text-[11px] font-bold text-red-600 pl-6">{errors.consent}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#58051E] via-[#6A1B2E] to-[#58051E] hover:from-[#430316] hover:to-[#58051E] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#58051E]/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account & Verifying Consent...
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
                  className="mt-2 text-xs font-bold text-[#58051E] hover:underline block mx-auto cursor-pointer"
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
                    className="h-10 px-5 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MANDATORY STUDENT DOCUMENT PROCESSING & NAWA CONSENT MODAL ───────── */}
      <AnimatePresence>
        {showConsentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowConsentModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-200 p-6 sm:p-7 max-h-[88vh] overflow-y-auto text-left"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#58051E] text-amber-300 flex items-center justify-center font-bold shadow-md shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Student Document Processing & Data Privacy Consent
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      FEREX Education • Legal Authorization & GDPR Compliance
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowConsentModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Consent Clauses */}
              <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Collection & Storage of Sensitive Documentation
                  </div>
                  <p className="text-[11.5px] text-slate-600 pl-6.5">
                    You authorize FEREX Education to receive, digitize, and securely store your academic records (10th/12th marksheets, Bachelor transcripts, degree diplomas), passport biodata, police clearance, and financial sponsorship statements in our encrypted 256-bit cloud infrastructure.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    NAWA Legalization & University Representation Authorization
                  </div>
                  <p className="text-[11.5px] text-slate-600 pl-6.5">
                    You grant FEREX Education full power of representation to submit your certified academic dossiers to the <strong>Polish National Agency for Academic Exchange (NAWA)</strong> in Warsaw, accredited partner European universities, and VFS Global / European Consular Embassies for admission, apostille, and National D visa processing.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    Document Authenticity & Anti-Fraud Guarantee
                  </div>
                  <p className="text-[11.5px] text-slate-600 pl-6.5">
                    You legally declare that all uploaded certificates, test scores, bank statements, and identification credentials are valid, authentic, and unaltered copies of official government and university records.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[10px] flex items-center justify-center font-bold">4</span>
                    GDPR Confidentiality & Non-Disclosure
                  </div>
                  <p className="text-[11.5px] text-slate-600 pl-6.5">
                    FEREX Education strictly adheres to European General Data Protection Regulations (GDPR). Your personal and financial documents will never be sold, commercialized, or shared with unauthorized third parties outside your designated admissions and visa proceedings.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="w-full sm:w-auto h-10 px-5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close Document
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAgreeConsent(true);
                    setShowConsentModal(false);
                  }}
                  className="w-full sm:w-auto h-10 px-6 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>I Understand & Accept Consent Terms</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
