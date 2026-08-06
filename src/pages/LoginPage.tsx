import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { Button } from '../components/Button';
import { Divider } from '../components/Divider';
import { SocialButton } from '../components/SocialButton';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
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

  // Mock sign-in submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setIsLoading(true);

    // Simulate standard SaaS secure login latency
    setTimeout(() => {
      setIsLoading(false);
      
      if (email === 'student@gmail.com' && password === 'student123') {
        setSuccessMsg('Authorization successful. Loading secure workspace...');
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 800);
      } else if (email === 'admin@gmail.com' && password === 'admin123') {
        setSuccessMsg('Authorization successful. Loading admin console...');
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 800);
      } else if (email === 'superadmin@gmail.com' && password === 'super123') {
        setSuccessMsg('Authorization successful. Loading Super Admin Central Console...');
        setTimeout(() => {
          navigate('/central/dashboard');
        }, 800);
      } else {
        setErrorMsg('Invalid email or password');
      }
    }, 1500);
  };

  // Mock forgot password submission
  const handleForgotSubmit = (e: React.FormEvent) => {
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
    setTimeout(() => {
      setIsLoading(false);
      setForgotSent(true);
    }, 1500);
  };

  // Mock social login
  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg(`Authorization via ${provider} successful. Loading workspace...`);
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 800);
    }, 1500);
  };

  return (
    <div className="relative overflow-hidden w-full">
      <AnimatePresence mode="wait">
        {!showForgotOverlay ? (
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
                Welcome back. Access your unified console.
              </p>
            </div>

            {/* Notification Messages */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">Success</h4>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5 leading-relaxed">{successMsg}</p>
                  </div>
                </motion.div>
              )}

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-950">Access Denied</h4>
                    <p className="text-xs font-semibold text-red-700 mt-0.5 leading-relaxed">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input
                label="Email address"
                id="login-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                error={errors.email}
                disabled={isLoading}
                required
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  showPasswordToggle
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  error={errors.password}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between gap-4 py-1 select-none">
                <Checkbox
                  label="Remember me for 30 days"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={setRememberMe}
                  disabled={isLoading}
                />
                
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotOverlay(true);
                    setForgotSent(false);
                    setForgotEmail('');
                    setForgotError('');
                  }}
                  disabled={isLoading}
                  className="text-sm font-bold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-0.5"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full mt-2"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Sign In
              </Button>
            </form>

            {/* Social Logins */}
            <Divider className="my-6">or sign in with</Divider>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <SocialButton
                provider="google"
                disabled={isLoading}
                onClick={() => handleSocialLogin('Google')}
              />
              <SocialButton
                provider="microsoft"
                disabled={isLoading}
                onClick={() => handleSocialLogin('Microsoft')}
              />
            </div>
          </motion.div>
        ) : (
          /* FORGOT PASSWORD OVERLAY */
          <motion.div
            key="forgot-password"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Header */}
            <div className="text-center sm:text-left mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                Reset your password
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Enter your organizational email to obtain security instructions.
              </p>
            </div>

            {forgotSent ? (
              <div className="text-left space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">Reset Instructions Sent</h4>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5 leading-relaxed">
                      We have dispatched password recovery instructions to <span className="font-bold">{forgotEmail}</span> if it is registered in our directories.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowForgotOverlay(false)}
                  variant="secondary"
                  className="w-full"
                >
                  Return to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5" noValidate>
                <Input
                  label="Email address"
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotError) setForgotError('');
                  }}
                  error={forgotError}
                  disabled={isLoading}
                  required
                />

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Send Reset Link
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => setShowForgotOverlay(false)}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    Cancel
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
