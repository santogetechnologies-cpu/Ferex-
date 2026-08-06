import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Save, CheckCircle2, ToggleLeft, ToggleRight, Database } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralSettings: React.FC = () => {
  const [toast, setToast] = useState('');

  const [settings, setSettings] = useState({
    enforce2FA: true,
    maintenanceMode: false,
    smtpGateway: 'SendGrid Active (smtp.sendgrid.net)',
    domainName: 'ferexedu.com',
    autoBackupDaily: true,
    auditRetentionDays: '365 Days'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToastMsg('Central System Settings saved and applied globally!');
  };

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#6A1B2E]" /> Global System Settings & Controls
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Global security policy, email SMTP gateway, domain, and backup triggers.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Shield className="w-4 h-4 text-[#6A1B2E]" /> Platform Security Policies
            </h3>
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h4 className="font-extrabold text-slate-900">Enforce Mandatory 2FA for Staff</h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Requires multi-factor authenticator app for all admin logins</p>
                </div>
                <button type="button" onClick={() => setSettings({ ...settings, enforce2FA: !settings.enforce2FA })}>
                  {settings.enforce2FA ? <ToggleRight className="w-9 h-9 text-[#6A1B2E]" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h4 className="font-extrabold text-slate-900">Maintenance Window Mode</h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Displays scheduled maintenance banner for student portal</p>
                </div>
                <button type="button" onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}>
                  {settings.maintenanceMode ? <ToggleRight className="w-9 h-9 text-[#6A1B2E]" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Database className="w-4 h-4 text-[#6A1B2E]" /> Data & Backup Infrastructure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Audit Log Retention</label>
                <select value={settings.auditRetentionDays} onChange={(e) => setSettings({ ...settings, auditRetentionDays: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                  <option value="365 Days">365 Days (1 Year Compliance)</option>
                  <option value="180 Days">180 Days</option>
                  <option value="90 Days">90 Days</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Corporate Domain</label>
                <input type="text" value={settings.domainName} onChange={(e) => setSettings({ ...settings, domainName: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold px-6">
              <Save className="w-4 h-4 mr-1.5" /> Save System Settings
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
