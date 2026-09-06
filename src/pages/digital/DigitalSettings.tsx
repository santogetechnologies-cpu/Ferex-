import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Shield, Bell, Key, Globe, CheckCircle2, Save,
  Megaphone, Sliders, DollarSign, Layers, Sparkles, RotateCcw,
  Plus, Trash2, Check, ExternalLink, Code2, Smartphone, Palette, TrendingUp
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useDigitalConfig } from '../../hooks/useDigitalConfig';
import type { DigitalCustomizationConfig, DigitalServicePackage } from '../../lib/api/digitalConfig';

export const DigitalSettings: React.FC = () => {
  const { config, updateConfig, resetToDefault, loading } = useDigitalConfig();
  const [form, setForm] = useState<DigitalCustomizationConfig>(config);
  const [activeTab, setActiveTab] = useState<'branding' | 'client_policies' | 'delivery' | 'broadcast' | 'services'>('branding');
  const [toast, setToast] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setForm(config);
  }, [config]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateConfig(form);
      showToast('FEREX Digital configurations & client policies published successfully!');
    } catch (err) {
      console.error('Error saving digital settings:', err);
      showToast('Failed to save digital configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all FEREX Digital settings to agency baseline defaults?')) {
      setIsSaving(true);
      try {
        const res = await resetToDefault();
        setForm(res);
        showToast('Settings reset to defaults.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddService = () => {
    const newService: DigitalServicePackage = {
      id: `srv-${Date.now()}`,
      title: 'New Digital Service Package',
      category: 'Engineering',
      description: 'Custom development and deployment service tailored for enterprise clients.',
      starting_price: '₹1,00,000 / $1,200',
      estimated_timeline: '3 - 6 Weeks',
      deliverables: ['Production Deliverables', 'Documentation & Handover', '30 Days Warranty Support'],
      is_active: true
    };
    setForm({
      ...form,
      services: [...form.services, newService]
    });
  };

  const handleRemoveService = (id: string) => {
    setForm({
      ...form,
      services: form.services.filter(s => s.id !== id)
    });
  };

  const TABS = [
    { id: 'branding', label: 'Agency Branding & Desks', icon: Globe },
    { id: 'client_policies', label: 'Client Portal & SLAs', icon: Sliders },
    { id: 'delivery', label: 'Sprint & Quality Gates', icon: Layers },
    { id: 'broadcast', label: 'Broadcast Banner', icon: Megaphone, badge: form.broadcast?.is_active ? 'Live' : undefined },
    { id: 'services', label: 'Service Offerings', icon: Sparkles, count: form.services?.length },
  ] as const;

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#24020B] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-[#E6CA9E]/40"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#24020B] via-[#3B0C17] to-[#50001D] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#6A1B2E]/50 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6CA9E]/20 text-[#E6CA9E] text-[10px] font-black uppercase tracking-wider border border-[#E6CA9E]/30">
              Agency Operations Engine
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              Real-time Sync to Client Portal & Agency Staff
            </span>
          </div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#E6CA9E]" />
            FEREX Digital Agency Console Settings
          </h1>
          <p className="text-xs font-medium text-slate-300 mt-1 max-w-2xl">
            Configure white-label agency branding, client portal self-service permissions, sprint quality gates, client SLAs, and live announcements.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
            className="h-9 px-4 rounded-xl text-xs font-black text-[#24020B] bg-[#E6CA9E] hover:bg-[#d8b988] transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200/70 gap-2 overflow-x-auto pb-0.5">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-[#6A1B2E] text-[#6A1B2E] bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
              {t.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-black">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. BRANDING & IDENTITY */}
        {activeTab === 'branding' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                Agency Brand Identity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Agency Legal Name
                  </label>
                  <input
                    type="text"
                    value={form.branding.agency_name}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, agency_name: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Portal Title (Header Display)
                  </label>
                  <input
                    type="text"
                    value={form.branding.portal_title}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, portal_title: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Agency Tagline
                  </label>
                  <input
                    type="text"
                    value={form.branding.tagline}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, tagline: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={form.branding.support_email}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, support_email: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Client Hotline Number
                  </label>
                  <input
                    type="text"
                    value={form.branding.support_phone}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, support_phone: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Client WhatsApp Support Line
                  </label>
                  <input
                    type="text"
                    value={form.branding.whatsapp_number}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, whatsapp_number: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Default Invoicing Currency
                  </label>
                  <select
                    value={form.branding.default_currency}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, default_currency: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="INR">₹ (INR - Indian Rupee)</option>
                    <option value="EUR">€ (EUR - Euro)</option>
                    <option value="USD">$ (USD - US Dollar)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    HQ & Regional Tech Desks
                  </label>
                  <input
                    type="text"
                    value={form.branding.office_address}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, office_address: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={form.branding.operating_hours}
                    onChange={e => setForm({ ...form, branding: { ...form.branding, operating_hours: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 2. CLIENT PORTAL POLICIES & SLAS */}
        {activeTab === 'client_policies' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                Client Self-Service & SLAs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Guaranteed SLA Response Window (Hours)
                  </label>
                  <input
                    type="number"
                    value={form.client_policies.guaranteed_sla_response_hours}
                    onChange={e => setForm({
                      ...form,
                      client_policies: { ...form.client_policies, guaranteed_sla_response_hours: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Client Deliverable Review Window (Days)
                  </label>
                  <input
                    type="number"
                    value={form.client_policies.client_review_window_days}
                    onChange={e => setForm({
                      ...form,
                      client_policies: { ...form.client_policies, client_review_window_days: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    key: 'allow_self_service_payments' as const,
                    title: 'Enable Client Self-Service Invoicing & Online Payments',
                    desc: 'Clients can directly pay invoices, download receipts, and view payment history in the portal.'
                  },
                  {
                    key: 'allow_client_change_requests' as const,
                    title: 'Allow Clients to Submit In-Portal Change Requests',
                    desc: 'Enables client project managers to create change requests and scope amendments from their dashboard.'
                  },
                  {
                    key: 'allow_instant_asset_downloads' as const,
                    title: 'Instant Deliverables & Code Asset Download Access',
                    desc: 'Allows verified clients to download Figma assets, builds, and deliverables without waiting for manual email delivery.'
                  },
                  {
                    key: 'require_milestone_signoff' as const,
                    title: 'Mandatory Client Milestone Sign-off Before Sprint Release',
                    desc: 'Requires the client contact to approve previous sprint deliverables before unlocking next phase.'
                  }
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        client_policies: {
                          ...form.client_policies,
                          [item.key]: !form.client_policies[item.key]
                        }
                      })}
                      className={`w-10 h-5 rounded-full transition-all relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                        form.client_policies[item.key] ? 'bg-[#6A1B2E]' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        form.client_policies[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* 3. SPRINT & QUALITY GATES */}
        {activeTab === 'delivery' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                Engineering Sprint & Quality Gates
              </h2>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                  Default Sprint Cycle Length
                </label>
                <select
                  value={form.delivery_rules.default_sprint_weeks}
                  onChange={e => setForm({
                    ...form,
                    delivery_rules: { ...form.delivery_rules, default_sprint_weeks: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                >
                  <option value={1}>1 Week (Rapid prototyping)</option>
                  <option value={2}>2 Weeks (Standard agile sprint)</option>
                  <option value={3}>3 Weeks (Enterprise release cycle)</option>
                  <option value={4}>4 Weeks (Monthly milestone cadence)</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    key: 'require_qa_signoff_before_delivery' as const,
                    title: 'Mandatory QA Lead Sign-off Before Deliverable Handover',
                    desc: 'Blocks project status from moving to "Completed" until internal QA audit passes.'
                  },
                  {
                    key: 'enable_automated_task_digests' as const,
                    title: 'Automated Daily Task Digests to Client Managers',
                    desc: 'Dispatches automated end-of-day sprint progress updates and completed ticket summaries.'
                  },
                  {
                    key: 'strict_repository_branch_protection' as const,
                    title: 'Strict Git Branch Protection & Mandatory Code Reviews',
                    desc: 'Enforces PR approvals and passing test suites before merging into production branches.'
                  }
                ].map((rule) => (
                  <div key={rule.key} className="flex items-start justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{rule.title}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{rule.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        delivery_rules: {
                          ...form.delivery_rules,
                          [rule.key]: !form.delivery_rules[rule.key]
                        }
                      })}
                      className={`w-10 h-5 rounded-full transition-all relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                        form.delivery_rules[rule.key] ? 'bg-[#6A1B2E]' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        form.delivery_rules[rule.key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* 4. BROADCAST BANNER */}
        {activeTab === 'broadcast' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-[#6A1B2E]" />
                    Live Digital Agency Broadcast Ticker
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Broadcast announcements across Digital Agency Admin and Client Portals.
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    value={form.broadcast.message}
                    onChange={e => setForm({ ...form, broadcast: { ...form.broadcast, message: e.target.value } })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Alert Urgency / Color Style
                  </label>
                  <select
                    value={form.broadcast.urgency}
                    onChange={e => setForm({ ...form, broadcast: { ...form.broadcast, urgency: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="info">Info (Blue Notice)</option>
                    <option value="warning">Warning (Amber Maintenance)</option>
                    <option value="urgent">Urgent (Red Critical)</option>
                    <option value="success">Success (Emerald Uptime)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Target Audience
                  </label>
                  <select
                    value={form.broadcast.target_audience}
                    onChange={e => setForm({ ...form, broadcast: { ...form.broadcast, target_audience: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="all">All Portals (Agency Staff & Clients)</option>
                    <option value="clients">Clients Only</option>
                    <option value="staff">Agency Staff Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Call-to-Action Link URL
                  </label>
                  <input
                    type="text"
                    value={form.broadcast.link_url || ''}
                    onChange={e => setForm({ ...form, broadcast: { ...form.broadcast, link_url: e.target.value } })}
                    placeholder="/digital/projects or https://..."
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={form.broadcast.link_label || ''}
                    onChange={e => setForm({ ...form, broadcast: { ...form.broadcast, link_label: e.target.value } })}
                    placeholder="e.g. View Sprints"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 5. SERVICE CATALOG & PACKAGES */}
        {activeTab === 'services' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Active Service Packages & Offerings</h3>
                <p className="text-xs text-slate-500 font-medium">Configure service categories, standard pricing, and deliverables available to clients.</p>
              </div>
              <Button
                type="button"
                onClick={handleAddService}
                size="sm"
                className="bg-[#6A1B2E] text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Service Package
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.services.map((srv, idx) => (
                <Card key={srv.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={srv.title}
                        onChange={e => {
                          const updated = [...form.services];
                          updated[idx].title = e.target.value;
                          setForm({ ...form, services: updated });
                        }}
                        className="text-xs font-black text-slate-900 w-full bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 mb-1"
                      />
                      <input
                        type="text"
                        value={srv.category}
                        onChange={e => {
                          const updated = [...form.services];
                          updated[idx].category = e.target.value;
                          setForm({ ...form, services: updated });
                        }}
                        className="text-[10px] font-extrabold uppercase text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-32"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(srv.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={srv.description}
                    onChange={e => {
                      const updated = [...form.services];
                      updated[idx].description = e.target.value;
                      setForm({ ...form, services: updated });
                    }}
                    className="w-full text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200"
                  />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Starting Price:</span>
                      <input
                        type="text"
                        value={srv.starting_price}
                        onChange={e => {
                          const updated = [...form.services];
                          updated[idx].starting_price = e.target.value;
                          setForm({ ...form, services: updated });
                        }}
                        className="w-full font-black text-emerald-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Timeline:</span>
                      <input
                        type="text"
                        value={srv.estimated_timeline}
                        onChange={e => {
                          const updated = [...form.services];
                          updated[idx].estimated_timeline = e.target.value;
                          setForm({ ...form, services: updated });
                        }}
                        className="w-full font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400">
            Last published: {new Date(form.updated_at).toLocaleString()}
          </p>
          <Button
            type="submit"
            disabled={isSaving || loading}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-black h-10 px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Publishing Changes...' : 'Save & Publish All Digital Configurations'}
          </Button>
        </div>
      </form>
    </div>
  );
};
