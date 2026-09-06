import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save, Sparkles, Megaphone, DollarSign, ShieldCheck, FileCheck,
  Phone, Globe, CheckCircle2, RotateCcw, AlertTriangle, Info, BellRing,
  HelpCircle, Sliders, Layers, Laptop, MessageCircle, Snowflake, Truck
} from 'lucide-react';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import type { SystemCustomizationConfig } from '../../lib/types';

interface Props {
  onNotify?: (msg: string) => void;
}

export const AdminCustomizationPolicies: React.FC<Props> = ({ onNotify }) => {
  const { config, updateConfig, resetToDefault, loading } = useSystemConfig();
  const [form, setForm] = useState<SystemCustomizationConfig>(config);
  const [activeSection, setActiveSection] = useState<'branding' | 'broadcast' | 'installments' | 'documents' | 'visa' | 'features' | 'digital' | 'rimi'>('branding');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if external change happens and not dirty
  React.useEffect(() => {
    setForm(config);
  }, [config]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateConfig(form);
      if (onNotify) {
        onNotify('Platform customizations & policies synchronized across Education Admin and Student portals!');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      if (onNotify) onNotify('Failed to save customizations.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all platform customizations and policies to official FEREX baseline defaults?')) {
      setIsSaving(true);
      try {
        const res = await resetToDefault();
        setForm(res);
        if (onNotify) onNotify('Customizations reset to system defaults.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const SECTIONS = [
    { id: 'branding', label: 'Portal Branding & Desk', icon: Globe },
    { id: 'broadcast', label: 'Broadcast Banner', icon: Megaphone, badge: form.broadcast.is_active ? 'Active' : undefined },
    { id: 'installments', label: 'Fee & Installments', icon: DollarSign },
    { id: 'documents', label: 'Document Policies', icon: FileCheck },
    { id: 'visa', label: 'Visa & Mock Prep', icon: ShieldCheck },
    { id: 'features', label: 'Feature Toggles', icon: Sliders },
    { id: 'digital', label: 'FEREX Digital Agency', icon: Laptop },
    { id: 'rimi', label: 'Rimi Frozen Logistics', icon: Snowflake },
  ] as const;

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#24020B] to-[#50001D] rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#6A1B2E]/40 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6CA9E]/20 text-[#E6CA9E] text-[10px] font-black uppercase tracking-wider border border-[#E6CA9E]/30">
              Live Portal Sync Engine
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              Auto-Reflected to Edu Admins & Students
            </span>
          </div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E6CA9E]" />
            FEREX Customization & System Policy Center
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Configure global organization identity, announcement banners, payment milestones, document compliance, and feature toggles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || loading}
            className="h-9 px-3.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || loading}
            className="h-9 px-4 rounded-xl text-xs font-black text-[#24020B] bg-[#E6CA9E] hover:bg-[#d8b988] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Syncing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#6A1B2E] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
              {sec.badge && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Form Content Body */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: BRANDING & DESK */}
        {activeSection === 'branding' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Organization Legal Name
                </label>
                <input
                  type="text"
                  value={form.branding.org_name}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, org_name: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Portal Title (Displayed in Header)
                </label>
                <input
                  type="text"
                  value={form.branding.portal_title}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, portal_title: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Division Subtitle (Admin Header)
                </label>
                <input
                  type="text"
                  value={form.branding.division_name}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, division_name: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  value={form.branding.tagline}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, tagline: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Official Support & Admissions Email
                </label>
                <input
                  type="email"
                  value={form.branding.support_email}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, support_email: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Admissions Hotline Number
                </label>
                <input
                  type="text"
                  value={form.branding.support_phone}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, support_phone: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Student WhatsApp Assistance Hotline
                </label>
                <input
                  type="text"
                  value={form.branding.whatsapp_number}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, whatsapp_number: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  24/7 Visa & Departure Emergency Helpline
                </label>
                <input
                  type="text"
                  value={form.branding.emergency_helpline}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, emergency_helpline: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Office Headquarters & Regional Desks
                </label>
                <input
                  type="text"
                  value={form.branding.office_address}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, office_address: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={form.branding.operating_hours}
                  onChange={(e) => setForm({
                    ...form,
                    branding: { ...form.branding, operating_hours: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 2: BROADCAST ANNOUNCEMENT */}
        {activeSection === 'broadcast' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-[#6A1B2E]" />
                  Live System Broadcast Banner
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  When enabled, this banner will appear at the top of the Student and Edu Admin portals in real-time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm({
                  ...form,
                  broadcast: { ...form.broadcast, is_active: !form.broadcast.is_active }
                })}
                className={`w-12 h-6 rounded-full transition-all relative flex items-center px-0.5 shrink-0 ${
                  form.broadcast.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  form.broadcast.is_active ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Announcement Message
                </label>
                <textarea
                  rows={3}
                  value={form.broadcast.message}
                  onChange={(e) => setForm({
                    ...form,
                    broadcast: { ...form.broadcast, message: e.target.value }
                  })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Alert Urgency / Style
                </label>
                <select
                  value={form.broadcast.urgency}
                  onChange={(e) => setForm({
                    ...form,
                    broadcast: { ...form.broadcast, urgency: e.target.value as any }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                >
                  <option value="info">Info (Blue Notice)</option>
                  <option value="warning">Warning (Amber Alert)</option>
                  <option value="urgent">Urgent (Red Critical)</option>
                  <option value="success">Success (Emerald Green)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Audience
                </label>
                <select
                  value={form.broadcast.target_audience}
                  onChange={(e) => setForm({
                    ...form,
                    broadcast: { ...form.broadcast, target_audience: e.target.value as any }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                >
                  <option value="all">All Portals (Students & Education Admins)</option>
                  <option value="students">Students Only</option>
                  <option value="admins">Education Admins Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Call-to-Action Link URL (Optional)
                </label>
                <input
                  type="text"
                  value={form.broadcast.link_url || ''}
                  onChange={(e) => setForm({
                    ...form,
                    broadcast: { ...form.broadcast, link_url: e.target.value }
                  })}
                  placeholder="/student/select-university or https://..."
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={form.broadcast.link_label || ''}
                  onChange={(e) => setForm({
                    ...form,
                    broadcast: { ...form.broadcast, link_label: e.target.value }
                  })}
                  placeholder="e.g. View Details"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Live Banner Preview</p>
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
                form.broadcast.urgency === 'urgent' ? 'bg-red-50 text-red-900 border-red-200' :
                form.broadcast.urgency === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                form.broadcast.urgency === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                'bg-blue-50 text-blue-900 border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 shrink-0" />
                  <span>{form.broadcast.message}</span>
                </div>
                {form.broadcast.link_label && (
                  <span className="px-2.5 py-1 bg-white rounded-lg shadow-2xs text-[11px] font-extrabold shrink-0">
                    {form.broadcast.link_label} →
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 3: FEE & INSTALLMENTS */}
        {activeSection === 'installments' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">Stage 1: Registration & Legalization Audit</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">1st Milestone</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fee Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={form.installments.stage_1_amount}
                      onChange={(e) => setForm({
                        ...form,
                        installments: { ...form.installments, stage_1_amount: Number(e.target.value) }
                      })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                    <select
                      value={form.installments.stage_1_currency}
                      onChange={(e) => setForm({
                        ...form,
                        installments: { ...form.installments, stage_1_currency: e.target.value }
                      })}
                      className="w-24 h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stage Description</label>
                  <input
                    type="text"
                    value={form.installments.stage_1_due_label}
                    onChange={(e) => setForm({
                      ...form,
                      installments: { ...form.installments, stage_1_due_label: e.target.value }
                    })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">Stage 3: Post-Visa Clearance Fee</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">3rd Milestone</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fee Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={form.installments.stage_3_amount}
                      onChange={(e) => setForm({
                        ...form,
                        installments: { ...form.installments, stage_3_amount: Number(e.target.value) }
                      })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                    <select
                      value={form.installments.stage_3_currency}
                      onChange={(e) => setForm({
                        ...form,
                        installments: { ...form.installments, stage_3_currency: e.target.value }
                      })}
                      className="w-24 h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stage Description</label>
                  <input
                    type="text"
                    value={form.installments.stage_3_due_label}
                    onChange={(e) => setForm({
                      ...form,
                      installments: { ...form.installments, stage_3_due_label: e.target.value }
                    })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tax / GST Percentage (%)
                </label>
                <input
                  type="number"
                  value={form.installments.tax_percentage}
                  onChange={(e) => setForm({
                    ...form,
                    installments: { ...form.installments, tax_percentage: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Refund Request Policy Window (Days)
                </label>
                <input
                  type="number"
                  value={form.installments.refund_policy_days}
                  onChange={(e) => setForm({
                    ...form,
                    installments: { ...form.installments, refund_policy_days: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 4: DOCUMENT POLICIES */}
        {activeSection === 'documents' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Minimum International Passport Validity (Months)
                </label>
                <input
                  type="number"
                  value={form.document_policy.min_passport_validity_months}
                  onChange={(e) => setForm({
                    ...form,
                    document_policy: { ...form.document_policy, min_passport_validity_months: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Maximum Upload File Size (MB per document)
                </label>
                <input
                  type="number"
                  value={form.document_policy.max_file_size_mb}
                  onChange={(e) => setForm({
                    ...form,
                    document_policy: { ...form.document_policy, max_file_size_mb: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { label: 'Mandatory Medium of Instruction (MOI) Certificate in English', key: 'require_moi_letter' as const, desc: 'Enforces MOI letter verification for waiver of IELTS/TOEFL in European admissions.' },
                { label: 'Mandatory Apostille Attestation for European Legalization', key: 'require_apostille_for_europe' as const, desc: 'Requires MEA/State Apostille before submission to NAWA, APS, or CIMEA.' },
                { label: 'Auto-Notify Assigned Counselor on Student Document Upload', key: 'auto_notify_counselor_on_upload' as const, desc: 'Sends immediate alert to the assigned admissions counselor when new files are submitted.' },
              ].map((item) => (
                <div key={item.key} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.label}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      document_policy: {
                        ...form.document_policy,
                        [item.key]: !form.document_policy[item.key]
                      }
                    })}
                    className={`w-10 h-5 rounded-full transition-all relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                      form.document_policy[item.key] ? 'bg-[#6A1B2E]' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      form.document_policy[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION 5: VISA & MOCK INTERVIEW */}
        {activeSection === 'visa' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  1-on-1 Embassy Mock Interview Sessions Included
                </label>
                <input
                  type="number"
                  value={form.visa_mock.mock_sessions_included}
                  onChange={(e) => setForm({
                    ...form,
                    visa_mock: { ...form.visa_mock, mock_sessions_included: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Minimum Booking Lead Time (Days in Advance)
                </label>
                <input
                  type="number"
                  value={form.visa_mock.booking_lead_time_days}
                  onChange={(e) => setForm({
                    ...form,
                    visa_mock: { ...form.visa_mock, booking_lead_time_days: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Emergency Visa Officer Direct Line
                </label>
                <input
                  type="text"
                  value={form.visa_mock.emergency_visa_helpline}
                  onChange={(e) => setForm({
                    ...form,
                    visa_mock: { ...form.visa_mock, emergency_visa_helpline: e.target.value }
                  })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 6: FEATURE TOGGLES */}
        {activeSection === 'features' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {[
              { label: 'Public Interactive European Fee Calculator', key: 'enable_landing_calculator' as const, desc: 'Displays the dynamic Tuition + Legalization + Living Cost calculator on the main landing page (#calculator).' },
              { label: 'Direct University Course Application for Students', key: 'enable_direct_course_application' as const, desc: 'Allows students to browse the European universities catalog and submit direct program applications.' },
              { label: 'Student Self-Service Counselor Meeting Booking', key: 'enable_student_meeting_self_booking' as const, desc: 'Enables students to book 1-on-1 video consultations with assigned admissions counselors.' },
              { label: 'Floating WhatsApp Admissions Assistant', key: 'enable_whatsapp_support_widget' as const, desc: 'Shows the floating WhatsApp support button on student portal and public landing page.' },
              { label: 'System Scheduled Maintenance Notice', key: 'enable_maintenance_banner' as const, desc: 'Displays a scheduled maintenance notice across the platform for server upgrades.' },
            ].map((feature) => (
              <div key={feature.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-slate-900">{feature.label}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{feature.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    features: {
                      ...form.features,
                      [feature.key]: !form.features[feature.key]
                    }
                  })}
                  className={`w-11 h-6 rounded-full transition-all relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                    form.features[feature.key] ? 'bg-[#6A1B2E]' : 'bg-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    form.features[feature.key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* SECTION 7: FEREX DIGITAL AGENCY */}
        {activeSection === 'digital' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white border border-indigo-500/30 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 mb-2 inline-block">
                    Division Console Synergy
                  </span>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-400" />
                    FEREX Digital Agency Division
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Configure web development, mobile apps, UI/UX design, cloud infrastructure, and client portal SLAs directly inside the FEREX ecosystem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.href = '/digital/settings'}
                  className="h-9 px-4 rounded-xl text-xs font-black bg-indigo-500 hover:bg-indigo-600 text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5" /> Open Digital Console Settings
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Client Portal SLA</span>
                <p className="text-sm font-black text-slate-900">24 Hours Guaranteed</p>
                <p className="text-[11px] text-slate-500 font-medium">Turnaround guarantee for client tickets and change requests.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Sprint Cadence</span>
                <p className="text-sm font-black text-slate-900">2-Week Agile Sprints</p>
                <p className="text-[11px] text-slate-500 font-medium">Standard engineering milestone release with QA sign-offs.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Self-Service Access</span>
                <p className="text-sm font-black text-emerald-600">Active & Verified</p>
                <p className="text-[11px] text-slate-500 font-medium">Clients can self-manage invoices, assets, and meetings in-portal.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 8: RIMI FROZEN LOGISTICS */}
        {activeSection === 'rimi' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl text-white border border-cyan-500/30 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30 mb-2 inline-block">
                    Cold Chain Synergy
                  </span>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-cyan-400" />
                    Rimi Frozen Distribution Division
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Configure cold room safety temperatures (-18°C), wholesale minimum order policies, credit terms, and customer broadcast updates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.href = '/rimi/settings'}
                  className="h-9 px-4 rounded-xl text-xs font-black bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5" /> Open Rimi Cold Console
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Cold Room Threshold</span>
                <p className="text-sm font-black text-blue-600">-18.0°C Safe Zone</p>
                <p className="text-[11px] text-slate-500 font-medium">Auto-alarm trigger if temperature rises above threshold.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Wholesale MOV</span>
                <p className="text-sm font-black text-slate-900">₹5,000 Min Order</p>
                <p className="text-[11px] text-slate-500 font-medium">Enforced for automated B2B customer portal checkout.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Credit Terms Window</span>
                <p className="text-sm font-black text-emerald-600">15-Day Net Terms</p>
                <p className="text-[11px] text-slate-500 font-medium">Automatic invoice reconciliation on delivery dispatch.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400">
            Last published: {new Date(form.updated_at).toLocaleString()}
          </p>
          <button
            type="submit"
            disabled={isSaving || loading}
            className="flex items-center gap-2 h-10 px-6 bg-[#6A1B2E] text-white text-xs font-extrabold rounded-xl hover:bg-[#4A101E] transition-all shadow-sm active:scale-98"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Publishing Changes...' : 'Save & Publish All Customizations'}
          </button>
        </div>
      </form>
    </div>
  );
};
