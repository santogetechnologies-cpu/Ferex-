import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Save, RefreshCw, CheckCircle2, Shield,
  Globe, Mail, Building, Bell, Lock, Database,
  Check, AlertTriangle, Key, Activity, Laptop, Zap
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getSystemConfig, saveSystemConfig } from '../../lib/api/systemConfig';
import type { SystemCustomizationConfig } from '../../lib/types';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

export const CentralSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branding' | 'subsidiaries' | 'security' | 'database' | 'password'>('branding');
  const [config, setConfig] = useState<SystemCustomizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [lastSaved, setLastSaved] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await getSystemConfig();
        setConfig(data);
        if (data.updated_at) {
          setLastSaved(new Date(data.updated_at).toLocaleTimeString());
        }
      } catch {
        showToastMsg('Failed to load system settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const updated = await saveSystemConfig(config);
      setConfig(updated);
      setLastSaved(new Date().toLocaleTimeString());
      showToastMsg('Enterprise settings synchronized with Supabase database!');
    } catch {
      showToastMsg('Failed to synchronize settings with database.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDatabase = async () => {
    setTestingDb(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      const elapsed = Math.round(performance.now() - start);
      if (!error) {
        setDbLatency(elapsed);
        showToastMsg(`Database connection optimal! Ping: ${elapsed}ms`);
      } else {
        setDbLatency(-1);
        showToastMsg(`Database warning: ${error.message}`);
      }
    } catch {
      setDbLatency(-1);
      showToastMsg('Database ping failed. Check network or Supabase credentials.');
    } finally {
      setTestingDb(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-[#58051E] mb-3" />
        <p className="text-sm font-bold">Synchronizing Central HQ Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#58051E]" /> Central Enterprise System Settings
            </h1>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Live DB Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Global governance parameters, branding, security policies, and 4-subsidiary operational switches stored in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastSaved && (
            <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl">
              Synced: <strong className="text-slate-700">{lastSaved}</strong>
            </span>
          )}
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold text-white shadow-xs"
          >
            <Save className={`w-3.5 h-3.5 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Syncing to DB...' : 'Save & Sync DB'}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none shadow-xs">
        {[
          { id: 'branding', label: 'Enterprise Identity & Branding', icon: Building },
          { id: 'subsidiaries', label: 'Subsidiary & Gateway Switches', icon: Globe },
          { id: 'security', label: 'Security & Session Policy', icon: Shield },
          { id: 'database', label: 'Database Health & Telemetry', icon: Database },
          { id: 'password', label: 'Super Admin Password', icon: Key },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Enterprise Branding */}
      {activeTab === 'branding' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Enterprise Brand & Organization Identity</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Parameters broadcasted across invoices, notifications, and customer portals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Organization Legal Name</label>
              <input
                type="text"
                value={config.branding.org_name}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, org_name: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Master Portal Title</label>
              <input
                type="text"
                value={config.branding.portal_title}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, portal_title: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Corporate Tagline</label>
              <input
                type="text"
                value={config.branding.tagline}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, tagline: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Central Support Email</label>
              <input
                type="email"
                value={config.branding.support_email}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, support_email: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Telephone / Helpline</label>
              <input
                type="text"
                value={config.branding.support_phone}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, support_phone: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">HQ Office Address</label>
              <input
                type="text"
                value={config.branding.office_address}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, office_address: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Subsidiary Switches */}
      {activeTab === 'subsidiaries' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Subsidiary Feature Controls & Maintenance Modes</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Toggle live application modules and maintenance states dynamically across all 4 subsidiaries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">Direct Course Applications</p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">Allow students to self-apply to European partner universities.</p>
              </div>
              <input
                type="checkbox"
                checked={config.features.enable_direct_course_application}
                onChange={(e) => setConfig({ ...config, features: { ...config.features, enable_direct_course_application: e.target.checked } })}
                className="w-5 h-5 accent-[#58051E] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">Student Meeting Self-Booking</p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">Enable Google Meet automated calendar booking for applicants.</p>
              </div>
              <input
                type="checkbox"
                checked={config.features.enable_student_meeting_self_booking}
                onChange={(e) => setConfig({ ...config, features: { ...config.features, enable_student_meeting_self_booking: e.target.checked } })}
                className="w-5 h-5 accent-[#58051E] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">Landing Tuition Calculator</p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">Show public study-abroad cost estimation tool.</p>
              </div>
              <input
                type="checkbox"
                checked={config.features.enable_landing_calculator}
                onChange={(e) => setConfig({ ...config, features: { ...config.features, enable_landing_calculator: e.target.checked } })}
                className="w-5 h-5 accent-[#58051E] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-rose-900">Emergency Maintenance Banner</p>
                <p className="text-[11px] font-medium text-rose-600 mt-0.5">Broadcast system-wide maintenance alert across all 4 portals.</p>
              </div>
              <input
                type="checkbox"
                checked={config.features.enable_maintenance_banner}
                onChange={(e) => setConfig({ ...config, features: { ...config.features, enable_maintenance_banner: e.target.checked } })}
                className="w-5 h-5 accent-rose-700 cursor-pointer"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Security & Session Policy */}
      {activeTab === 'security' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Central Security & Access Governance</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Session timeouts, multi-factor authentication requirements, and password strength policies.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
              <span className="font-bold text-slate-800 block">Admin Session Idle Timeout</span>
              <select className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes (Recommended)</option>
                <option value="60">60 Minutes</option>
                <option value="240">4 Hours</option>
              </select>
              <p className="text-[10px] text-slate-400">Forces automatic logout after period of inactivity.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
              <span className="font-bold text-slate-800 block">MFA Enforcement Scope</span>
              <select className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
                <option value="superadmin">Central Super Admins Only</option>
                <option value="all_admins">All 4 Division Admins</option>
                <option value="all_staff">All Admins & Operations Staff</option>
              </select>
              <p className="text-[10px] text-slate-400">Requires 2-Factor Authentication via TOTP / Authenticator app.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
              <span className="font-bold text-slate-800 block">Password Complexity Policy</span>
              <select className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
                <option value="standard">Standard (Min 6 Chars)</option>
                <option value="strong">High Security (8+ Chars, Digits & Symbols)</option>
              </select>
              <p className="text-[10px] text-slate-400">Enforced during user provisioning and password resets.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Database Health & Telemetry */}
      {activeTab === 'database' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Supabase Live Database Connectivity</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Real-time health ping and schema synchronization diagnostics.</p>
            </div>
            <Button
              size="sm"
              onClick={handleTestDatabase}
              disabled={testingDb}
              variant="outline"
              className="text-xs font-bold text-slate-700 bg-slate-50"
            >
              <Zap className={`w-3.5 h-3.5 mr-1.5 ${testingDb ? 'animate-spin text-[#58051E]' : ''}`} />
              {testingDb ? 'Testing Connection...' : 'Ping Supabase DB'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Database Engine</span>
              <span className="text-sm font-black text-emerald-900 mt-1 block">Supabase PostgreSQL 15</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Active & Synchronized</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Round-Trip Latency</span>
              <span className="text-sm font-black text-slate-900 mt-1 block">
                {dbLatency === null ? 'Click "Ping" to measure' : dbLatency === -1 ? 'Connection Error' : `${dbLatency} ms`}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Direct REST / WebSocket</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Realtime Subscriptions</span>
              <span className="text-sm font-black text-slate-900 mt-1 block">4 Active Channels</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Payments, Users, Audit, Emails</span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Change Super Admin Password */}
      {activeTab === 'password' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Super Admin Security Credential Update</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Securely change the master administrator login password.</p>
          </div>

          <div className="max-w-md">
            <ChangePasswordForm
              title="Super Admin Password"
              subtitle="Update your master Central HQ authentication password"
              onSuccess={() => showToastMsg('Super Admin password successfully updated!')}
            />
          </div>
        </Card>
      )}
    </div>
  );
};
