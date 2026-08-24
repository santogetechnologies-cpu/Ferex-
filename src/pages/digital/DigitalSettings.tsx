import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Bell, Key, Globe, CheckCircle2, Save } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const DigitalSettings: React.FC = () => {
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    agencyName: 'Ferex Digital Pvt. Ltd.',
    currency: '₹ (INR)',
    timezone: 'Asia/Kolkata (IST)',
    emailAlerts: true,
    invoiceAlerts: true,
    leadAlerts: true,
    twoFactor: true,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings saved successfully!');
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#6A1B2E]" /> Agency Console Settings
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Configure agency preferences, security, notifications, and integration settings.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={handleSave}>
          <Save className="w-4 h-4 mr-1.5" /> Save Preferences
        </Button>
      </div>

      <div className="flex border-b border-slate-200/70 gap-2">
        {[
          { id: 'general', label: 'General', icon: Globe },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security & 2FA', icon: Shield },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === t.id ? 'border-[#6A1B2E] text-[#6A1B2E] bg-white' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'general' && (
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">Agency Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Agency Name</label>
                <input type="text" value={settings.agencyName} onChange={e => setSettings({...settings, agencyName: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Default Currency</label>
                <input type="text" disabled value={settings.currency} className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Timezone</label>
                <input type="text" value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">Alert Channels</h2>
            <div className="space-y-3">
              {[
                ['Email Notifications', 'Receive daily email digests and instant payment alerts', 'emailAlerts'],
                ['Invoice Reminders', 'Auto-notify client 3 days prior to invoice due date', 'invoiceAlerts'],
                ['New Lead Alerts', 'Push instant notification when a new lead enters pipeline', 'leadAlerts'],
              ].map(([title, sub, key]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{title}</p>
                    <p className="text-[10.5px] font-semibold text-slate-500">{sub}</p>
                  </div>
                  <input type="checkbox" checked={(settings as any)[key]} onChange={e => setSettings({...settings, [key]: e.target.checked})} className="w-4 h-4 accent-[#6A1B2E] rounded cursor-pointer" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">Security & Authentication</h2>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-extrabold text-slate-900">Two-Factor Authentication (2FA)</p>
                <p className="text-[10.5px] font-semibold text-slate-500">Require TOTP authenticator app on login</p>
              </div>
              <input type="checkbox" checked={settings.twoFactor} onChange={e => setSettings({...settings, twoFactor: e.target.checked})} className="w-4 h-4 accent-[#6A1B2E] rounded cursor-pointer" />
            </div>
            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" className="text-xs font-bold" onClick={() => showToast('Password reset link sent to digital@ferex.com')}>
                <Key className="w-4 h-4 mr-1.5" /> Change Password
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
};
