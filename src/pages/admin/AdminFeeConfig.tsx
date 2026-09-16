import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, CheckCircle2, Shield, Building2, HelpCircle, GraduationCap, Briefcase, Percent, Calendar
} from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';

const TAX_OPTIONS = [
  'GST 18% (SAC 9983 - Education Support Services)',
  'GST 18% (SAC 9985 - Visa & Document Advisory)',
  'GST 12% (SAC 9984 - Educational Training)',
  'GST 5% (Concessional / Specific Exemption)',
  'Zero Rated / Overseas Remittance (LUT)',
  'Exempt / Non-Taxable (Govt Fee / Consular)',
  'No Tax (Direct Overseas Remittance / University Direct)',
];

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  // 1. Advanced Registration Fee State
  const [advFeeEnabled, setAdvFeeEnabled] = useState<boolean>(config.advance_registration_fee_enabled ?? true);
  const [advFeeAmount, setAdvFeeAmount] = useState<number>(config.advance_registration_fee_amount ?? 1500);
  const [advFeeCurrency, setAdvFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.advance_registration_fee_currency || 'INR');
  const [advGstEnabled, setAdvGstEnabled] = useState<boolean>(config.gst_enabled_registration_fee ?? true);
  const [advTaxType, setAdvTaxType] = useState<string>(config.registration_fee_tax_type || TAX_OPTIONS[0]);

  // 2. Agency Fee & VFS Fee Tax State
  const [agencyFeeEnabled, setAgencyFeeEnabled] = useState<boolean>(config.separate_agency_fee_enabled ?? false);
  const [agencyFeeAmount, setAgencyFeeAmount] = useState<number>(config.agency_fee_amount ?? 25000);
  const [agencyFeeCurrency, setAgencyFeeCurrency] = useState<string>(config.agency_fee_currency || 'INR');
  const [agencyGstEnabled, setAgencyGstEnabled] = useState<boolean>(config.gst_enabled_agency_fee ?? true);
  const [agencyTaxType, setAgencyTaxType] = useState<string>(config.agency_fee_tax_type || TAX_OPTIONS[0]);

  const [vfsGstEnabled, setVfsGstEnabled] = useState<boolean>(config.gst_enabled_vfs_fee ?? false);
  const [vfsTaxType, setVfsTaxType] = useState<string>(config.vfs_fee_tax_type || 'Exempt / Non-Taxable (Govt Fee / Consular)');

  // 3. Tuition Fee & Installments Governance
  const [tuitionGstEnabled, setTuitionGstEnabled] = useState<boolean>(config.gst_enabled_tuition_fee ?? false);
  const [tuitionTaxType, setTuitionTaxType] = useState<string>(config.tuition_fee_tax_type || 'No Tax (Direct Overseas Remittance / University Direct)');
  const [tuitionInstallmentsEnabled, setTuitionInstallmentsEnabled] = useState<boolean>(config.tuition_installments_platform_enabled ?? true);
  const [tuitionPaymentMode, setTuitionPaymentMode] = useState<'single' | 'installment'>(config.tuition_payment_mode || 'installment');
  const [inst1Pct, setInst1Pct] = useState<number>(config.installment_percentages?.installment_1 ?? 30);
  const [inst2Pct, setInst2Pct] = useState<number>(config.installment_percentages?.installment_2 ?? 40);
  const [inst3Pct, setInst3Pct] = useState<number>(config.installment_percentages?.installment_3 ?? 30);

  // 4. Invoicing & Statutory Compliance State
  const [companyGstin, setCompanyGstin] = useState(config.invoice_settings?.company_gstin || '32AABCF1234F1Z8');
  const [companyPan, setCompanyPan] = useState(config.invoice_settings?.company_pan || 'AABCF1234F');
  const [companyAddress, setCompanyAddress] = useState(config.invoice_settings?.company_address || 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042');
  const [invoicePrefix, setInvoicePrefix] = useState(config.invoice_settings?.invoice_prefix || 'FRX-INV');
  const [receiptPrefix, setReceiptPrefix] = useState(config.invoice_settings?.receipt_prefix || 'FRX-RCP');
  const [taxRatePct, setTaxRatePct] = useState(config.invoice_settings?.tax_rate_percent ?? 18);
  const [termsConditions, setTermsConditions] = useState(config.invoice_settings?.terms_conditions || 'All consultancy and onboarding services are subject to 18% Indian GST (SAC 9983). Non-refundable once university application is lodged.');

  const [toast, setToast] = useState('');

  // Sync state if external changes happen
  useEffect(() => {
    setAdvFeeEnabled(config.advance_registration_fee_enabled ?? true);
    setAdvFeeAmount(config.advance_registration_fee_amount ?? 1500);
    setAdvFeeCurrency(config.advance_registration_fee_currency || 'INR');
    setAdvGstEnabled(config.gst_enabled_registration_fee ?? true);
    setAdvTaxType(config.registration_fee_tax_type || TAX_OPTIONS[0]);

    setAgencyFeeEnabled(config.separate_agency_fee_enabled ?? false);
    setAgencyFeeAmount(config.agency_fee_amount ?? 25000);
    setAgencyFeeCurrency(config.agency_fee_currency || 'INR');
    setAgencyGstEnabled(config.gst_enabled_agency_fee ?? true);
    setAgencyTaxType(config.agency_fee_tax_type || TAX_OPTIONS[0]);

    setVfsGstEnabled(config.gst_enabled_vfs_fee ?? false);
    setVfsTaxType(config.vfs_fee_tax_type || 'Exempt / Non-Taxable (Govt Fee / Consular)');

    setTuitionGstEnabled(config.gst_enabled_tuition_fee ?? false);
    setTuitionTaxType(config.tuition_fee_tax_type || 'No Tax (Direct Overseas Remittance / University Direct)');
    setTuitionInstallmentsEnabled(config.tuition_installments_platform_enabled ?? true);
    setTuitionPaymentMode(config.tuition_payment_mode || 'installment');
    setInst1Pct(config.installment_percentages?.installment_1 ?? 30);
    setInst2Pct(config.installment_percentages?.installment_2 ?? 40);
    setInst3Pct(config.installment_percentages?.installment_3 ?? 30);

    if (config.invoice_settings) {
      setCompanyGstin(config.invoice_settings.company_gstin || '32AABCF1234F1Z8');
      setCompanyPan(config.invoice_settings.company_pan || 'AABCF1234F');
      setCompanyAddress(config.invoice_settings.company_address || 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042');
      setInvoicePrefix(config.invoice_settings.invoice_prefix || 'FRX-INV');
      setReceiptPrefix(config.invoice_settings.receipt_prefix || 'FRX-RCP');
      setTaxRatePct(config.invoice_settings.tax_rate_percent ?? 18);
      setTermsConditions(config.invoice_settings.terms_conditions || '');
    }
  }, [config]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();

    updateConfig({
      advance_registration_fee_enabled: advFeeEnabled,
      advance_registration_fee_amount: Number(advFeeAmount),
      advance_registration_fee_currency: advFeeCurrency,
      gst_enabled_registration_fee: advGstEnabled,
      registration_fee_tax_type: advTaxType,

      separate_agency_fee_enabled: agencyFeeEnabled,
      agency_fee_amount: Number(agencyFeeAmount),
      agency_fee_currency: agencyFeeCurrency,
      gst_enabled_agency_fee: agencyGstEnabled,
      agency_fee_tax_type: agencyTaxType,

      gst_enabled_vfs_fee: vfsGstEnabled,
      vfs_fee_tax_type: vfsTaxType,

      gst_enabled_tuition_fee: tuitionGstEnabled,
      tuition_fee_tax_type: tuitionTaxType,
      tuition_installments_platform_enabled: tuitionInstallmentsEnabled,
      tuition_payment_mode: tuitionPaymentMode,
      installment_percentages: {
        installment_1: Number(inst1Pct),
        installment_2: Number(inst2Pct),
        installment_3: Number(inst3Pct),
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

    showToast('Financial Governance & GST Configuration successfully saved!');
  };

  return (
    <div className="space-y-6 text-left antialiased select-none max-w-5xl mx-auto pb-16">
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
              ● Dynamic GST & Fee Governance Active
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Fee & Financial Governance</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure Advanced Registration Fee, Agency & University Fees, dynamic GST toggles, and Tuition Installment schedules.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="h-10 px-5 bg-[#58051E] text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-[#430316] transition-all shadow-md cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Save className="w-4 h-4" /> Save Fee Governance
        </button>
      </div>

      {/* SECTION 1: Advanced Registration Fee */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Advanced Registration Fee</h2>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory platform onboarding & intake deposit charged to newly registered students.
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
          <div className="space-y-4">
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
                    placeholder="1500"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                    {advFeeCurrency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Default intake deposit (e.g. ₹1,500). Reflected dynamically on student onboarding & payment screens.
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
                  Applicable currency for tax invoicing and payment receipts.
                </p>
              </div>
            </div>

            {/* GST Governance for Advanced Registration Fee */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800">GST on Advanced Registration Fee</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    advGstEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {advGstEnabled ? 'GST Active' : 'GST Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, tax breakdown is displayed on student payment vouchers and printed on tax invoices.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setAdvGstEnabled(!advGstEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    advGstEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      advGstEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {advGstEnabled && (
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Tax Classification / SAC Code
                </label>
                <select
                  value={advTaxType}
                  onChange={(e) => setAdvTaxType(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                >
                  {TAX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Advanced Registration Fee is currently disabled. Students will bypass this fee stage upon registration.
          </div>
        )}
      </div>

      {/* SECTION 2: University & Agency Fees Tax Governance */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">University & Agency Fees Tax Governance</h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure independent GST application and tax categories for Agency Processing, VFS Embassy, and University Fees.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* 2.1 Stage 02 - Agency Processing Fee */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">Stage 02 • Agency Processing Fee</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    agencyFeeEnabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {agencyFeeEnabled ? 'Separate Fee Enabled' : 'Included in Package'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Platform consultancy/visa service fee (e.g. ₹25,000 / ~€278).
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  {agencyFeeEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setAgencyFeeEnabled(!agencyFeeEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    agencyFeeEnabled ? 'bg-[#58051E]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      agencyFeeEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {agencyFeeEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Agency Processing Amount
                  </label>
                  <input
                    type="number"
                    value={agencyFeeAmount}
                    onChange={(e) => setAgencyFeeAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-[#58051E]"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Currency
                  </label>
                  <select
                    value={agencyFeeCurrency}
                    onChange={(e) => setAgencyFeeCurrency(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700">GST on Agency Processing Fee</span>
                <p className="text-[11px] text-slate-400">Toggle whether 18% GST applies to consultancy & agency fee.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAgencyGstEnabled(!agencyGstEnabled)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                    agencyGstEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      agencyGstEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-slate-600 w-16">{agencyGstEnabled ? 'Taxable' : 'Exempt'}</span>
              </div>
            </div>

            {agencyGstEnabled && (
              <div className="pt-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Agency Tax Classification</label>
                <select
                  value={agencyTaxType}
                  onChange={(e) => setAgencyTaxType(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#58051E]"
                >
                  {TAX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2.2 VFS & Consular Embassy Fee */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-900">VFS & Embassy Consular Fees</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Consular charges paid directly to embassy/VFS global centers.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setVfsGstEnabled(!vfsGstEnabled)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                    vfsGstEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      vfsGstEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-slate-600 w-16">{vfsGstEnabled ? 'GST Enabled' : 'Exempt'}</span>
              </div>
            </div>

            {vfsGstEnabled && (
              <div className="pt-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">VFS Tax Classification</label>
                <select
                  value={vfsTaxType}
                  onChange={(e) => setVfsTaxType(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#58051E]"
                >
                  {TAX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2.3 Direct University Tuition Fee Tax */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-900">University Tuition Remittance (Direct)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Direct student wire payments made to destination universities.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setTuitionGstEnabled(!tuitionGstEnabled)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                    tuitionGstEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      tuitionGstEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-slate-600 w-16">{tuitionGstEnabled ? 'GST Enabled' : 'Exempt'}</span>
              </div>
            </div>

            {tuitionGstEnabled && (
              <div className="pt-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Tuition Tax Classification</label>
                <select
                  value={tuitionTaxType}
                  onChange={(e) => setTuitionTaxType(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#58051E]"
                >
                  {TAX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Tuition Installments & Verification Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Tuition Installments & Verification Schedule</h2>
              <p className="text-xs text-slate-500 font-medium">
                Control whether tuition fees can be split into tranche installments or paid as a single upfront remittance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              {tuitionInstallmentsEnabled ? 'Installments Enabled' : 'Single Payment Only'}
            </span>
            <button
              type="button"
              onClick={() => setTuitionInstallmentsEnabled(!tuitionInstallmentsEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                tuitionInstallmentsEnabled ? 'bg-[#58051E]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  tuitionInstallmentsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {tuitionInstallmentsEnabled ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                Tuition Payment Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setTuitionPaymentMode('installment')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    tuitionPaymentMode === 'installment'
                      ? 'border-[#58051E] bg-[#58051E]/5 text-[#58051E]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>Tranche Milestone Installments</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tuition split across 3 milestones: Admission Letter, Visa Verification, Campus Arrival.
                  </p>
                </div>

                <div
                  onClick={() => setTuitionPaymentMode('single')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    tuitionPaymentMode === 'single'
                      ? 'border-[#58051E] bg-[#58051E]/5 text-[#58051E]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Percent className="w-4 h-4" />
                    <span>Single 100% Upfront Wire</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Student pays full yearly tuition in a single international SWIFT remittance.
                  </p>
                </div>
              </div>
            </div>

            {tuitionPaymentMode === 'installment' && (
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-black text-slate-800">Installment Tranche Percentages (%)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      1st Tranche (Pre-Visa)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inst1Pct}
                        onChange={(e) => setInst1Pct(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      2nd Tranche (Visa Issuance)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inst2Pct}
                        onChange={(e) => setInst2Pct(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      3rd Tranche (Post-Arrival)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={inst3Pct}
                        onChange={(e) => setInst3Pct(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Total Allocation:</span>
                  <span className={`font-black ${inst1Pct + inst2Pct + inst3Pct === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {inst1Pct + inst2Pct + inst3Pct}% {inst1Pct + inst2Pct + inst3Pct !== 100 && '(Must equal 100%)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Installment schedule is deactivated globally. All university fees must be settled as a single full remittance.
          </div>
        )}
      </div>

      {/* SECTION 4: Invoicing & GST Compliance */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Invoicing & GST Compliance</h2>
            <p className="text-xs text-slate-500 font-medium">
              Legal business entities, GSTIN, and tax compliance details printed on student tax invoices and receipts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Company GSTIN
            </label>
            <input
              type="text"
              value={companyGstin}
              onChange={(e) => setCompanyGstin(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
              placeholder="32AABCF1234F1Z8"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Company PAN
            </label>
            <input
              type="text"
              value={companyPan}
              onChange={(e) => setCompanyPan(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
              placeholder="AABCF1234F"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Applicable Tax Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(Number(e.target.value))}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                placeholder="18"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">% GST</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Tax Invoice Prefix
            </label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
              placeholder="FRX-INV"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Receipt Voucher Prefix
            </label>
            <input
              type="text"
              value={receiptPrefix}
              onChange={(e) => setReceiptPrefix(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
              placeholder="FRX-RCP"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
            Registered Business Entity Address
          </label>
          <input
            type="text"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
            placeholder="FEREX Tower, Infopark Expressway, Kochi, Kerala 682042"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
            Legal Terms, Conditions & Policy Notice
          </label>
          <textarea
            rows={3}
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
            placeholder="All advisory services are subject to Indian GST. Non-refundable once visa dossier submitted."
          />
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="h-11 px-6 bg-[#58051E] text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-[#430316] transition-all shadow-md cursor-pointer"
        >
          <Save className="w-4 h-4" /> Save Fee Governance & GST Compliance
        </button>
      </div>
    </div>
  );
};

