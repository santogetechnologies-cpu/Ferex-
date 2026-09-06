import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, CheckCircle2, Shield, Ship, DollarSign, Megaphone,
  Anchor, Building2, Save, RotateCcw, Plus, Trash2, Sliders, Sparkles,
  AlertTriangle, Phone, Globe, FileText, Check, Clock, Compass, FileCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useTradeConfig } from '../../hooks/useTradeConfig';
import type { TradeCustomizationConfig, TradeFreightCorridor } from '../../lib/api/tradeConfig';

export const TradeSettings: React.FC = () => {
  const { config, updateConfig, resetToDefault, loading } = useTradeConfig();
  const [form, setForm] = useState<TradeCustomizationConfig>(config);
  const [activeTab, setActiveTab] = useState<'branding' | 'incoterms' | 'client_policies' | 'broadcast' | 'corridors'>('branding');
  const [toast, setToast] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setForm(config);
  }, [config]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateConfig(form);
      showToastMsg('Global Trade customs & corridor configurations published successfully!');
    } catch (err) {
      console.error('Error saving Trade settings:', err);
      showToastMsg('Failed to save Trade settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all Global Trade settings to system defaults?')) {
      setIsSaving(true);
      try {
        const res = await resetToDefault();
        setForm(res);
        showToastMsg('Trade settings reset to defaults.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddCorridor = () => {
    const newCorridor: TradeFreightCorridor = {
      id: `cor-${Date.now()}`,
      corridor_name: 'New Ocean Route',
      port_of_loading: 'Origin Port (e.g. INNSA)',
      port_of_discharge: 'Destination Port (e.g. NLRTM)',
      transit_time_days: '20 - 25 Days',
      carrier_line: 'Major Carrier Line',
      is_active: true
    };
    setForm({
      ...form,
      corridors: [...form.corridors, newCorridor]
    });
  };

  const handleRemoveCorridor = (id: string) => {
    setForm({
      ...form,
      corridors: form.corridors.filter(c => c.id !== id)
    });
  };

  const TABS = [
    { id: 'branding', label: 'Entity & Port Desk', icon: Building2 },
    { id: 'incoterms', label: 'Incoterms & Banking Policies', icon: Anchor },
    { id: 'client_policies', label: 'Client Portal & Cargo Rules', icon: Sliders },
    { id: 'broadcast', label: 'Live Maritime Broadcast', icon: Megaphone, badge: form.broadcast?.is_active ? 'Live' : undefined },
    { id: 'corridors', label: 'Shipping Corridors & Routes', icon: Ship, count: form.corridors?.length },
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
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0A1128] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-500/30 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
              Cross-Border Maritime Terminal
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              Real-time Sync to Trade Client Portal & Port Desks
            </span>
          </div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Global Trade System Settings & Customs Engine
          </h1>
          <p className="text-xs font-medium text-slate-300 mt-1 max-w-2xl">
            Configure Incoterms defaults (CIF/FOB), Letter of Credit (LC) advising banking standards, port corridors, and real-time trade partner notices.
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
            className="h-9 px-4 rounded-xl text-xs font-black text-slate-900 bg-blue-400 hover:bg-blue-300 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/70 gap-2 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-900 bg-white shadow-2xs font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 text-blue-600" />
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

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. BRANDING & ENTITY */}
        {activeTab === 'branding' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                Corporate Entity & Port Desk Identity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Registered Trade Entity Name
                  </label>
                  <input
                    type="text"
                    value={form.branding.entity_name}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, entity_name: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    IEC (Import Export Code)
                  </label>
                  <input
                    type="text"
                    value={form.branding.iec_code}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, iec_code: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Portal Title (Client Header)
                  </label>
                  <input
                    type="text"
                    value={form.branding.portal_title}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, portal_title: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Corporate Registration Code
                  </label>
                  <input
                    type="text"
                    value={form.branding.corporate_reg_code}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, corporate_reg_code: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={form.branding.tagline}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, tagline: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Customs & Trade Desk Email
                  </label>
                  <input
                    type="email"
                    value={form.branding.support_email}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, support_email: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Shipping & Port Dispatch Hotline
                  </label>
                  <input
                    type="text"
                    value={form.branding.shipping_hotline}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, shipping_hotline: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    WhatsApp Global Trade Desk
                  </label>
                  <input
                    type="text"
                    value={form.branding.whatsapp_trade_desk}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, whatsapp_trade_desk: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Default Trade Base Currency
                  </label>
                  <select
                    value={form.branding.default_currency}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, default_currency: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">$ (USD - US Dollar)</option>
                    <option value="EUR">€ (EUR - Euro)</option>
                    <option value="INR">₹ (INR - Indian Rupee)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Port Headquarters & Container Terminal Address
                  </label>
                  <input
                    type="text"
                    value={form.branding.port_headquarters}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, port_headquarters: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 2. INCOTERMS & BANKING POLICIES */}
        {activeTab === 'incoterms' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-blue-600" />
                Incoterms 2020 & Letter of Credit (LC) Standards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Default Incoterm
                  </label>
                  <select
                    value={form.trade_policies.default_incoterm}
                    onChange={(e) => setForm({
                      ...form,
                      trade_policies: { ...form.trade_policies, default_incoterm: e.target.value as any }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                    <option value="FOB">FOB (Free on Board)</option>
                    <option value="CFR">CFR (Cost and Freight)</option>
                    <option value="DDP">DDP (Delivered Duty Paid)</option>
                    <option value="EXW">EXW (Ex Works)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Customs Clearance SLA (Business Days)
                  </label>
                  <input
                    type="number"
                    value={form.trade_policies.customs_clearance_sla_days}
                    onChange={(e) => setForm({
                      ...form,
                      trade_policies: { ...form.trade_policies, customs_clearance_sla_days: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    LC Advising Banking Consortium
                  </label>
                  <input
                    type="text"
                    value={form.trade_policies.lc_advising_bank_standard}
                    onChange={(e) => setForm({
                      ...form,
                      trade_policies: { ...form.trade_policies, lc_advising_bank_standard: e.target.value }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    key: 'mandatory_digital_bl_stamp' as const,
                    title: 'Mandatory Digital Bill of Lading (eBL) Blockchain Verification',
                    desc: 'Enforces cryptographically signed eBL tokens prior to cargo release at destination ports.'
                  },
                  {
                    key: 'mandatory_container_seal_check' as const,
                    title: 'Mandatory High-Security ISO 17712 Container Seal Check',
                    desc: 'Requires verified customs seal barcode scanning at both Port of Loading and Discharge.'
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
                        trade_policies: {
                          ...form.trade_policies,
                          [item.key]: !form.trade_policies[item.key]
                        }
                      })}
                      className={`w-10 h-5 rounded-full transition-all relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                        form.trade_policies[item.key] ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        form.trade_policies[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* 3. CLIENT PORTAL & CARGO RULES */}
        {activeTab === 'client_policies' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                Trade Partner Self-Service & Cargo Access
              </h2>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                  LC Draft Review Grace Window (Days)
                </label>
                <input
                  type="number"
                  value={form.client_policies.lc_draft_review_window_days}
                  onChange={(e) => setForm({
                    ...form,
                    client_policies: { ...form.client_policies, lc_draft_review_window_days: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    key: 'allow_instant_cert_downloads' as const,
                    title: 'Allow Instant Phytosanitary, Origin & Quality Certificate Downloads',
                    desc: 'Enables verified buyers to download attested certificate PDF copies from the portal.'
                  },
                  {
                    key: 'allow_client_shipping_instructions' as const,
                    title: 'Allow In-Portal Shipping Instruction (SI) Dossier Submission',
                    desc: 'Buyers can upload notify party details, container packing preferences, and consignee data directly.'
                  },
                  {
                    key: 'enable_live_cargo_milestones' as const,
                    title: 'Live Ocean Carrier Milestone GPS Tracking',
                    desc: 'Displays real-time vessel position, transshipment port calls, and estimated time of arrival (ETA).'
                  },
                  {
                    key: 'allow_online_demurrage_clearance' as const,
                    title: 'Online Demurrage & Container Detention Waiver Tracking',
                    desc: 'Provides instant calculation of port free days and online terminal fee settlement.'
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
                        form.client_policies[item.key] ? 'bg-blue-600' : 'bg-slate-300'
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

        {/* 4. BROADCAST BANNER */}
        {activeTab === 'broadcast' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    Live Ocean Freight & Maritime Broadcast Ticker
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Broadcast vessel schedules, port weather notices, and customs tariff updates.
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
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, message: e.target.value } })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Alert Urgency Style
                  </label>
                  <select
                    value={form.broadcast.urgency}
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, urgency: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="info">Info (Blue Maritime Update)</option>
                    <option value="warning">Warning (Amber Port Congestion)</option>
                    <option value="urgent">Urgent (Red Weather / Blank Sailing)</option>
                    <option value="success">Success (Emerald Berth Clearance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Target Audience
                  </label>
                  <select
                    value={form.broadcast.target_audience}
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, target_audience: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All (Trade Partners & Terminal Operators)</option>
                    <option value="clients">Clients / Buyers Only</option>
                    <option value="staff">Customs & Shipping Staff Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Call-to-Action Link URL
                  </label>
                  <input
                    type="text"
                    value={form.broadcast.link_url || ''}
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, link_url: e.target.value } })}
                    placeholder="/trade/shipments or https://..."
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={form.broadcast.link_label || ''}
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, link_label: e.target.value } })}
                    placeholder="e.g. Track Vessel"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 5. SHIPPING CORRIDORS & ROUTES */}
        {activeTab === 'corridors' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Maritime Corridors & Carrier Lines</h3>
                <p className="text-xs text-slate-500 font-medium">Configure international shipping lanes, origin/discharge ports, and transit lead times.</p>
              </div>
              <Button
                type="button"
                onClick={handleAddCorridor}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Shipping Corridor
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.corridors.map((cor, idx) => (
                <Card key={cor.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={cor.corridor_name}
                        onChange={(e) => {
                          const updated = [...form.corridors];
                          updated[idx].corridor_name = e.target.value;
                          setForm({ ...form, corridors: updated });
                        }}
                        className="text-xs font-black text-slate-900 w-full bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 mb-1"
                      />
                      <input
                        type="text"
                        value={cor.carrier_line}
                        onChange={(e) => {
                          const updated = [...form.corridors];
                          updated[idx].carrier_line = e.target.value;
                          setForm({ ...form, corridors: updated });
                        }}
                        className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-44"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCorridor(cor.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Port of Loading:</span>
                      <input
                        type="text"
                        value={cor.port_of_loading}
                        onChange={(e) => {
                          const updated = [...form.corridors];
                          updated[idx].port_of_loading = e.target.value;
                          setForm({ ...form, corridors: updated });
                        }}
                        className="w-full font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Port of Discharge:</span>
                      <input
                        type="text"
                        value={cor.port_of_discharge}
                        onChange={(e) => {
                          const updated = [...form.corridors];
                          updated[idx].port_of_discharge = e.target.value;
                          setForm({ ...form, corridors: updated });
                        }}
                        className="w-full font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Estimated Transit Time:</span>
                    <input
                      type="text"
                      value={cor.transit_time_days}
                      onChange={(e) => {
                        const updated = [...form.corridors];
                        updated[idx].transit_time_days = e.target.value;
                        setForm({ ...form, corridors: updated });
                      }}
                      className="w-full font-black text-emerald-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                    />
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
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-10 px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Publishing Changes...' : 'Save & Publish All Trade Configurations'}
          </Button>
        </div>
      </form>
    </div>
  );
};
