import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Trash2, Eye, CheckCircle2, ShieldCheck, Building2, Globe, Lock, Activity, User, Save, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

export const TradeProfile: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_trade_profile_photo') || null;
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [userData, setUserData] = useState({
    fullName: profile?.full_name || 'Trade Admin',
    email: profile?.email || 'trade@ferex.com',
    phone: profile?.phone || '+91 98765 01234',
    role: profile?.role || 'Admin'
  });

  useEffect(() => {
    if (profile) {
      setUserData(prev => ({
        ...prev,
        fullName: profile.full_name || prev.fullName,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone,
        role: profile.role || 'Admin'
      }));
    }
  }, [profile]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePhoto(result);
        localStorage.setItem('ferex_trade_profile_photo', result);
        window.dispatchEvent(new Event('ferex_trade_avatar_change'));
        showToastMsg('Trade profile photo updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    localStorage.removeItem('ferex_trade_profile_photo');
    window.dispatchEvent(new Event('ferex_trade_avatar_change'));
    showToastMsg('Profile photo removed');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (profile?.id) {
        await supabase
          .from('users')
          .update({
            full_name: userData.fullName,
            phone: userData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
      }
      showToastMsg('Trade profile saved to database!');
    } catch {
      showToastMsg('Profile updated locally.');
    }
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

      {/* Redesigned Executive Hero Header */}
      <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-md text-left bg-white">
        {/* Deep Maroon Hero Banner with High Contrast Pure White Text */}
        <div className="min-h-[190px] md:h-52 bg-gradient-to-r from-[#58051E] via-[#430316] to-[#2E030F] relative p-6 md:p-8 flex flex-col justify-end text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/40 pointer-events-none" />

          {/* Top Right Console Badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap z-10">
            <span className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> {userData.role}
            </span>
          </div>

          {/* Pure White Profile Title & Neatly Aligned Metadata */}
          <div className="relative z-10 space-y-1.5 max-w-3xl pb-2 md:pb-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm select-none">
                {userData.fullName}
              </h1>
            </div>
            <p className="text-xs md:text-sm font-bold text-white/95 flex items-center gap-1.5 drop-shadow-xs">
              {userData.email}
            </p>
          </div>
        </div>

        {/* Header Bottom Bar: Avatar & Executive Action Buttons */}
        <div className="px-6 pb-5 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4 -mt-10 sm:-mt-12 relative z-20">
            {/* Avatar Container (96px x 96px) with smooth hover */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0 cursor-pointer"
              title="Click to change photo"
            >
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl bg-white overflow-hidden group-hover:shadow-2xl transition-all duration-200 relative">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                ) : (
                  <div className="w-full h-full bg-[#58051E] text-white text-2xl font-black flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    GT
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-sm" title="Identity Verified">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="hidden sm:block pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logged in as</span>
              <span className="text-xs font-extrabold text-slate-800">{userData.email}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-end pt-2 sm:pt-0">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold h-9 px-4 border-slate-200 hover:border-[#58051E] hover:bg-[#58051E] hover:text-white transition-all duration-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5" /> {profilePhoto ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {profilePhoto && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold h-9 px-3.5 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" /> Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold h-9 px-3.5 border-slate-200 hover:border-red-200 hover:bg-red-50 text-red-600 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  onClick={handleRemovePhoto}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs Bar Navigation */}
        <div className="flex border-t border-slate-100 px-6 overflow-x-auto bg-slate-50/50">
          {[
            { key: 'personal', label: 'Personal Info', icon: User },
            { key: 'security', label: 'Security & 2FA', icon: Lock },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === t.key ? 'border-[#58051E] text-[#58051E] bg-white shadow-xs' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <t.icon className={`w-3.5 h-3.5 ${activeTab === t.key ? 'text-[#58051E]' : 'text-slate-400'}`} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab Contents */}
      <Card className="p-6 border border-slate-200/70 shadow-xs text-left">
        {activeTab === 'personal' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h3 className="text-sm font-black text-slate-900">Executive Account Details</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Full Name</label>
                <input type="text" value={userData.fullName} onChange={(e) => setUserData({ ...userData, fullName: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Email</label>
                <input type="email" value={userData.email} onChange={(e) => setUserData({ ...userData, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Role</label>
                <input type="text" value={userData.role} disabled className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Phone</label>
                <input type="text" value={userData.phone} onChange={(e) => setUserData({ ...userData, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]" />
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save Profile Changes
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <div className="max-w-xl">
            <ChangePasswordForm
              title="Global Trade Account Password"
              subtitle="Update your Trade portal authentication credentials"
              variant="plain"
            />
          </div>
        )}
      </Card>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && profilePhoto && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setShowPreviewModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-2xl shadow-2xl z-50 max-w-sm w-full text-center border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900">Profile Photo Preview</h4>
                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <img src={profilePhoto} alt="Preview" className="w-56 h-56 rounded-2xl object-cover mx-auto shadow-md border border-slate-100" />
              <Button size="sm" variant="outline" className="w-full text-xs font-bold" onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
