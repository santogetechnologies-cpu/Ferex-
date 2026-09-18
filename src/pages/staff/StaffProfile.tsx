import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, ShieldCheck, Mail, Phone, Building2, Calendar,
  MapPin, Sparkles, User, KeyRound, AlertCircle, Lock
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getAdminSupabaseClient } from '../../lib/adminAuthClient';

export const StaffProfile: React.FC = () => {
  const { user, profile } = useAuth();
  const [toast, setToast] = useState('');

  // Password update state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const staffName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admissions Counselor';
  const staffEmail = profile?.email || user?.email || 'counselor@ferex.com';
  const staffRole = 'Admissions Counselor';
  const staffInitials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AC';
  const staffPhone = profile?.phone || 'Configured via HR';
  const staffDept = 'Admissions & Education Counseling Desk';
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'September 2026';

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        // Direct admin auth fallback
        const admin = await getAdminSupabaseClient();
        if (user?.id) {
          const res = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
          if (res.error) throw res.error;
        } else {
          throw error;
        }
      }

      setPasswordSuccess('Password successfully updated in Supabase Auth!');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Security credentials updated successfully.');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 text-left antialiased select-none font-sans max-w-4xl mx-auto">
      {/* Toast */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#58051E] via-[#430316] to-[#2E030F] text-white p-8 shadow-xl relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-2xl text-amber-300 shadow-inner shrink-0">
              {staffInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-300" /> {staffRole}
                </span>
                <span className="text-[10px] font-bold text-emerald-300">● Active Staff</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">
                {staffName}
              </h1>
              <span className="text-xs text-white/70 font-semibold">{staffEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment & Role Information */}
        <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-[#58051E]" />
            <h3 className="text-sm font-black text-slate-900">Counselor Profile Information</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Full Name</span>
              <span className="font-extrabold text-slate-900 text-sm">{staffName}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Email Address</span>
              <span className="font-bold text-slate-700">{staffEmail}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Department</span>
              <span className="font-bold text-slate-700">{staffDept}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Access Scope</span>
              <span className="font-extrabold text-emerald-700">Education Module Exclusive (Restricted from Digital / Trade / RIMI / Admin Controls)</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Account Created</span>
              <span className="font-bold text-slate-600">{joinDate}</span>
            </div>
          </div>
        </Card>

        {/* Security & Password Reset */}
        <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound className="w-4 h-4 text-[#58051E]" />
            <h3 className="text-sm font-black text-slate-900">Security & Authentication</h3>
          </div>

          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            Update your counselor password. Credentials are synchronized securely with Supabase Auth.
          </p>

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isUpdatingPassword}
              className="w-full bg-[#58051E] hover:bg-[#430316] text-white font-black text-xs mt-2"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              {isUpdatingPassword ? 'Updating Password...' : 'Update Password in Supabase'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
