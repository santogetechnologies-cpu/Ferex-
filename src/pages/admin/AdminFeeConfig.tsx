import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, CheckCircle2, Shield, Settings, ToggleLeft, ToggleRight,
  Plus, Trash2, HelpCircle, Building2, Landmark, QrCode, FileSpreadsheet, Check
} from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import type { AgencyMilestone } from '../../lib/api/feeConfig';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  // Advanced Registration Fee State (A1)
  const [advFeeEnabled, setAdvFeeEnabled] = useState<boolean>(config.advance_registration_fee_enabled ?? true);
  const [advFeeAmount, setAdvFeeAmount] = useState<number>(config.advance_registration_fee_amount ?? 15000);
  const [advFeeCurrency, setAdvFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.advance_registration_fee_currency || 'INR');

  // Installment Schedule State (B1)
  const [installmentEnabled, setInstallmentEnabled] = useState<boolean>(config.installment_schedule_enabled ?? true);
  const [inst1Pct, setInst1Pct] = useState<number>(config.installment_percentages?.installment_1 ?? 30);
  const [inst2Pct, setInst2Pct] = useState<number>(config.installment_percentages?.installment_2 ?? 40);
  const [inst3Pct, setInst3Pct] = useState<number>(config.installment_percentages?.installment_3 ?? 30);

  // Agency Fee Separation State (A3 & A4)
  const [separateAgencyFee, setSeparateAgencyFee] = useState<boolean>(config.separate_agency_fee_enabled ?? false);
  const [agencyFeeModel, setAgencyFeeModel] = useState<'agency_fee_only' | 'milestones' | 'milestone_plus_fee'>(
    config.agency_fee_model || 'agency_fee_only'
  );
  const [agencyFeeAmount, setAgencyFeeAmount] = useState<number>(config.agency_fee_amount ?? 25000);
  const [agencyFeeCurrency, setAgencyFeeCurrency] = useState<string>(config.agency_fee_currency || 'INR');
  const [milestones, setMilestones] = useState<AgencyMilestone[]>(config.agency_milestones || []);

  // Invoice & GST Settings (A1 & L)
  const [companyGstin, setCompanyGstin] = useState(config.invoice_settings?.company_gstin || '32AABCF1234F1Z8');
  const [companyPan, setCompanyPan] = useState(config.invoice_settings?.company_pan || 'AABCF1234F');
  const [companyAddress, setCompanyAddress] = useState(config.invoice_settings?.company_address || 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042');
  const [invoicePrefix, setInvoicePrefix] = useState(config.invoice_settings?.invoice_prefix || 'FRX-INV');
  const [receiptPrefix, setReceiptPrefix] = useState(config.invoice_settings?.receipt_prefix || 'FRX-RCP');
  const [taxRatePct, setTaxRatePct] = useState(config.invoice_settings?.tax_rate_percent ?? 18);
  const [termsConditions, setTermsConditions] = useState(config.invoice_settings?.terms_conditions || 'All consultancy services are subject to 18% Indian GST (SAC 9983). Non-refundable once visa file lodged.');

  // PhonePe UPI / Manual Payment Gateway Settings
  const [phonePeUpiEnabled, setPhonePeUpiEnabled] = useState(config.payment_gateways?.phonepe_upi_enabled ?? true);
  const [phonePeMerchantId, setPhonePeMerchantId] = useState(config.payment_gateways?.phonepe_merchant_id || 'FEREXPHONEPEUPI');
  const [bankWireEnabled, setBankWireEnabled] = useState(config.payment_gateways?.bank_transfer_enabled ?? true);
  const [cashAdminEnabled, setCashAdminEnabled] = useState(config.payment_gateways?.cash_admin_enabled ?? true);

  const [toast, setToast] = useState('');

  // Sync state if external changes happen
  useEffect(() => {
    setAdvFeeEnabled(config.advance_registration_fee_enabled ?? true);
    setAdvFeeAmount(config.advance_registration_fee_amount ?? 15000);
    setAdvFeeCurrency(config.advance_registration_fee_currency || 'INR');
    setInstallmentEnabled(config.installment_schedule_enabled ?? true);
    setSeparateAgencyFee(config.separate_agency_fee_enabled ?? false);
    setAgencyFeeModel(config.agency_fee_model || 'agency_fee_only');
    setAgencyFeeAmount(config.agency_fee_amount ?? 25000);
    setMilestones(config.agency_milestones || []);
  }, [config]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleAddMilestone = () => {
    const nextNum = milestones.length + 1;
    const newM: AgencyMilestone = {
      id: `m-${Date.now()}`,
      name: `Milestone Stage #${nextNum}`,
      amount: 5000,
      due_trigger: 'On Stage Confirmation',
      description: 'Agency processing stage installment'
    };
    setMilestones([...milestones, newM]);
  };

  const handleUpdateMilestone = (idx: number, field: keyof AgencyMilestone, val: any) => {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    const totalPct = Number(inst1Pct) + Number(inst2Pct) + Number(inst3Pct);
    if (installmentEnabled && totalPct !== 100) {
      showToast(`Warning: Installment percentages must sum to 100%. Current total: ${totalPct}%`);
      return;
    }

    updateConfig({
      advance_registration_fee_enabled: advFeeEnabled,
      advance_registration_fee_amount: Number(advFeeAmount),
      advance_registration_fee_currency: advFeeCurrency,
      installment_schedule_enabled: installmentEnabled,
      installment_percentages: {
        installment_1: Number(inst1Pct),
        installment_2: Number(inst2Pct),
        installment_3: Number(inst3Pct),
      },
      separate_agency_fee_enabled: separateAgencyFee,
      agency_fee_model: agencyFeeModel,
      agency_fee_amount: Number(agencyFeeAmount),
      agency_fee_currency: agencyFeeCurrency,
      agency_milestones: milestones,
      payment_gateways: {
        phonepe_upi_enabled: phonePeUpiEnabled,
        phonepe_merchant_id: phonePeMerchantId,
        bank_transfer_enabled: bankWireEnabled,
        cash_admin_enabled: cashAdminEnabled,
      },
      invoice_settings: {
        company_gstin: companyGstin.trim(),
        company_pan: companyPan.trim(),
        company_address: companyAddress.trim(),
        invoice_prefix: invoicePrefix.trim(),
        receipt_prefix: receiptPrefix.trim(),
        tax_rate_percent: Number(taxRatePct),
        terms_conditions: termsConditions.trim(),
      },
    });

    showToast('Fee Governance & Invoicing Configuration successfully saved!');
  };

  return (
    <div className="space-y-6 text-left antialiased select-none max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#58051E] text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
              Platform Financial Control
            </span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              ● 18% GST Compliant (SAC 9983)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Fee & Financial Governance</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure Advanced Registration Fee, downstream installment verification schedules, and separate agency billing models.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="h-10 px-5 bg-[#58051E] text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-[#430316] transition-all shadow-md cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Save className="w-4 h-4" /> Save Fee Governance
        </button>
      </div>

      {/* SECTION 1: Advanced Registration Fee (Section A1 & B) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Advanced Registration Fee</h2>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory onboarding deposit charged to newly registered students prior to dossier submission.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              {advFeeEnabled ? 'Fee Enabled' : 'Fee Disabled'}
            </span>
            <button
              type="button"
              onClick={() => setAdvFeeEnabled(!advFeeEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                advFeeEnabled ? 'bg-[#58051E]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  advFeeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {advFeeEnabled ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                Registration Fee Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={advFeeAmount}
                  onChange={(e) => setAdvFeeAmount(Number(e.target.value))}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#58051E] focus:bg-white"
                  placeholder="15000"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                  {advFeeCurrency}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Reflected strictly as "Advanced Registration Fee" on student registration & payments screen.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                Billing Currency
              </label>
              <select
                value={advFeeCurrency}
                onChange={(e) => setAdvFeeCurrency(e.target.value as any)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#58051E] cursor-pointer"
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="USD">USD ($ - US Dollar)</option>
              </select>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Applicable currency for tax invoicing and payment gateway settlement.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Advanced Registration Fee is currently disabled. Students will bypass this fee stage upon registration.
          </div>
        )}
      </div>

      {/* SECTION 2: Installment Payment & Verification Schedule (Section B1) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Installment Payment & Verification Schedule</h2>
              <p className="text-xs text-slate-500 font-medium">
                Controls downstream visibility of university tuition installment stages across Fee Schedule & Settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              {installmentEnabled ? 'Schedule Enabled' : 'Schedule Disabled'}
            </span>
            <button
              type="button"
              onClick={() => setInstallmentEnabled(!installmentEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                installmentEnabled ? 'bg-[#58051E]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  installmentEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {installmentEnabled ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 font-semibold">
              Configure downstream milestone split for university tuition installments:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Stage 1 (Initial Deposit)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inst1Pct}
                    onChange={(e) => setInst1Pct(Number(e.target.value))}
                    className="w-20 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-600">% of Tuition</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Stage 2 (Mid-Term)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inst2Pct}
                    onChange={(e) => setInst2Pct(Number(e.target.value))}
                    className="w-20 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-600">% of Tuition</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Stage 3 (Final Clearance)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inst3Pct}
                    onChange={(e) => setInst3Pct(Number(e.target.value))}
                    className="w-20 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center"
                  />
                  <span className="text-xs font-bold text-slate-600">% of Tuition</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              Total Allocation: <span className={inst1Pct + inst2Pct + inst3Pct === 100 ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>{inst1Pct + inst2Pct + inst3Pct}%</span> (Must equal 100%)
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 font-medium">
            ⚠️ <strong>Downstream Effect:</strong> Installment Payment & Verification Schedule is disabled. Fee Schedule & Settlements and student payment views will completely hide installment cards and stages.
          </div>
        )}
      </div>

      {/* SECTION 3: University Fee vs Agency Fee Separation (Section A3 & A4) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Separate Agency Fee Configuration</h2>
              <p className="text-xs text-slate-500 font-medium">
                When enabled, cleanly bifurcates University/Tuition Fees from Agency/Service charges on Student and Settlement interfaces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              {separateAgencyFee ? 'Separation ON' : 'Separation OFF (Default)'}
            </span>
            <button
              type="button"
              onClick={() => setSeparateAgencyFee(!separateAgencyFee)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                separateAgencyFee ? 'bg-[#58051E]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  separateAgencyFee ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {!separateAgencyFee ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium space-y-1">
            <p className="font-bold text-slate-800">● Standard Simple Mode (Default)</p>
            <p>Students see and pay standard University / Tuition Fees directly. No separate agency payment stages are exposed to students.</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Model Selector */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Select Agency Billing Structure
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'agency_fee_only',
                    title: 'Option 1: Agency Fee Only',
                    desc: 'A single standalone service fee paid to the agency.'
                  },
                  {
                    id: 'milestones',
                    title: 'Option 2: Milestone Payments',
                    desc: 'Multiple service milestones (Offer, Visa, Pre-departure).'
                  },
                  {
                    id: 'milestone_plus_fee',
                    title: 'Option 3: Milestone + Agency Fee',
                    desc: 'Combines milestone charges with an agency service fee.'
                  }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setAgencyFeeModel(opt.id as any)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      agencyFeeModel === opt.id
                        ? 'border-[#58051E] bg-[#58051E]/5 ring-1 ring-[#58051E]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900">{opt.title}</span>
                      {agencyFeeModel === opt.id && <Check className="w-4 h-4 text-[#58051E]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Standalone Agency Fee Input (Option 1 & Option 3) */}
            {(agencyFeeModel === 'agency_fee_only' || agencyFeeModel === 'milestone_plus_fee') && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">
                    Standalone Agency Service Fee Amount
                  </label>
                  <input
                    type="number"
                    value={agencyFeeAmount}
                    onChange={(e) => setAgencyFeeAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={agencyFeeCurrency}
                    onChange={(e) => setAgencyFeeCurrency(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Milestones Builder (Option 2 & Option 3) */}
            {(agencyFeeModel === 'milestones' || agencyFeeModel === 'milestone_plus_fee') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Configured Agency Payment Milestones
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Each milestone is tracked with its own amount, invoice, due state, and recipient.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="h-8 px-3 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-[11px] font-black rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#58051E]" /> Add Milestone
                  </button>
                </div>

                <div className="space-y-2.5">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Milestone Name</span>
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => handleUpdateMilestone(idx, 'name', e.target.value)}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-900"
                            placeholder="e.g. Offer Letter Placement"
                          />
                        </div>

                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Amount (INR)</span>
                          <input
                            type="number"
                            value={m.amount}
                            onChange={(e) => handleUpdateMilestone(idx, 'amount', Number(e.target.value))}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-black text-slate-900"
                            placeholder="5000"
                          />
                        </div>

                        <div>
                          <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Due Trigger Event</span>
                          <input
                            type="text"
                            value={m.due_trigger}
                            onChange={(e) => handleUpdateMilestone(idx, 'due_trigger', e.target.value)}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700"
                            placeholder="e.g. On Unconditional Offer"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors self-end sm:self-center cursor-pointer"
                        title="Remove Milestone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: Basic Invoice & GST Details (Section A1 & L) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Landmark className="w-4.5 h-4.5 text-[#58051E]" /> Invoicing & Indian GST Compliance (18%)
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Applies to all platform invoices: Advanced Registration Fee, Agency Milestones, and Tuition billings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Company GSTIN</label>
            <input
              type="text"
              value={companyGstin}
              onChange={(e) => setCompanyGstin(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              placeholder="32AABCF1234F1Z8"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Company PAN</label>
            <input
              type="text"
              value={companyPan}
              onChange={(e) => setCompanyPan(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
              placeholder="AABCF1234F"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">GST Tax Rate</label>
            <div className="relative">
              <input
                type="number"
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(Number(e.target.value))}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                placeholder="18"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">% (9% CGST + 9% SGST)</span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Registered Billing Address</label>
            <input
              type="text"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Invoice / Receipt Prefix</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-1/2 h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
              <input
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                className="w-1/2 h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Invoice Disclaimer & Terms</label>
          <textarea
            rows={2}
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          />
        </div>
      </div>

      {/* SECTION 5: Supported Payment Channels */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <QrCode className="w-4.5 h-4.5 text-[#58051E]" /> Payment Gateway & Manual Methods
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            PhonePe UPI integration for direct digital collections alongside Education Admin cash & bank wire verification.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 block">PhonePe UPI Gateway</span>
              <span className="text-[10px] text-slate-500 font-medium block">VPA: {phonePeMerchantId}</span>
            </div>
            <button
              type="button"
              onClick={() => setPhonePeUpiEnabled(!phonePeUpiEnabled)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${
                phonePeUpiEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {phonePeUpiEnabled ? 'Active' : 'Disabled'}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 block">Bank Wire Transfer</span>
              <span className="text-[10px] text-slate-500 font-medium block">Offline UTR Verification</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 block">Edu Admin Cash Desk</span>
              <span className="text-[10px] text-slate-500 font-medium block">Physical Counter Deposit</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
