import { useEffect, useState } from 'react';
import {
  Sliders, Plus, Trash2, Globe, Coins, Clock, CheckCircle2,
  AlertCircle, Building2, Save, Sparkles, RefreshCw, ArrowRight
} from 'lucide-react';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDestinations } from '../hooks/useDestinations';
import { useUniversities } from '../hooks/useUniversities';
import { educationFees, educationStages, type EducationFee } from '../lib/educationBilling';
import { saveEducationFees } from '../lib/api/educationBilling';
import { getGlobalPaymentGateways, saveGlobalPaymentGateways } from '../lib/api/paymentGateways';

const inputClass = 'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E] transition-all';
const labelClass = 'block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5';

export function EducationFeeEditor() {
  const { config } = useFeeConfig();
  const { destinations } = useDestinations();
  const { universities } = useUniversities();
  const [fees, setFees] = useState<EducationFee[]>(() => educationFees(config));
  const [upiEnabled, setUpiEnabled] = useState(config.payment_gateways.phonepe_upi_enabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const countries = Array.from(new Set([...destinations.map(d => d.name), ...universities.map(u => u.country)])).sort();

  useEffect(() => {
    if (!dirty) {
      setFees(educationFees(config));
      setUpiEnabled(config.payment_gateways.phonepe_upi_enabled);
      getGlobalPaymentGateways().then(g => setUpiEnabled(g.upi?.enabled !== false && g.divisions.education.allowUpi !== false)).catch(() => {});
    }
  }, [config, dirty]);

  const change = (id: string, values: Partial<EducationFee>) => {
    setDirty(true);
    setFees(current => current.map(f => f.id === id ? { ...f, ...values } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveEducationFees(fees, upiEnabled);
      try {
        const currentGw = await getGlobalPaymentGateways();
        await saveGlobalPaymentGateways({
          ...currentGw,
          upi: { ...currentGw.upi, enabled: upiEnabled },
          divisions: {
            ...currentGw.divisions,
            education: {
              ...currentGw.divisions.education,
              allowUpi: upiEnabled,
            }
          }
        });
      } catch (gwErr) {
        console.warn('Could not sync global gateway configuration:', gwErr);
      }
      setDirty(false);
      setMessageType('success');
      setMessage('Fee configuration saved successfully.');
    } catch (e) {
      setMessageType('error');
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6 text-left">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#58051E]" /> Education Fee Configuration
            </h2>
            <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              Commercial Governance
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Configure fee milestones, stage trigger boundaries (before/after), tax inclusion rates, and regional country overrides.
          </p>
        </div>

        {dirty && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Unsaved changes
          </span>
        )}
      </div>

      {/* University Direct Payment Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 border border-blue-200/80 flex items-start gap-3">
        <div className="p-2 bg-blue-100 text-blue-800 rounded-xl shrink-0 mt-0.5">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-black text-blue-950 uppercase tracking-wider">Direct University Tuition Guard</p>
          <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
            University application fees and semester tuition installments are always paid by students directly to verified university accounts. Ferex does not hold or collect tuition installments.
          </p>
        </div>
      </div>

      {/* Direct UPI toggle */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#58051E]/10 text-[#58051E] rounded-xl border border-[#58051E]/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Direct UPI Payments</p>
              <p className="text-[11px] text-slate-500">Students pay configured fees by UPI (Google Pay, PhonePe, Paytm, QR) and submit the UTR for finance verification</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={upiEnabled}
              onChange={e => {
                setDirty(true);
                setUpiEnabled(e.target.checked);
              }}
              className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E] border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Enable UPI</span>
          </label>
        </div>

      </div>

      {/* Fees List */}
      <fieldset disabled={saving} className="space-y-4">
        {fees.map((fee, index) => {
          const isCore = ['registration', 'agency', 'vfs'].includes(fee.id);
          return (
            <article
              key={fee.id}
              className={`rounded-2xl border transition-all duration-200 bg-white p-5 space-y-4 shadow-xs ${
                fee.enabled ? 'border-slate-200/90' : 'border-slate-200/60 opacity-60'
              }`}
            >
              {/* Fee Card Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={fee.enabled}
                    onChange={e => change(fee.id, { enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E] border-slate-300 cursor-pointer"
                  />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>{fee.title || 'Untitled Fee'}</span>
                      {fee.enabled ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Fee #{index + 1} • {fee.timing === 'before' ? 'Before' : 'After'} Stage {fee.stage}: {educationStages[fee.stage - 1]}
                    </p>
                  </div>
                </div>

                {!isCore && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirty(true);
                      setFees(fees.filter(f => f.id !== fee.id));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove fee
                  </button>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Fee Name</label>
                  <input
                    className={inputClass}
                    value={fee.title}
                    onChange={e => change(fee.id, { title: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Common Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label="Common amount"
                    className={inputClass}
                    value={fee.amount}
                    onChange={e => change(fee.id, { amount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    className={inputClass}
                    value={fee.currency}
                    onChange={e => change(fee.id, { currency: e.target.value as EducationFee['currency'] })}
                  >
                    {['INR', 'EUR', 'USD', 'GBP', 'PLN'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Tax Included (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={inputClass}
                    value={fee.tax_rate_percent ?? 0}
                    onChange={e => change(fee.id, { tax_rate_percent: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Payable Timing</label>
                  <select
                    aria-label="Payable"
                    className={inputClass}
                    value={fee.timing}
                    onChange={e => change(fee.id, { timing: e.target.value as EducationFee['timing'] })}
                  >
                    <option value="before">Before stage</option>
                    <option value="after">After stage</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Workflow Stage</label>
                  <select
                    aria-label="Workflow stage"
                    className={inputClass}
                    value={fee.stage}
                    onChange={e => change(fee.id, { stage: Number(e.target.value) })}
                  >
                    {educationStages.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {i + 1}. {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Recipient Authority</label>
                  <select
                    className={inputClass}
                    value={fee.recipient}
                    onChange={e => change(fee.id, { recipient: e.target.value as EducationFee['recipient'] })}
                  >
                    <option value="ferex">Ferex — student UPI / admin entry</option>
                    <option value="direct_third_party">Direct to institution / authority</option>
                  </select>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className={labelClass}>Student Instructions / Notes</label>
                <textarea
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E] transition-all"
                  value={fee.description}
                  onChange={e => change(fee.id, { description: e.target.value })}
                  placeholder="Instructions displayed to students on their portal..."
                />
              </div>

              {fee.currency !== 'INR' && fee.recipient === 'ferex' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>UPI accepts INR only. This currency can be recorded by an administrator. Configure INR to offer student UPI.</span>
                </div>
              )}

              {/* Country-Specific Override Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#58051E]" /> Country-Specific Fee Overrides
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      The common amount applies unless overridden here. Setting 0 waives this fee for that country.
                    </p>
                  </div>
                </div>

                {/* Overrides Table */}
                {Object.entries(fee.countryAmounts || {}).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Object.entries(fee.countryAmounts || {}).map(([country, amount]) => (
                      <div
                        key={country}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl gap-2"
                      >
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{country}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`${country} ${fee.title} amount`}
                            className="w-24 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                            value={amount}
                            onChange={e => change(fee.id, {
                              countryAmounts: { ...fee.countryAmounts, [country]: Number(e.target.value) }
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...fee.countryAmounts };
                              delete next[country];
                              change(fee.id, { countryAmounts: next });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Remove ${country} override`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Country Override Dropdown */}
                <div className="max-w-xs">
                  <select
                    aria-label={`Add country override for ${fee.title}`}
                    className={inputClass}
                    value=""
                    onChange={e => {
                      if (e.target.value) {
                        change(fee.id, {
                          countryAmounts: { ...fee.countryAmounts, [e.target.value]: fee.amount }
                        });
                      }
                    }}
                  >
                    <option value="">+ Add country override…</option>
                    {countries
                      .filter(c => !(c in (fee.countryAmounts || {})))
                      .map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                </div>
              </div>
            </article>
          );
        })}

        {/* Add Another Fee Button */}
        <button
          type="button"
          onClick={() => {
            setDirty(true);
            setFees([
              ...fees,
              {
                id: crypto.randomUUID(),
                title: 'Additional fee',
                enabled: true,
                amount: 0,
                currency: 'INR',
                recipient: 'ferex',
                timing: 'before',
                stage: 1,
                description: ''
              }
            ]);
          }}
          className="w-full py-3.5 border-2 border-dashed border-slate-200 hover:border-[#58051E]/40 hover:bg-[#58051E]/5 rounded-2xl text-xs font-bold text-slate-600 hover:text-[#58051E] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add another fee
        </button>
      </fieldset>

      {/* Status Alert */}
      {message && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            messageType === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : messageType === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}
        >
          {messageType === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : messageType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-slate-600 shrink-0 animate-spin" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Save Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={handleSave}
          className="h-10 px-6 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#58051E]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save fee configuration</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
