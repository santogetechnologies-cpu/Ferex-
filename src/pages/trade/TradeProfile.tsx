import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Trash2, Eye, CheckCircle2, ShieldCheck, Building2, Globe, Lock, Activity, User, Save } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'company' | 'trade' | 'security' | 'activity'>('personal');
  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_trade_profile_photo') || null;
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [userData, setUserData] = useState({
    fullName: 'Ferex Trade Director',
    email: 'trade@ferex.com',
    phone: '+91 98765 01234',
    title: 'Director of Global Trade Operations',
    company: 'Ferex Global Trade Corp',
    country: 'India / Poland Hub',
    incoterms: 'FOB / CIF European Ports',
    primaryBank: 'HSBC London / SBI Overseas'
  });

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToastMsg('Trade profile settings saved successfully!');
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

      {/* Redesigned Executive Hero Header */}
      <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-md text-left bg-white">
        {/* Deep Maroon Hero Banner with High Contrast Pure White Text */}
        <div className="min-h-[190px] md:h-52 bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] relative p-6 md:p-8 flex flex-col justify-end text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/40 pointer-events-none" />

          {/* Top Right Console Badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap z-10">
            <span className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Certified Global Trade Console
            </span>
            <span className="bg-emerald-500/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Session
            </span>
          </div>

          {/* Pure White Profile Title & Neatly Aligned Metadata */}
          <div className="relative z-10 space-y-1.5 max-w-3xl pb-2 md:pb-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm select-none">
                {userData.fullName}
              </h1>
              <span className="text-[10px] font-extrabold uppercase text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                Verified Executive
              </span>
            </div>
            <p className="text-xs md:text-sm font-bold text-white/95 flex items-center gap-1.5 drop-shadow-xs">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" /> {userData.title}
            </p>
            <p className="text-xs font-semibold text-white/80 flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-white/70 shrink-0" /> {userData.company} · {userData.country}
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
                  <div className="w-full h-full bg-[#6A1B2E] text-white text-2xl font-black flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
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
              className="text-xs font-bold h-9 px-4 border-slate-200 hover:border-[#6A1B2E] hover:bg-[#6A1B2E] hover:text-white transition-all duration-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
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
            { key: 'company', label: 'Company Details', icon: Building2 },
            { key: 'trade', label: 'Trade Preferences', icon: Globe },
            { key: 'security', label: 'Security & 2FA', icon: Lock },
            { key: 'activity', label: 'Audit Log', icon: Activity },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === t.key ? 'border-[#6A1B2E] text-[#6A1B2E] bg-white shadow-xs' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <t.icon className={`w-3.5 h-3.5 ${activeTab === t.key ? 'text-[#6A1B2E]' : 'text-slate-400'}`} />
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
                <input type="text" value={userData.fullName} onChange={(e) => setUserData({ ...userData, fullName: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Official Email</label>
                <input type="email" value={userData.email} onChange={(e) => setUserData({ ...userData, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Executive Title / Designation</label>
              <input type="text" value={userData.title} onChange={(e) => setUserData({ ...userData, title: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Contact Phone</label>
              <input type="text" value={userData.phone} onChange={(e) => setUserData({ ...userData, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
            </div>
            <div className="pt-2">
              <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save Profile Changes
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'company' && (
          <div className="space-y-4 max-w-xl text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h3 className="text-sm font-black text-slate-900">Corporate & Banking Entity</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Corporate Entity Name</span>
              <div className="text-sm font-black text-slate-900">{userData.company}</div>
              <div className="text-[10.5px] font-semibold text-slate-500">{userData.country}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Default Incoterms & Primary Banking</span>
              <div className="text-xs font-black text-slate-900">{userData.incoterms}</div>
              <div className="text-xs font-semibold text-slate-500">{userData.primaryBank}</div>
            </div>
          </div>
        )}

        {activeTab === 'trade' && (
          <div className="space-y-4 max-w-xl text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h3 className="text-sm font-black text-slate-900">European Freight & Customs Rules</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Primary Maritime Ports</span>
              <div className="text-xs font-black text-slate-900">Port of Gdansk 🇵🇱 · Port of Hamburg 🇩🇪 · Port of Rotterdam 🇳🇱</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Base Currency</span>
              <div className="text-xs font-black text-[#6A1B2E]">Indian Rupee (₹ INR) locked for Ferex Trade Demo</div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4 max-w-xl text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h3 className="text-sm font-black text-slate-900">Security Credentials & Hardware 2FA</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-emerald-950 block">Hardware Token 2FA Active</span>
                <span className="text-[10.5px] font-semibold text-emerald-700">Hardware token verified for LC issuance</span>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-300">
                Enabled
              </span>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3 max-w-xl text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h3 className="text-sm font-black text-slate-900">Executive Audit Log</h3>
            </div>
            <div className="space-y-2">
              {[
                { action: 'Authorized Letter of Credit LC-2026-8810 (₹1.45 Cr)', time: 'Today at 11:30 AM' },
                { action: 'Updated Container MSKU-9821045 ETA to Aug 14, 2026', time: 'Yesterday at 04:15 PM' },
                { action: 'Uploaded Phytosanitary Export Certificate PDF to Vault', time: 'Aug 04, 2026' }
              ].map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-[10px] font-extrabold text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>
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
                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
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
