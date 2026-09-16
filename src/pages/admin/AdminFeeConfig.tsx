import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, CheckCircle2, Shield, Building2, HelpCircle
} from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  // 1. Advanced Registration Fee State (Kept as requested)
  const [advFeeEnabled, setAdvFeeEnabled] = useState<boolean>(config.advance_registration_fee_enabled ?? true);
  const [advFeeAmount, setAdvFeeAmount] = useState<number>(config.advance_registration_fee_amount ?? 1500);
  const [advFeeCurrency, setAdvFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.advance_registration_fee_currency || 'INR');

  // 2. Invoicing & Official Company Settings (Kept as requested, with GST elements removed)
  const [companyPan, setCompanyPan] = useState(config.invoice_settings?.company_pan || 'AABCF1234F');
  const [companyAddress, setCompanyAddress] = useState(config.invoice_settings?.company_address || 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042');
  const [invoicePrefix, setInvoicePrefix] = useState(config.invoice_settings?.invoice_prefix || 'FRX-INV');
  const [receiptPrefix, setReceiptPrefix] = useState(config.invoice_settings?.receipt_prefix || 'FRX-RCP');
  const [termsConditions, setTermsConditions] = useState(config.invoice_settings?.terms_conditions || 'All consultancy and onboarding services are provided by Ferex Ventures. Non-refundable once university application is lodged.');

  const [toast, setToast] = useState('');

  // Sync state if external changes happen
  useEffect(() => {
    setAdvFeeEnabled(config.advance_registration_fee_enabled ?? true);
    setAdvFeeAmount(config.advance_registration_fee_amount ?? 1500);
    setAdvFeeCurrency(config.advance_registration_fee_currency || 'INR');

    if (config.invoice_settings) {
      setCompanyPan(config.invoice_settings.company_pan || 'AABCF1234F');
      setCompanyAddress(config.invoice_settings.company_address || 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042');
      setInvoicePrefix(config.invoice_settings.invoice_prefix || 'FRX-INV');
      setReceiptPrefix(config.invoice_settings.receipt_prefix || 'FRX-RCP');
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
      gst_enabled_registration_fee: false,
      gst_enabled_agency_fee: false,
      gst_enabled_vfs_fee: false,
      gst_enabled_tuition_fee: false,

      invoice_settings: {
        company_gstin: '',
        company_pan: companyPan.trim(),
        company_address: companyAddress.trim(),
        invoice_prefix: invoicePrefix.trim(),
        receipt_prefix: receiptPrefix.trim(),
        tax_rate_percent: 0,
        terms_conditions: termsConditions.trim(),
      },
    });

    showToast('Fee Governance & Invoicing Configuration successfully saved!');
  };

  return (
    <div className="space-y-6 text-left antialiased select-none max-w-4xl mx-auto pb-16">
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
              ● Active Configuration
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Fee & Financial Governance</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure Advanced Registration Fee and official Invoicing settings.
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
                Platform onboarding & intake deposit charged to newly registered students.
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
                Applicable currency for receipts and vouchers.
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

      {/* SECTION 2: Invoicing Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Official Invoicing Settings</h2>
            <p className="text-xs text-slate-500 font-medium">
              Legal company identifiers, invoice prefixes, and address printed on official student bills & payment receipts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            Terms, Conditions & Policy Notice
          </label>
          <textarea
            rows={3}
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
            placeholder="All advisory services are provided by Ferex Ventures. Non-refundable once visa dossier is submitted."
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
