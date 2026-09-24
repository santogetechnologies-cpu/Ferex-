import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, CheckCircle2, Shield, Building2, HelpCircle, Receipt, Percent, FileText, Check
} from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { ToastNotification } from '../../components/ToastNotification';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  // 1. Advanced Registration Fee State
  const [advFeeEnabled, setAdvFeeEnabled] = useState<boolean>(config.advance_registration_fee_enabled ?? true);
  const [advFeeAmount, setAdvFeeAmount] = useState<number>(config.advance_registration_fee_amount ?? 1500);
  const [advFeeCurrency, setAdvFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.advance_registration_fee_currency || 'INR');
  const [advFeeGstEnabled, setAdvFeeGstEnabled] = useState<boolean>(config.gst_enabled_registration_fee ?? true);

  // 2. Separate Agency Fee State
  const [agencyFeeEnabled, setAgencyFeeEnabled] = useState<boolean>(config.separate_agency_fee_enabled ?? true);
  const [agencyFeeAmount, setAgencyFeeAmount] = useState<number>(config.agency_fee_amount ?? 25000);
  const [agencyFeeCurrency, setAgencyFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>((config.agency_fee_currency as any) || 'INR');
  const [agencyFeeGstEnabled, setAgencyFeeGstEnabled] = useState<boolean>(config.gst_enabled_agency_fee ?? true);

  // 3. Official Invoicing & GST Governance Settings
  const [companyGstin, setCompanyGstin] = useState(config.invoice_settings?.company_gstin || '32AAGCF8602A1Z8');
  const [companyPan, setCompanyPan] = useState(config.invoice_settings?.company_pan || 'AAGCF8602A');
  const [companyAddress, setCompanyAddress] = useState(config.invoice_settings?.company_address || '12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691');
  const [invoicePrefix, setInvoicePrefix] = useState(config.invoice_settings?.invoice_prefix || 'FRX-INV');
  const [receiptPrefix, setReceiptPrefix] = useState(config.invoice_settings?.receipt_prefix || 'FRX-RCP');
  const [sacCode, setSacCode] = useState(config.invoice_settings?.sac_code || '9983');
  const [termsConditions, setTermsConditions] = useState(config.invoice_settings?.terms_conditions || 'All consultancy and onboarding services are provided by Ferex Ventures. Subject to 18% GST (CGST 9% + SGST 9%) under SAC 9983. Non-refundable once university application is lodged.');

  const [toast, setToast] = useState('');

  // Sync state if external changes happen
  useEffect(() => {
    setAdvFeeEnabled(config.advance_registration_fee_enabled ?? true);
    setAdvFeeAmount(config.advance_registration_fee_amount ?? 1500);
    setAdvFeeCurrency(config.advance_registration_fee_currency || 'INR');
    setAdvFeeGstEnabled(config.gst_enabled_registration_fee ?? true);

    setAgencyFeeEnabled(config.separate_agency_fee_enabled ?? true);
    setAgencyFeeAmount(config.agency_fee_amount ?? 25000);
    setAgencyFeeCurrency((config.agency_fee_currency as any) || 'INR');
    setAgencyFeeGstEnabled(config.gst_enabled_agency_fee ?? true);

    if (config.invoice_settings) {
      setCompanyGstin(config.invoice_settings.company_gstin || '32AAGCF8602A1Z8');
      setCompanyPan(config.invoice_settings.company_pan || 'AAGCF8602A');
      setCompanyAddress(config.invoice_settings.company_address || '12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691');
      setInvoicePrefix(config.invoice_settings.invoice_prefix || 'FRX-INV');
      setReceiptPrefix(config.invoice_settings.receipt_prefix || 'FRX-RCP');
      setSacCode(config.invoice_settings.sac_code || '9983');
      setTermsConditions(config.invoice_settings.terms_conditions || '');
    }
  }, [config]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Helper calculations for 18% GST (CGST 9% + SGST 9%)
  const calculateGstBreakdown = (grossAmount: number) => {
    const taxable = Number((grossAmount / 1.18).toFixed(2));
    const cgst = Number(((grossAmount - taxable) / 2).toFixed(2));
    const sgst = Number((grossAmount - taxable - cgst).toFixed(2));
    const totalGst = Number((cgst + sgst).toFixed(2));
    return { taxable, cgst, sgst, totalGst, total: grossAmount };
  };

  const advBreakdown = calculateGstBreakdown(Number(advFeeAmount) || 0);
  const agencyBreakdown = calculateGstBreakdown(Number(agencyFeeAmount) || 0);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();

    updateConfig({
      advance_registration_fee_enabled: advFeeEnabled,
      advance_registration_fee_amount: Number(advFeeAmount),
      advance_registration_fee_currency: advFeeCurrency,
      gst_enabled_registration_fee: advFeeGstEnabled,
      registration_fee_tax_type: 'GST 18% (CGST 9% + SGST 9% | SAC 9983)',

      separate_agency_fee_enabled: agencyFeeEnabled,
      agency_fee_amount: Number(agencyFeeAmount),
      agency_fee_currency: agencyFeeCurrency,
      gst_enabled_agency_fee: agencyFeeGstEnabled,
      agency_fee_tax_type: 'GST 18% (CGST 9% + SGST 9% | SAC 9983)',

      invoice_settings: {
        company_gstin: companyGstin.trim(),
        company_pan: companyPan.trim(),
        company_address: companyAddress.trim(),
        invoice_prefix: invoicePrefix.trim(),
        receipt_prefix: receiptPrefix.trim(),
        tax_rate_percent: 18,
        cgst_percent: 9,
        sgst_percent: 9,
        sac_code: sacCode.trim() || '9983',
        terms_conditions: termsConditions.trim(),
      },
    });

    showToast('Fee Governance & Official 18% GST (CGST 9% + SGST 9%) Invoicing Configuration successfully saved!');
  };

  return (
    <div className="space-y-6 text-left antialiased select-none max-w-4xl mx-auto pb-16">
      {/* Toast Notification */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
              Platform Financial Control
            </span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              ● Active 18% GST Governance (CGST 9% + SGST 9%)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Fee & Financial Governance</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure Advanced Registration Fee, Separate Agency Fee, and official 18% GST (CGST 9% + SGST 9%) Invoicing settings.
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Advanced Registration Fee</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Intake Deposit
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Platform onboarding & student eligibility audit deposit charged upon registration.
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
                  Registration Fee Amount (Gross Payment with GST)
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
                  Default student intake fee (e.g. ₹1,500). Printed on official invoice with CGST 9% & SGST 9%.
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
                  Applicable currency for receipts and official invoices.
                </p>
              </div>
            </div>

            {/* GST 18% (CGST 9% + SGST 9%) Breakdown Preview */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/70">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Percent className="w-3.5 h-3.5 text-amber-700" />
                  <span>GST Governance: 18% Total GST (CGST 9% + SGST 9% | SAC 9983)</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={advFeeGstEnabled}
                    onChange={(e) => setAdvFeeGstEnabled(e.target.checked)}
                    className="rounded text-[#58051E] focus:ring-[#58051E]"
                  />
                  <span>Apply 18% GST</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-amber-200/60">
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Taxable Base</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    ₹{advBreakdown.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">CGST (9%)</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    ₹{advBreakdown.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">SGST (9%)</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    ₹{advBreakdown.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-[#58051E]/10 p-2 rounded-lg border border-[#58051E]/20">
                  <span className="text-[10px] font-bold text-[#58051E] uppercase block">Total with 18% GST</span>
                  <span className="text-xs font-black text-[#58051E] font-mono">
                    ₹{advBreakdown.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Advanced Registration Fee is currently disabled. Students will bypass this fee stage upon registration.
          </div>
        )}
      </div>

      {/* SECTION 2: Separate Agency Fee */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Separate Agency Fee</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                  Admissions & Advisory
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive university admissions processing, document legalization, and consular advisory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              {agencyFeeEnabled ? 'Agency Fee Enabled' : 'Agency Fee Disabled'}
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

        {agencyFeeEnabled ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Standard Agency Fee Amount (Gross Payment with GST)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={agencyFeeAmount}
                    onChange={(e) => setAgencyFeeAmount(Number(e.target.value))}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#58051E] focus:bg-white"
                    placeholder="25000"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                    {agencyFeeCurrency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Default admissions processing fee (e.g. ₹25,000). Overridden per destination university if specified.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Billing Currency
                </label>
                <select
                  value={agencyFeeCurrency}
                  onChange={(e) => setAgencyFeeCurrency(e.target.value as any)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#58051E] cursor-pointer"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                </select>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Applicable currency for agency fee invoicing and vouchers.
                </p>
              </div>
            </div>

            {/* GST 18% (CGST 9% + SGST 9%) Breakdown Preview */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200/70">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Percent className="w-3.5 h-3.5 text-indigo-700" />
                  <span>GST Governance: 18% Total GST (CGST 9% + SGST 9% | SAC 9983)</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-900">
                  <input
                    type="checkbox"
                    checked={agencyFeeGstEnabled}
                    onChange={(e) => setAgencyFeeGstEnabled(e.target.checked)}
                    className="rounded text-[#58051E] focus:ring-[#58051E]"
                  />
                  <span>Apply 18% GST</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-indigo-200/60">
                <div className="bg-white/80 p-2 rounded-lg border border-indigo-200/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Taxable Base</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    ₹{agencyBreakdown.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-indigo-200/40">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">CGST (9%)</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    ₹{agencyBreakdown.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-indigo-200/40">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">SGST (9%)</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    ₹{agencyBreakdown.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-[#58051E]/10 p-2 rounded-lg border border-[#58051E]/20">
                  <span className="text-[10px] font-bold text-[#58051E] uppercase block">Total with 18% GST</span>
                  <span className="text-xs font-black text-[#58051E] font-mono">
                    ₹{agencyBreakdown.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Separate Agency Fee is currently disabled.
          </div>
        )}
      </div>

      {/* SECTION 3: Official Invoicing & GST Governance Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Official Invoicing & GST Governance Settings</h2>
            <p className="text-xs text-slate-500 font-medium">
              Statutory GSTIN, PAN, tax breakdown (CGST 9% + SGST 9% = 18% GST), and SAC codes printed on all student tax invoices.
            </p>
          </div>
        </div>

        {/* GST Structure Highlights Banner */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                Active Statutory GST Structure: 18% Total GST
              </span>
              <p className="text-[11px] font-semibold text-emerald-800">
                Central GST (CGST) @ 9.0% + State GST (SGST) @ 9.0% | SAC 9983 (Education Advisory & Placement)
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
            CGST 9% + SGST 9%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Company GSTIN
            </label>
            <input
              type="text"
              value={companyGstin}
              onChange={(e) => setCompanyGstin(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E] font-mono"
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
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E] font-mono"
              placeholder="AABCF1234F"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              SAC / HSN Code
            </label>
            <input
              type="text"
              value={sacCode}
              onChange={(e) => setSacCode(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E] font-mono"
              placeholder="9983"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
              placeholder="FRX-INV"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
            Terms, Conditions & Tax Policy Notice
          </label>
          <textarea
            rows={3}
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
            placeholder="All advisory services are provided by Ferex Ventures. Subject to 18% GST (CGST 9% + SGST 9%) under SAC 9983. Non-refundable once university application is lodged."
          />
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="h-11 px-6 bg-[#58051E] text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-[#430316] transition-all shadow-md cursor-pointer"
        >
          <Save className="w-4 h-4" /> Save Fee Governance
        </button>
      </div>
    </div>
  );
};
