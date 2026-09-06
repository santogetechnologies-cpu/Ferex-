import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, CheckCircle2, Thermometer, Megaphone,
  Truck, Building2, Save, RotateCcw, Plus, Trash2, Sliders
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useRimiConfig } from '../../hooks/useRimiConfig';
import type { RimiCustomizationConfig, RimiDistributionZone } from '../../lib/api/rimiConfig';

type RimiTab = 'branding' | 'cold_chain' | 'customer_policies' | 'broadcast' | 'zones';
interface TabItem {
  id: RimiTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
}

export const RimiSettings: React.FC = () => {
  const { config, updateConfig, resetToDefault, loading } = useRimiConfig();
  const [form, setForm] = useState<RimiCustomizationConfig>(config);
  const [activeTab, setActiveTab] = useState<RimiTab>('branding');
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
      showToastMsg('Rimi Frozen Cold Chain configuration published successfully!');
    } catch (err) {
      console.error('Error saving Rimi settings:', err);
      showToastMsg('Failed to save Rimi configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all Rimi Frozen Cold Chain settings to system defaults?')) {
      setIsSaving(true);
      try {
        const res = await resetToDefault();
        setForm(res);
        showToastMsg('Settings reset to defaults.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddZone = () => {
    const newZone: RimiDistributionZone = {
      id: `zone-${Date.now()}`,
      zone_name: 'New Cold Corridor',
      hub_city: 'Regional Cold Port',
      covered_regions: ['Metro Area', 'Industrial Estate'],
      standard_delivery_days: '24 - 48 Hours',
      min_delivery_charge: 0,
      is_active: true
    };
    setForm({
      ...form,
      zones: [...form.zones, newZone]
    });
  };

  const handleRemoveZone = (id: string) => {
    setForm({
      ...form,
      zones: form.zones.filter(z => z.id !== id)
    });
  };

  const TABS: TabItem[] = [
    { id: 'branding', label: 'Entity & Hub Branding', icon: Building2 },
    { id: 'cold_chain', label: 'Cold Chain & Safety Limits', icon: Thermometer },
    { id: 'customer_policies', label: 'Customer Order Policies', icon: Sliders },
    { id: 'broadcast', label: 'Live Broadcast Ticker', icon: Megaphone, badge: form.broadcast?.is_active ? 'Live' : undefined },
    { id: 'zones', label: 'Distribution Hubs & Routes', icon: Truck, count: form.zones?.length },
  ];

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

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1A0B2E] via-[#2D124D] to-[#1E1B4B] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-500/30 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
              Sub-Zero Logistics Engine
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              Live Sync to Wholesale Customer Portal & Reefer Fleet
            </span>
          </div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Rimi Frozen Cold Chain System Settings
          </h1>
          <p className="text-xs font-medium text-slate-300 mt-1 max-w-2xl">
            Configure cold room safety thresholds (-18°C), minimum wholesale order values, credit terms, and live customer broadcast announcements.
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
            className="h-9 px-4 rounded-xl text-xs font-black text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
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
                  ? 'border-indigo-600 text-indigo-900 bg-white shadow-2xs font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 text-indigo-600" />
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
                Corporate Entity & Cold Chain Brand
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Registered Corporate Entity
                  </label>
                  <input
                    type="text"
                    value={form.branding.entity_name}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, entity_name: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    GSTIN Registration Code
                  </label>
                  <input
                    type="text"
                    value={form.branding.gstin_code}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, gstin_code: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Portal Title (Customer Portal Header)
                  </label>
                  <input
                    type="text"
                    value={form.branding.portal_title}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, portal_title: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Brand Tagline
                  </label>
                  <input
                    type="text"
                    value={form.branding.tagline}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, tagline: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Orders & Dispatch Email
                  </label>
                  <input
                    type="email"
                    value={form.branding.support_email}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, support_email: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Dispatch Logistics Hotline
                  </label>
                  <input
                    type="text"
                    value={form.branding.dispatch_hotline}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, dispatch_hotline: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Wholesale WhatsApp Order Desk
                  </label>
                  <input
                    type="text"
                    value={form.branding.whatsapp_order_desk}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, whatsapp_order_desk: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Base Currency
                  </label>
                  <select
                    value={form.branding.base_currency}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, base_currency: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INR">₹ (INR - Indian Rupee)</option>
                    <option value="EUR">€ (EUR - Euro)</option>
                    <option value="USD">$ (USD - US Dollar)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Central Cold Storage Hub Address
                  </label>
                  <input
                    type="text"
                    value={form.branding.office_hub_address}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, office_hub_address: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Operating & Dispatch Hours
                  </label>
                  <input
                    type="text"
                    value={form.branding.operating_hours}
                    onChange={(e) => setForm({ ...form, branding: { ...form.branding, operating_hours: e.target.value } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 2. COLD CHAIN & SAFETY LIMITS */}
        {activeTab === 'cold_chain' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-blue-600" />
                Temperature Safety Thresholds & Quality Control
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/70 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-blue-900">Cold Room Max Temp</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={form.cold_chain.cold_room_max_temp}
                      onChange={(e) => setForm({
                        ...form,
                        cold_chain: { ...form.cold_chain, cold_room_max_temp: Number(e.target.value) }
                      })}
                      className="w-full h-9 px-3 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-900"
                    />
                    <span className="text-xs font-black text-blue-900">°C</span>
                  </div>
                  <p className="text-[10px] text-blue-700 font-semibold">Standard: -18.0°C</p>
                </div>

                <div className="p-4 bg-cyan-50/50 rounded-xl border border-cyan-200/70 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-cyan-900">Reefer Van Max Temp</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={form.cold_chain.reefer_vehicle_max_temp}
                      onChange={(e) => setForm({
                        ...form,
                        cold_chain: { ...form.cold_chain, reefer_vehicle_max_temp: Number(e.target.value) }
                      })}
                      className="w-full h-9 px-3 bg-white border border-cyan-300 rounded-lg text-xs font-black text-cyan-900"
                    />
                    <span className="text-xs font-black text-cyan-900">°C</span>
                  </div>
                  <p className="text-[10px] text-cyan-700 font-semibold">Standard: -15.0°C</p>
                </div>

                <div className="p-4 bg-red-50/50 rounded-xl border border-red-200/70 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-red-900">Critical Alarm Trigger</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={form.cold_chain.critical_alarm_temp}
                      onChange={(e) => setForm({
                        ...form,
                        cold_chain: { ...form.cold_chain, critical_alarm_temp: Number(e.target.value) }
                      })}
                      className="w-full h-9 px-3 bg-white border border-red-300 rounded-lg text-xs font-black text-red-900"
                    />
                    <span className="text-xs font-black text-red-900">°C</span>
                  </div>
                  <p className="text-[10px] text-red-700 font-semibold">Alert fires if temp exceeds this</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    IoT Sensor Log Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    value={form.cold_chain.temp_log_interval_mins}
                    onChange={(e) => setForm({
                      ...form,
                      cold_chain: { ...form.cold_chain, temp_log_interval_mins: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Batch Expiry Warning Cutoff (Days Prior)
                  </label>
                  <input
                    type="number"
                    value={form.cold_chain.expiry_warning_threshold_days}
                    onChange={(e) => setForm({
                      ...form,
                      cold_chain: { ...form.cold_chain, expiry_warning_threshold_days: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 3. CUSTOMER ORDERING POLICIES */}
        {activeTab === 'customer_policies' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                Wholesale Customer Order Rules & Credit Limits
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Minimum Order Value (MOV in ₹)
                  </label>
                  <input
                    type="number"
                    value={form.customer_policies.min_order_value}
                    onChange={(e) => setForm({
                      ...form,
                      customer_policies: { ...form.customer_policies, min_order_value: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Standard Delivery Lead Time (Hours)
                  </label>
                  <input
                    type="number"
                    value={form.customer_policies.standard_delivery_lead_hours}
                    onChange={(e) => setForm({
                      ...form,
                      customer_policies: { ...form.customer_policies, standard_delivery_lead_hours: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Credit Terms Payment Window (Days)
                  </label>
                  <input
                    type="number"
                    value={form.customer_policies.credit_terms_days}
                    onChange={(e) => setForm({
                      ...form,
                      customer_policies: { ...form.customer_policies, credit_terms_days: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Order Cancellation Grace Window (Hours)
                  </label>
                  <input
                    type="number"
                    value={form.customer_policies.order_cancellation_window_hours}
                    onChange={(e) => setForm({
                      ...form,
                      customer_policies: { ...form.customer_policies, order_cancellation_window_hours: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    key: 'allow_credit_terms' as const,
                    title: 'Enable Net-Credit Terms for Verified Retailers / Wholesalers',
                    desc: 'Allows approved wholesale accounts to place purchase orders without immediate payment.'
                  },
                  {
                    key: 'auto_generate_eway_bill' as const,
                    title: 'Automated GST E-Way Bill & Tax Invoice Generation',
                    desc: 'Generates compliant GST tax invoice PDF with QR code upon dispatch confirmation.'
                  },
                  {
                    key: 'allow_customer_stock_reservation' as const,
                    title: 'Allow Customers to Reserve Stock for Scheduled Dispatch',
                    desc: 'Locks product inventory in cold storage upon cart checkout for up to 48 hours.'
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
                        customer_policies: {
                          ...form.customer_policies,
                          [item.key]: !form.customer_policies[item.key]
                        }
                      })}
                      className={`w-10 h-5 rounded-full transition-all relative flex items-center px-0.5 shrink-0 mt-0.5 ${
                        form.customer_policies[item.key] ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        form.customer_policies[item.key] ? 'translate-x-5' : 'translate-x-0'
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
                    <Megaphone className="w-4 h-4 text-indigo-600" />
                    Live Cold Chain Customer Broadcast Ticker
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Broadcast stock arrival updates, holiday schedules, and dispatch cutoffs.
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
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Alert Urgency Style
                  </label>
                  <select
                    value={form.broadcast.urgency}
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, urgency: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="info">Info (Blue Cold Notice)</option>
                    <option value="warning">Warning (Amber Route Delay)</option>
                    <option value="urgent">Urgent (Red Stock Cutoff)</option>
                    <option value="success">Success (Emerald Fresh Arrival)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Target Audience
                  </label>
                  <select
                    value={form.broadcast.target_audience}
                    onChange={(e) => setForm({ ...form, broadcast: { ...form.broadcast, target_audience: e.target.value as any } })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All (Wholesale Customers & Depot Staff)</option>
                    <option value="customers">Customers Only</option>
                    <option value="staff">Depot & Fleet Staff Only</option>
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
                    placeholder="/rimi/customer-portal or https://..."
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
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
                    placeholder="e.g. Order Stock"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 5. DISTRIBUTION HUBS & ROUTES */}
        {activeTab === 'zones' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Cold Chain Distribution Hubs & Fleet Zones</h3>
                <p className="text-xs text-slate-500 font-medium">Configure regional warehouse locations, covered corridors, and delivery turnaround SLAs.</p>
              </div>
              <Button
                type="button"
                onClick={handleAddZone}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Distribution Hub
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.zones.map((zone, idx) => (
                <Card key={zone.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={zone.zone_name}
                        onChange={(e) => {
                          const updated = [...form.zones];
                          updated[idx].zone_name = e.target.value;
                          setForm({ ...form, zones: updated });
                        }}
                        className="text-xs font-black text-slate-900 w-full bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 mb-1"
                      />
                      <input
                        type="text"
                        value={zone.hub_city}
                        onChange={(e) => {
                          const updated = [...form.zones];
                          updated[idx].hub_city = e.target.value;
                          setForm({ ...form, zones: updated });
                        }}
                        className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 w-40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(zone.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Covered Territory:</span>
                    <input
                      type="text"
                      value={zone.covered_regions.join(', ')}
                      onChange={(e) => {
                        const updated = [...form.zones];
                        updated[idx].covered_regions = e.target.value.split(',').map(s => s.trim());
                        setForm({ ...form, zones: updated });
                      }}
                      className="w-full text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Delivery Turnaround:</span>
                      <input
                        type="text"
                        value={zone.standard_delivery_days}
                        onChange={(e) => {
                          const updated = [...form.zones];
                          updated[idx].standard_delivery_days = e.target.value;
                          setForm({ ...form, zones: updated });
                        }}
                        className="w-full font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Min Freight (₹):</span>
                      <input
                        type="number"
                        value={zone.min_delivery_charge}
                        onChange={(e) => {
                          const updated = [...form.zones];
                          updated[idx].min_delivery_charge = Number(e.target.value);
                          setForm({ ...form, zones: updated });
                        }}
                        className="w-full font-black text-emerald-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black h-10 px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Publishing Changes...' : 'Save & Publish All Rimi Configurations'}
          </Button>
        </div>
      </form>
    </div>
  );
};
