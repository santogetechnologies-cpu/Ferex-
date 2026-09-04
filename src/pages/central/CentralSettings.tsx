import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Shield, Database, Globe, CheckCircle2,
  RefreshCw, Save, Mail
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralSettings: React.FC = () => {
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'security' | 'currency' | 'backup' | 'smtp'>('security');

  const [settings, setSettings] = useState({
    enforce2FA: true,
    sessionTimeoutMins: 60,
    autoAuditLogRetentionDays: 365,
    eurInrRate: 90.0,
    usdInrRate: 86.0,
    autoFxSync: true,
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpUser: 'apikey',
    smtpFrom: 'alerts@ferex.com',
    backupFrequency: 'Daily (02:00 UTC)',
    storageBucket: 'ferex-central-vault-prod',
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToastMsg('Central Enterprise Settings saved successfully');
  };

  const handleTriggerBackup = () => {
    showToastMsg('Database snapshot snapshot_central_2026_09.sql initiated...');
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#6A1B2E]" /> Global System & Security Configuration
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              Enterprise Root
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Master security policies, live FX exchange rate automation, automated Supabase vault backups, and global SMTP notification gateways.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { key: 'security', label: 'Security & Access Policy', icon: Shield },
          { key: 'currency', label: 'Multi-Currency & FX Rates', icon: Globe },
          { key: 'backup', label: 'Database & Backup Vault', icon: Database },
          { key: 'smtp', label: 'SMTP & Email Gateway', icon: Mail },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-[#6A1B2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </Card>

      {/* Settings Form Body */}
      <form onSubmit={handleSave}>
        <Card className="p-6 border border-slate-200/80 shadow-xs space-y-6">
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                Enterprise Authentication & RBAC Policy
              </h3>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h4 className="text-xs font-black text-slate-900">Enforce 2-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] font-semibold text-slate-500">Require TOTP authenticator app verification for all 4 Division Admins.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enforce2FA}
                  onChange={e => setSettings({ ...settings, enforce2FA: e.target.checked })}
                  className="w-4 h-4 accent-[#6A1B2E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Session Inactivity Timeout (Minutes)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeoutMins}
                    onChange={e => setSettings({ ...settings, sessionTimeoutMins: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Audit Log Retention (Days)</label>
                  <input
                    type="number"
                    value={settings.autoAuditLogRetentionDays}
                    onChange={e => setSettings({ ...settings, autoAuditLogRetentionDays: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'currency' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                Multi-Currency Parity & Exchange Rates
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">1 EUR to INR Rate (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.eurInrRate}
                    onChange={e => setSettings({ ...settings, eurInrRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">1 USD to INR Rate (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.usdInrRate}
                    onChange={e => setSettings({ ...settings, usdInrRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Database Backup & Storage Vault</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleTriggerBackup}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Snapshot Now
                </Button>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Automated Snapshot Frequency</label>
                  <input
                    type="text"
                    disabled
                    value={settings.backupFrequency}
                    className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Primary Storage Bucket</label>
                  <input
                    type="text"
                    disabled
                    value={settings.storageBucket}
                    className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                SMTP Gateway & Email Automation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">From Sender Address</label>
                  <input
                    type="text"
                    value={settings.smtpFrom}
                    onChange={e => setSettings({ ...settings, smtpFrom: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-xs">
              <Save className="w-4 h-4 mr-1.5" /> Save Configuration
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
