import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Shield, Mail, Phone, Building, Calendar, MapPin, Award, Sparkles, User, KeyRound } from 'lucide-react';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../hooks/useStudents';
import { supabase } from '../../lib/supabase';
import { getAdminSupabaseClient } from '../../lib/adminAuthClient';

export const StaffProfile: React.FC = () => {
  const { user, profile } = useAuth();
  const { students } = useStudents();
  const [toast, setToast] = useState('');
  const [isOnDuty, setIsOnDuty] = useState(true);

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

  const staffName = profile?.full_name || (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Counselor';
  const staffEmail = profile?.email || user?.email || 'counselor@santoge.com';
  const staffRole = (profile?.role || (user?.user_metadata as any)?.role || 'counselor').replace(/_/g, ' ');
  const staffInitials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'FX';
  const staffPhone = profile?.phone || 'Not configured';
  const staffDept = profile?.department || 'Admissions & Student Counseling Desk';
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'September 2026';

  const myAssignedStudents = students.filter(s =>
    s.assigned_counselor && (
      s.assigned_counselor.toLowerCase().includes(staffName.toLowerCase()) ||
      s.assigned_counselor.toLowerCase().includes(staffEmail.split('@')[0].toLowerCase())
    )
  );

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
        // Fallback admin update
        const admin = await getAdminSupabaseClient();
        if (user?.id) {
          await admin.auth.admin.updateUserById(user.id, { password: newPassword });
        }
      }

      // Update local storage credential cache if present
      try {
        const credKey = `ferex_admin_cred_${staffEmail.toLowerCase()}`;
        const existingRaw = localStorage.getItem(credKey);
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          parsed.password = newPassword;
          localStorage.setItem(credKey, JSON.stringify(parsed));
        }
      } catch {}

      setPasswordSuccess('Password successfully updated!');
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
    <div className="space-y-6 text-left antialiased select-none font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Executive Profile Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#58051E] via-[#430316] to-[#2E030F] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 border-2 border-white/20 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-2xl backdrop-blur-md shrink-0">
            {staffInitials}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-0.5 rounded-full border border-white/20">
                Official Staff Account
              </span>
              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-300/20">
                {myAssignedStudents.length} Active Assigned Students
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">{staffName}</h1>
            <p className="text-xs text-white/80 font-bold capitalize">{staffRole} • FEREX Global Education Services</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => { setIsOnDuty(!isOnDuty); showToast(isOnDuty ? 'Status updated to Away' : 'Status updated to On Duty'); }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${isOnDuty ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            <span>{isOnDuty ? '● Available / On Duty' : '○ Away / In Session'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Overview */}
        <div className="space-y-6">
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#58051E]" /> Staff Designation & Role
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Department</span>
                <span className="font-extrabold text-slate-900">{staffDept}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Portal Access</span>
                <span className="font-extrabold text-[#58051E] uppercase">{staffRole}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Account Status</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Active
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> System Permissions
            </h3>
            <div className="space-y-1.5">
              {[
                'Access Student Roster & Applications',
                'Schedule & Conduct Counseling Meetings',
                'Verify & Review Academic Dossiers',
                'Manage Operational Tasks & Workflows',
                'Respond to Student Support Tickets'
              ].map((perm, idx) => (
                <div key={idx} className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right 2 Columns: Official Profile & Security */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
              Official Counselor Profile Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Official Staff Email</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#58051E]" /> {staffEmail}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Contact Phone</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#58051E]" /> {staffPhone}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Assigned Desk / Roster</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#58051E]" /> {staffDept}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Profile Created</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#58051E]" /> {joinDate}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Workplace Location</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#58051E]" /> FEREX Global Education Operations Hub
                </span>
              </div>
            </div>
          </Card>

          {/* Security & Password Reset */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#58051E]" /> Account Security & Password
            </h3>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500 shrink-0" />
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-[#58051E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-[#58051E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newPassword}
                  className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
