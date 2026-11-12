import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Globe, Save, Edit2, CheckCircle2, XCircle,
  Package, ChevronDown, ChevronUp, Sparkles, Copy, Eye,
  EyeOff, AlertCircle, Layers, ArrowRight, DollarSign, List
} from 'lucide-react';
import {
  getCountryFeePackages, saveCountryFeePackages, createBlankPackage,
  money,
  type CountryFeePackage, type FeePackageCoveredService, type FeePackageInstallment
} from '../lib/api/feePackages';
import { useDestinations } from '../hooks/useDestinations';
import { useUniversities } from '../hooks/useUniversities';

const inp = 'w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E] transition-all';
const lbl = 'block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1';
const btn = (cls: string) => `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${cls}`;

const JOURNEY_STAGES = [
  'Lead Inquiry', 'Service Agreement', 'Advanced Registration', 'Document Review',
  'Country Legalization', 'University Application', 'Offer Letter',
  'University Tuition', 'Visa Application', 'Visa Decision', 'Pre-Departure', 'Enrollment'
];

const CURRENCIES: CountryFeePackage['currency'][] = ['INR', 'EUR', 'GBP', 'USD', 'PLN'];

export function CountryFeePackageBuilder() {
  const { destinations } = useDestinations();
  const { universities } = useUniversities();
  const [packages, setPackages] = useState<CountryFeePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CountryFeePackage | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newCountry, setNewCountry] = useState('Poland');

  const countries = Array.from(new Set([
    ...destinations.map(d => d.name),
    ...universities.map(u => u.country),
    'Poland', 'Germany', 'United Kingdom', 'France', 'Hungary', 'Canada',
    'Italy', 'Czech Republic', 'Spain', 'United States'
  ])).filter(Boolean).sort();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const pkgs = await getCountryFeePackages();
    setPackages(pkgs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('ferex_fee_packages_change', h);
    return () => window.removeEventListener('ferex_fee_packages_change', h);
  }, [load]);

  const handleCreatePackage = () => {
    const pkg = createBlankPackage(newCountry);
    setDraft(pkg);
    setEditId(pkg.id);
    setPackages(prev => [pkg, ...prev]);
    setExpandedId(pkg.id);
    setDirty(true);
  };

  const handleEditStart = (pkg: CountryFeePackage) => {
    setDraft({ ...pkg });
    setEditId(pkg.id);
    setExpandedId(pkg.id);
  };

  const handleDraftChange = (updates: Partial<CountryFeePackage>) => {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
    setDirty(true);
  };

  const handleSavePackage = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updated = packages.map(p => p.id === draft.id ? { ...draft, updated_at: now } : p);
      await saveCountryFeePackages(updated);
      setPackages(updated);
      setEditId(null);
      setDraft(null);
      setDirty(false);
      showToast('✅ Package saved successfully.');
    } catch (e: any) {
      showToast(`Error saving: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardEdit = () => {
    if (!editId) return;
    // If new (not in saved list), remove
    const wasNew = !packages.some(p => p.id === editId);
    if (wasNew) setPackages(prev => prev.filter(p => p.id !== editId));
    setEditId(null);
    setDraft(null);
    setDirty(false);
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (!window.confirm('Delete this package? This will not affect students already assigned to it.')) return;
    const updated = packages.filter(p => p.id !== pkgId);
    setSaving(true);
    try {
      await saveCountryFeePackages(updated);
      setPackages(updated);
      showToast('Package deleted.');
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (pkg: CountryFeePackage) => {
    const now = new Date().toISOString();
    const copy: CountryFeePackage = {
      ...pkg,
      id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${pkg.name} (Copy)`,
      is_active: false,
      created_at: now,
      updated_at: now,
    };
    const updated = [copy, ...packages];
    setSaving(true);
    try {
      await saveCountryFeePackages(updated);
      setPackages(updated);
      setDraft(copy);
      setEditId(copy.id);
      setExpandedId(copy.id);
      showToast('Package duplicated. Edit and activate it.');
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (pkg: CountryFeePackage) => {
    // One active plan per country, so a student can never match two plans.
    const activating = !pkg.is_active;
    const updated = packages.map(p =>
      p.id === pkg.id ? { ...p, is_active: activating, updated_at: new Date().toISOString() }
      : activating && p.is_active && p.country.trim().toLowerCase() === pkg.country.trim().toLowerCase() ? { ...p, is_active: false, updated_at: new Date().toISOString() }
      : p);
    setSaving(true);
    try {
      await saveCountryFeePackages(updated);
      setPackages(updated);
      showToast(pkg.is_active ? 'Plan deactivated. Students of this country use the standard fees.' : `✅ Plan active. ${pkg.country} students are now billed from it automatically.`);
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Covered Services Editor ──────────────────────────────────────────────
  const handleServiceToggle = (svcId: string, included: boolean) => {
    if (!draft) return;
    setDraft({
      ...draft,
      covered_services: draft.covered_services.map(s => s.id === svcId ? { ...s, is_included: included } : s),
    });
    setDirty(true);
  };
  const handleServiceEdit = (svcId: string, field: keyof FeePackageCoveredService, value: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      covered_services: draft.covered_services.map(s => s.id === svcId ? { ...s, [field]: value } : s),
    });
    setDirty(true);
  };
  const handleAddService = () => {
    if (!draft) return;
    const newSvc: FeePackageCoveredService = {
      id: `svc-${Date.now()}`,
      title: 'New Service Item',
      description: '',
      is_included: true,
    };
    setDraft({ ...draft, covered_services: [...draft.covered_services, newSvc] });
    setDirty(true);
  };
  const handleRemoveService = (svcId: string) => {
    if (!draft) return;
    setDraft({ ...draft, covered_services: draft.covered_services.filter(s => s.id !== svcId) });
    setDirty(true);
  };

  // ── Installment Editor ───────────────────────────────────────────────────
  const handleInstallmentChange = (instId: string, field: keyof FeePackageInstallment, value: string | number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      installments: draft.installments.map(i => i.id === instId ? { ...i, [field]: value } : i),
    });
    setDirty(true);
  };
  const handleAddInstallment = () => {
    if (!draft) return;
    const newInst: FeePackageInstallment = {
      id: `inst-${Date.now()}`,
      title: 'New Payment Milestone',
      amount: 0,
      stage_trigger: 3,
      timing: 'before',
      due_description: '',
    };
    setDraft({ ...draft, installments: [...draft.installments, newInst] });
    setDirty(true);
  };
  const handleRemoveInstallment = (instId: string) => {
    if (!draft) return;
    setDraft({ ...draft, installments: draft.installments.filter(i => i.id !== instId) });
    setDirty(true);
  };

  const isEditing = (pkg: CountryFeePackage) => editId === pkg.id;
  const currentPkg = (pkg: CountryFeePackage) => isEditing(pkg) && draft ? draft : pkg;

  return (
    <section className="space-y-6 text-left">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-[#58051E]" /> Country Fee Plans
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Per country, set a package price or split payments (agency fee, visa fee and so on). Students of a country with an active plan are billed from it automatically; other countries use the standard separate fees above.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={newCountry}
            onChange={e => setNewCountry(e.target.value)}
            className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E]"
          >
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleCreatePackage}
            className={btn('bg-[#58051E] text-white hover:bg-[#430316] shadow-sm shadow-[#58051E]/30')}
          >
            <Plus className="w-3.5 h-3.5" /> New Package
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">How country plans work</p>
          <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
            Every student pays the <strong>basic registration fee</strong> (standard fees above; admins can discount it per student).
            After that, a student whose destination country has an <strong>active plan</strong> is billed from that plan automatically and sees it, with its installments and discounts, on their payment page.
            If the country has no plan, the standard separate fees apply. In <strong>Student Directory → Commercial Billing Flow</strong> you can switch one student to standard fees or pin a different plan.
          </p>
        </div>
      </div>

      {/* Packages List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold">
          Loading packages...
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Package className="w-10 h-10" />
          <p className="text-sm font-bold">No packages yet.</p>
          <p className="text-xs">Select a country and click "New Package" to create your first country fee bundle.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map(pkg => {
            const p = currentPkg(pkg);
            const expanded = expandedId === pkg.id;
            const editing = isEditing(pkg);

            return (
              <motion.article
                key={pkg.id}
                layout
                className={`rounded-2xl border bg-white shadow-xs transition-all ${p.is_active ? 'border-slate-200/90' : 'border-slate-200/50 opacity-70'}`}
              >
                {/* Package Header */}
                <div className="flex items-center gap-3 p-4">
                  {/* Country flag badge */}
                  <div className="p-2 bg-[#58051E]/8 text-[#58051E] rounded-xl border border-[#58051E]/15 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 truncate">{p.name}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                        {p.country}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      {money(p.total_amount, p.currency)} total · {p.installments.length} installment{p.installments.length !== 1 ? 's' : ''} · {p.covered_services.filter(s => s.is_included).length} services included
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!editing && (
                      <>
                        <button onClick={() => handleToggleActive(pkg)} className={btn(p.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}>
                          {p.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleEditStart(pkg)} className={btn('bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}>
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => handleDuplicate(pkg)} className={btn('bg-slate-50 text-slate-600 hover:bg-slate-100')}>
                          <Copy className="w-3 h-3" /> Duplicate
                        </button>
                        <button onClick={() => handleDeletePackage(pkg.id)} className={btn('bg-rose-50 text-rose-700 hover:bg-rose-100')}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {editing && (
                      <>
                        <button onClick={handleSavePackage} disabled={saving} className={btn('bg-[#58051E] text-white hover:bg-[#430316] shadow-sm')}>
                          <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save Package'}
                        </button>
                        <button onClick={handleDiscardEdit} className={btn('bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                          <XCircle className="w-3 h-3" /> Discard
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(expanded ? null : pkg.id)}
                      className={btn('bg-slate-50 text-slate-600 hover:bg-slate-100')}
                    >
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Body */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 p-5 space-y-6">

                        {/* ── Core Fields ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className={lbl}>Package Name</label>
                            {editing ? (
                              <input className={inp} value={p.name} onChange={e => handleDraftChange({ name: e.target.value })} />
                            ) : (
                              <p className="text-xs font-bold text-slate-800">{p.name}</p>
                            )}
                          </div>
                          <div>
                            <label className={lbl}>Country</label>
                            {editing ? (
                              <select
                                className={inp}
                                value={p.country}
                                onChange={e => handleDraftChange({ country: e.target.value })}
                              >
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <p className="text-xs font-bold text-slate-800">{p.country}</p>
                            )}
                          </div>
                          <div>
                            <label className={lbl}>Total Package Price</label>
                            {editing ? (
                              <div className="flex gap-2">
                                <select
                                  className="h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20"
                                  value={p.currency}
                                  onChange={e => handleDraftChange({ currency: e.target.value as CountryFeePackage['currency'] })}
                                >
                                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input
                                  type="number"
                                  className={`${inp} flex-1`}
                                  value={p.total_amount}
                                  onChange={e => handleDraftChange({ total_amount: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            ) : (
                              <p className="text-sm font-black text-[#58051E]">{money(p.total_amount, p.currency)}</p>
                            )}
                          </div>
                          <div>
                            <label className={lbl}>Registration fee for this plan</label>
                            {editing ? (
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    aria-label="Enable registration fee"
                                    checked={p.registration_fee.enabled}
                                    onChange={e => handleDraftChange({ registration_fee: { ...p.registration_fee, enabled: e.target.checked } })}
                                    className="w-4 h-4 rounded text-[#58051E] border-slate-300 cursor-pointer"
                                  />
                                  Override
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  aria-label="Registration fee amount"
                                  disabled={!p.registration_fee.enabled}
                                  className={`${inp} flex-1 disabled:opacity-50`}
                                  value={p.registration_fee.amount}
                                  onChange={e => handleDraftChange({ registration_fee: { ...p.registration_fee, amount: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                />
                              </div>
                            ) : (
                              <p className="text-sm font-black text-[#58051E]">
                                {p.registration_fee.enabled && p.registration_fee.amount > 0
                                  ? money(p.registration_fee.amount, p.currency)
                                  : <span className="text-slate-400 font-bold">Standard registration fee</span>}
                              </p>
                            )}
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className={lbl}>Description</label>
                            {editing ? (
                              <textarea
                                className={`${inp} h-auto py-2`}
                                rows={2}
                                value={p.description}
                                onChange={e => handleDraftChange({ description: e.target.value })}
                              />
                            ) : (
                              <p className="text-xs text-slate-600">{p.description}</p>
                            )}
                          </div>
                        </div>

                        {/* ── Covered Services ── */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <List className="w-4 h-4 text-[#58051E]" />
                              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Covered Services & Deliverables</h3>
                            </div>
                            {editing && (
                              <button onClick={handleAddService} className={btn('bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}>
                                <Plus className="w-3 h-3" /> Add Service
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {p.covered_services.map(svc => (
                              <div key={svc.id} className={`flex items-start gap-3 p-3 rounded-xl border ${svc.is_included ? 'bg-emerald-50/60 border-emerald-200/60' : 'bg-slate-50 border-slate-200/60 opacity-60'}`}>
                                {editing ? (
                                  <input
                                    type="checkbox"
                                    checked={svc.is_included}
                                    onChange={e => handleServiceToggle(svc.id, e.target.checked)}
                                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-slate-300 cursor-pointer shrink-0"
                                  />
                                ) : (
                                  svc.is_included
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    : <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  {editing ? (
                                    <input
                                      className={`${inp} mb-1`}
                                      value={svc.title}
                                      onChange={e => handleServiceEdit(svc.id, 'title', e.target.value)}
                                      placeholder="Service title"
                                    />
                                  ) : (
                                    <p className={`text-xs font-bold ${svc.is_included ? 'text-emerald-900' : 'text-slate-500'}`}>{svc.title}</p>
                                  )}
                                  {editing && (
                                    <input
                                      className={inp}
                                      value={svc.description || ''}
                                      onChange={e => handleServiceEdit(svc.id, 'description', e.target.value)}
                                      placeholder="Optional description..."
                                    />
                                  )}
                                  {!editing && svc.description && (
                                    <p className="text-[11px] text-slate-500 mt-0.5">{svc.description}</p>
                                  )}
                                </div>
                                {editing && (
                                  <button onClick={() => handleRemoveService(svc.id)} className="text-rose-400 hover:text-rose-700 transition-colors mt-0.5 shrink-0 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {p.covered_services.length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-4">No services configured. Click "Add Service".</p>
                            )}
                          </div>
                        </div>

                        {/* ── Installment Milestones ── */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-[#58051E]" />
                              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Payment Installment Milestones</h3>
                            </div>
                            {editing && (
                              <button onClick={handleAddInstallment} className={btn('bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}>
                                <Plus className="w-3 h-3" /> Add Installment
                              </button>
                            )}
                          </div>

                          {/* Total validation */}
                          {editing && draft && (
                            (() => {
                              const instTotal = draft.installments.reduce((s, i) => s + (i.amount || 0), 0);
                              const diff = draft.total_amount - instTotal;
                              return (
                                <div className={`mb-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${Math.abs(diff) < 1 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                  {Math.abs(diff) < 1
                                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Installments balance matches total package price ({money(draft.total_amount, draft.currency)})</>
                                    : <><AlertCircle className="w-3.5 h-3.5" /> Installment totals ({money(instTotal, draft.currency)}) {diff > 0 ? `under` : `over`} by {money(Math.abs(diff), draft.currency)} vs package price</>
                                  }
                                </div>
                              );
                            })()
                          )}

                          <div className="space-y-3">
                            {p.installments.map((inst, idx) => (
                              <div key={inst.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-6 h-6 rounded-full bg-[#58051E]/10 text-[#58051E] text-[11px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                  {editing ? (
                                    <input
                                      className={`${inp} flex-1`}
                                      value={inst.title}
                                      onChange={e => handleInstallmentChange(inst.id, 'title', e.target.value)}
                                      placeholder="Installment title"
                                    />
                                  ) : (
                                    <span className="text-xs font-black text-slate-900">{inst.title}</span>
                                  )}
                                  {editing && (
                                    <button onClick={() => handleRemoveInstallment(inst.id)} className="text-rose-400 hover:text-rose-700 cursor-pointer transition-colors shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <label className={lbl}>Amount ({p.currency})</label>
                                    {editing ? (
                                      <input
                                        type="number"
                                        className={inp}
                                        value={inst.amount}
                                        onChange={e => handleInstallmentChange(inst.id, 'amount', parseFloat(e.target.value) || 0)}
                                      />
                                    ) : (
                                      <p className="text-sm font-black text-[#58051E]">{money(inst.amount, p.currency)}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={lbl}>Journey Stage</label>
                                    {editing ? (
                                      <select
                                        className={inp}
                                        value={inst.stage_trigger}
                                        onChange={e => handleInstallmentChange(inst.id, 'stage_trigger', parseInt(e.target.value))}
                                      >
                                        {JOURNEY_STAGES.map((s, i) => (
                                          <option key={i + 1} value={i + 1}>Stage {i + 1}: {s}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <p className="text-xs font-bold text-slate-700">Stage {inst.stage_trigger}: {JOURNEY_STAGES[inst.stage_trigger - 1]}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={lbl}>Timing</label>
                                    {editing ? (
                                      <select
                                        className={inp}
                                        value={inst.timing}
                                        onChange={e => handleInstallmentChange(inst.id, 'timing', e.target.value as 'before' | 'after')}
                                      >
                                        <option value="before">Before Stage</option>
                                        <option value="after">After Stage</option>
                                      </select>
                                    ) : (
                                      <p className="text-xs font-bold text-slate-700">{inst.timing === 'before' ? 'Before' : 'After'} Stage</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={lbl}>Due Description</label>
                                    {editing ? (
                                      <input
                                        className={inp}
                                        value={inst.due_description || ''}
                                        onChange={e => handleInstallmentChange(inst.id, 'due_description', e.target.value)}
                                        placeholder="e.g. Due after agreement"
                                      />
                                    ) : (
                                      <p className="text-[11px] text-slate-500">{inst.due_description || '—'}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {p.installments.length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-4">No installments configured. Click "Add Installment".</p>
                            )}
                          </div>
                        </div>

                        {/* ── Terms Note ── */}
                        <div>
                          <label className={lbl}>Terms & Conditions Note (shown to student)</label>
                          {editing ? (
                            <textarea
                              className={`${inp} h-auto py-2`}
                              rows={2}
                              value={p.terms_note || ''}
                              onChange={e => handleDraftChange({ terms_note: e.target.value })}
                              placeholder="Package terms displayed to students in their payment portal..."
                            />
                          ) : (
                            <p className="text-xs text-slate-500 italic">{p.terms_note || '—'}</p>
                          )}
                        </div>

                        {/* Summary row */}
                        {!editing && (
                          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              {p.covered_services.filter(s => s.is_included).length} of {p.covered_services.length} services included
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                              <Layers className="w-3.5 h-3.5 text-indigo-500" />
                              {p.installments.length} payment milestone{p.installments.length !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#58051E]">
                              <ArrowRight className="w-3.5 h-3.5" />
                              Total: {money(p.total_amount, p.currency)}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}

