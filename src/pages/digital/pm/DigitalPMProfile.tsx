import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, ShieldCheck, Sparkles, KeyRound,
  CheckCircle2, AlertCircle, Save
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { supabase } from '../../../lib/supabase';

export const DigitalPMProfile: React.FC = () => {
  const { user, profile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  // Password update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    if (profile || user) {
      setFullName(profile?.full_name || user?.user_metadata?.full_name || '');
      setEmail(profile?.email || user?.email || '');
      setPhone(profile?.phone || user?.phone || '+91 98190 22000');
    }
  }, [profile, user]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user?.id) {
        await supabase.from('users').update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString()
        }).eq('id', user.id);
      }

      showToastMsg('Profile details updated successfully!');
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match or are empty.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToastMsg('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg(err.message || 'Failed to update password.');
    }
  };

  const pmInitials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'PM';

  return (
    <div className="space-y-6 relative text-left pb-8 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Project Manager Profile & Security
          </h1>
          <Badge variant="brand">Authenticated Staff Lead</Badge>
        </div>
        <p className="text-xs text-slate-500">
          Manage your FEREX Digital staff account credentials, contact information, and security preferences.
        </p>
      </div>

      {/* Profile Card Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#58051E] text-white text-xl font-extrabold flex items-center justify-center shadow-md shrink-0">
          {pmInitials}
        </div>

        <div className="space-y-1 text-center sm:text-left min-w-0">
          <h2 className="text-base font-bold text-slate-900">{fullName || 'Digital Project Manager'}</h2>
          <p className="text-xs text-slate-500">{email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Role: Digital Project Manager
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
              Division: FEREX Digital Solutions
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Details */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-[#58051E]" />
            Staff Identity Details
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Corporate Email</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            <Button
              size="sm"
              type="submit"
              disabled={saving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="w-full mt-2"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </div>

        {/* Security & Password */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#58051E]" />
            Account Security & Password
          </h3>

          {passwordMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="w-full mt-2"
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
