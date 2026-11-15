import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, CheckCircle2, Save } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const DigitalProfile: React.FC = () => {
  const { profile: account, user, refreshProfile } = useAuth();
  const profile = {
    name: account?.full_name || '',
    email: account?.email || user?.email || '',
    phone: (account as any)?.phone || '',
    role: String(account?.role || '').replace(/_/g, ' ')
  };

  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);
  const avatar = account?.avatar_url || '';

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // The photo is stored with the account, so it follows the person to every device and is never shown to someone else on a shared one.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Choose a JPG, PNG or WebP image'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Choose an image under 2 MB'); return; }
    setUploading(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.${file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const up = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true });
      if (up.error) throw up.error;
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      showToast('Profile photo updated');
    } catch (err: any) {
      showToast(`Could not update the photo: ${err.message || 'try again'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Profile Header Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs text-slate-900">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar with smooth hover & upload */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-slate-100 bg-[#58051E] text-white overflow-hidden flex items-center justify-center text-3xl font-black shadow-xs transition-transform group-hover:scale-105">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-white/80" />
              )}
            </div>
            <label className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold gap-1">
              <Camera className="w-5 h-5" />
              <span>Upload Photo</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={uploading} className="hidden" />
            </label>
          </div>

          {/* Header Details */}
          <div className="space-y-1.5 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-md">{profile.role}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{profile.name}</h1>
            <p className="text-xs md:text-sm font-medium text-slate-500">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Details Form Card */}
      <Card className="p-6 border border-slate-200/70 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-[#58051E]" /> Account information (managed by your administrator)
          </h2>
        </div>

        <form onSubmit={e => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Full Name</label>
            <input type="text" value={profile.name} readOnly className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
            <input type="email" value={profile.email} readOnly className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role</label>
            <input type="text" value={profile.role} disabled className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
            <input type="text" value={profile.phone} readOnly className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
          </div>
        </form>
      </Card>

      {/* Security & Password Card */}
      <ChangePasswordForm
        title="Ferex Digital Account Password"
        subtitle="Update your credentials for Ferex Digital Agency console"
      />
    </div>
  );
};
