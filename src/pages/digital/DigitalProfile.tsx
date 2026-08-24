import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, CheckCircle2, Save } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const DigitalProfile: React.FC = () => {
  const [profile, setProfile] = useState({
    name: 'Ferex Digital Director',
    role: 'Managing Director & Head of Agency',
    company: 'Ferex Digital Pvt. Ltd.',
    email: 'digital@ferex.com',
    phone: '+91 98200 99887',
    location: 'Bandra Kurla Complex, Mumbai, India',
    bio: 'Overseeing agency operations, enterprise client relationships, service delivery across Web, Mobile, Design, Marketing, and SEO.',
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
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner Section */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] p-8 md:p-10 text-white shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar with smooth hover & upload */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-white/20 bg-slate-800 text-white overflow-hidden flex items-center justify-center text-3xl font-black shadow-2xl transition-transform group-hover:scale-105">
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
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">Agency Executive</span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">Active Account</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm">{profile.name}</h1>
            <p className="text-xs md:text-sm font-semibold text-white/85">{profile.role} • {profile.company}</p>
          </div>
        </div>
      </div>

      {/* Details Form Card */}
      <Card className="p-6 border border-slate-200/70 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-[#6A1B2E]" /> Account & Personal Information
          </h2>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" /> Save Changes
          </Button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Full Display Name</label>
            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Designation & Role</label>
            <input type="text" value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Organization</label>
            <input type="text" value={profile.company} onChange={e => setProfile({...profile, company: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address</label>
            <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone Number</label>
            <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Office Location</label>
            <input type="text" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Executive Summary / Bio</label>
            <textarea rows={3} value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
          </div>
        </form>
      </Card>
    </div>
  );
};
