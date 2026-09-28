import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, CheckCircle2, Save } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

export const DigitalProfile: React.FC = () => {
  const [profile, setProfile] = useState({
    name: 'Digital Admin',
    email: 'digital@ferex.com',
    phone: '+91 484 290 1234',
    role: 'Admin'
  });

  const [avatar, setAvatar] = useState<string>('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const savedAvatar = localStorage.getItem('ferex_digital_avatar');
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatar(result);
        localStorage.setItem('ferex_digital_avatar', result);
        showToast('Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profile details updated!');
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
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
            <User className="w-4 h-4 text-[#58051E]" /> Account & Personal Information
          </h2>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" /> Save Changes
          </Button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Full Name</label>
            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
            <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role</label>
            <input type="text" value={profile.role} disabled className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
            <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
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
