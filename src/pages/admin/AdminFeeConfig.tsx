import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, CheckCircle2, Shield, Building2, HelpCircle, Receipt, Percent, FileText, Check,
  Plus, Trash2, Edit3, Globe, Sparkles, Layers, DollarSign, AlertCircle
} from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useUniversities } from '../../hooks/useUniversities';
import { ToastNotification } from '../../components/ToastNotification';
import type { CustomPaymentItem, UniversityServiceFeeOverride } from '../../lib/api/feeConfig';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();
  const { universities } = useUniversities();

  // 1. Registration Fee (Flyviz Payment 1)
  const [advFeeEnabled, setAdvFeeEnabled] = useState<boolean>(config.advance_registration_fee_enabled ?? true);
  const [advFeeAmount, setAdvFeeAmount] = useState<number>(config.advance_registration_fee_amount ?? 1500);
  const [advFeeCurrency, setAdvFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.advance_registration_fee_currency || 'INR');
  const [advFeeGstEnabled, setAdvFeeGstEnabled] = useState<boolean>(config.gst_enabled_registration_fee ?? true);

  // 2. Cost for Documents for Visa (Flyviz Payment 2 - Pay after offer letter)
  const [docFeeEnabled, setDocFeeEnabled] = useState<boolean>(config.visa_documents_fee_enabled ?? true);
  const [docFeeAmount, setDocFeeAmount] = useState<number>(config.visa_documents_fee_amount ?? 15000);
  const [docFeeCurrency, setDocFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.visa_documents_fee_currency || 'INR');
  const [docFeeGstEnabled, setDocFeeGstEnabled] = useState<boolean>(config.gst_enabled_visa_documents_fee ?? true);

  // 3. Service Charge (Flyviz Payment 3 - Pay after visa)
  const [serviceFeeEnabled, setServiceFeeEnabled] = useState<boolean>(config.service_charge_enabled ?? true);
  const [serviceFeeAmount, setServiceFeeAmount] = useState<number>(config.service_charge_amount ?? 25000);
  const [serviceFeeCurrency, setServiceFeeCurrency] = useState<'INR' | 'EUR' | 'USD'>(config.service_charge_currency || 'INR');
  const [serviceFeeGstEnabled, setServiceFeeGstEnabled] = useState<boolean>(config.gst_enabled_service_charge ?? true);

  // 4. University-wise Service Fee Overrides
  const [uniOverrides, setUniOverrides] = useState<UniversityServiceFeeOverride[]>(config.university_service_fees || []);
  const [selectedUniId, setSelectedUniId] = useState('');
  const [customUniServiceFee, setCustomUniServiceFee] = useState<number>(25000);
  const [customUniDocFee, setCustomUniDocFee] = useState<number>(15000);
  const [customUniCurrency, setCustomUniCurrency] = useState<'INR' | 'EUR' | 'USD'>('INR');
  const [customUniNotes, setCustomUniNotes] = useState('');

  // 5. Additional Dynamic Custom Payments
  const [customPayments, setCustomPayments] = useState<CustomPaymentItem[]>(config.custom_payments || []);
  const [newPayTitle, setNewPayTitle] = useState('');
  const [newPayAmount, setNewPayAmount] = useState<number>(5000);
  const [newPayCurrency, setNewPayCurrency] = useState<'INR' | 'EUR' | 'USD'>('INR');
  const [newPayGst, setNewPayGst] = useState(true);
  const [newPayTrigger, setNewPayTrigger] = useState<CustomPaymentItem['trigger_stage']>('after_offer');
  const [newPayRecipient, setNewPayRecipient] = useState<'ferex' | 'direct_third_party'>('ferex');
  const [newPayDesc, setNewPayDesc] = useState('');

  // 6. Invoicing & GST Governance Settings
  const [companyGstin, setCompanyGstin] = useState(config.invoice_settings?.company_gstin || '32AAGCF8602A1Z8');
  const [companyPan, setCompanyPan] = useState(config.invoice_settings?.company_pan || 'AAGCF8602A');
  const [companyAddress, setCompanyAddress] = useState(
    config.invoice_settings?.company_address || '12/640 Thachukuzhi, Companipady Road , Nellikuzhy PO, Kothamangalam, Kerala - 686 691'
  );
  const [invoicePrefix, setInvoicePrefix] = useState(config.invoice_settings?.invoice_prefix || 'FRX-INV');
  const [receiptPrefix, setReceiptPrefix] = useState(config.invoice_settings?.receipt_prefix || 'FRX-RCP');
  const [sacCode, setSacCode] = useState(config.invoice_settings?.sac_code || '9983');
  const [termsConditions, setTermsConditions] = useState(
    config.invoice_settings?.terms_conditions ||
      'All consulting and onboarding services are billed under Indian GST SAC 9983 (18% GST: CGST 9% + SGST 9%). Governed by FEREX Admission Terms.'
  );

  const [toast, setToast] = useState('');

  // Sync state if external changes happen
  useEffect(() => {
    setAdvFeeEnabled(config.advance_registration_fee_enabled ?? true);
    setAdvFeeAmount(config.advance_registration_fee_amount ?? 1500);
    setAdvFeeCurrency(config.advance_registration_fee_currency || 'INR');
    setAdvFeeGstEnabled(config.gst_enabled_registration_fee ?? true);

    setDocFeeEnabled(config.visa_documents_fee_enabled ?? true);
    setDocFeeAmount(config.visa_documents_fee_amount ?? 15000);
    setDocFeeCurrency(config.visa_documents_fee_currency || 'INR');
    setDocFeeGstEnabled(config.gst_enabled_visa_documents_fee ?? true);

    setServiceFeeEnabled(config.service_charge_enabled ?? true);
    setServiceFeeAmount(config.service_charge_amount ?? config.agency_fee_amount ?? 25000);
    setServiceFeeCurrency(config.service_charge_currency || 'INR');
    setServiceFeeGstEnabled(config.gst_enabled_service_charge ?? true);

    setUniOverrides(config.university_service_fees || []);
    setCustomPayments(config.custom_payments || []);

    if (config.invoice_settings) {
      setCompanyGstin(config.invoice_settings.company_gstin || '32AAGCF8602A1Z8');
      setCompanyPan(config.invoice_settings.company_pan || 'AAGCF8602A');
      setCompanyAddress(
        config.invoice_settings.company_address || '12/640 Thachukuzhi, Companipady Road , Nellikuzhy PO, Kothamangalam, Kerala - 686 691'
      );
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
  const docBreakdown = calculateGstBreakdown(Number(docFeeAmount) || 0);
  const serviceBreakdown = calculateGstBreakdown(Number(serviceFeeAmount) || 0);

  // Add / update university service fee override
  const handleAddUniversityOverride = () => {
    if (!selectedUniId) {
      alert('Please select a university to override service fees.');
      return;
    }
    const foundUni = universities.find((u) => u.id === selectedUniId);
    const uniName = foundUni?.name || 'Selected University';

    const updated = uniOverrides.filter((o) => o.university_id !== selectedUniId);
    updated.push({
      university_id: selectedUniId,
      university_name: uniName,
      service_charge_amount: Number(customUniServiceFee),
      visa_documents_amount: Number(customUniDocFee),
      currency: customUniCurrency,
      notes: customUniNotes.trim(),
    });

    setUniOverrides(updated);
    setSelectedUniId('');
    setCustomUniNotes('');
    showToast(`Custom service fee configured for ${uniName}`);
  };

  const handleDeleteUniversityOverride = (uniId: string) => {
    setUniOverrides(uniOverrides.filter((o) => o.university_id !== uniId));
    showToast('University override removed');
  };

  // Add custom dynamic payment
  const handleAddCustomPayment = () => {
    if (!newPayTitle.trim()) {
      alert('Please enter a payment title.');
      return;
    }

    const triggerLabels: Record<string, string> = {
      before_reg: 'Before Registration Fee',
      after_agreement: 'After Service Agreement',
      before_application: 'Before University Application',
      after_offer: 'After Offer Letter',
      before_visa: 'Before Visa Lodgement',
      after_visa: 'After Visa Approval',
      pre_departure: 'Pre-Departure Briefing',
      custom: 'Custom Journey Milestone',
    };

    const newItem: CustomPaymentItem = {
      id: `custom_pay_${Date.now()}`,
      title: newPayTitle.trim(),
      amount: Number(newPayAmount),
      currency: newPayCurrency,
      gst_enabled: newPayGst,
      trigger_stage: newPayTrigger,
      trigger_label: triggerLabels[newPayTrigger] || 'Journey Milestone',
      recipient: newPayRecipient,
      recipient_label: newPayRecipient === 'ferex' ? 'Ferex / Flyviz' : 'Direct Student Payment (Third Party)',
      description: newPayDesc.trim() || 'Custom administrative fee or processing deposit.',
      enabled: true,
    };

    setCustomPayments([...customPayments, newItem]);
    setNewPayTitle('');
    setNewPayDesc('');
    showToast('Custom payment milestone added');
  };

  const handleDeleteCustomPayment = (id: string) => {
    setCustomPayments(customPayments.filter((p) => p.id !== id));
    showToast('Custom payment item removed');
  };

  const handleToggleCustomPayment = (id: string) => {
    setCustomPayments(
      customPayments.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();

    updateConfig({
      advance_registration_fee_enabled: advFeeEnabled,
      advance_registration_fee_amount: Number(advFeeAmount),
      advance_registration_fee_currency: advFeeCurrency,
      gst_enabled_registration_fee: advFeeGstEnabled,
      registration_fee_tax_type: 'GST 18% (CGST 9% + SGST 9% | SAC 9983)',

      visa_documents_fee_enabled: docFeeEnabled,
      visa_documents_fee_amount: Number(docFeeAmount),
      visa_documents_fee_currency: docFeeCurrency,
      gst_enabled_visa_documents_fee: docFeeGstEnabled,
      visa_documents_fee_tax_type: 'GST 18% (CGST 9% + SGST 9% | SAC 9983)',
      visa_documents_fee_trigger: 'Pay after the offer letter',

      service_charge_enabled: serviceFeeEnabled,
      service_charge_amount: Number(serviceFeeAmount),
      service_charge_currency: serviceFeeCurrency,
      gst_enabled_service_charge: serviceFeeGstEnabled,
      service_charge_tax_type: 'GST 18% (CGST 9% + SGST 9% | SAC 9983)',
      service_charge_trigger: 'Pay after visa',

      separate_agency_fee_enabled: serviceFeeEnabled,
      agency_fee_amount: Number(serviceFeeAmount),

      university_service_fees: uniOverrides,
      custom_payments: customPayments,

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

    showToast('All fee structures and customized payments saved successfully!');
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto text-left">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#570229] bg-[#570229]/10 px-2.5 py-0.5 rounded-md">
              Finance &amp; Governance
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Payments to Flyviz / Ferex
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Fee Structure &amp; Dynamic Payments Governance
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure the 3 core Flyviz payments, university-specific overrides, and customizable journey payment milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-[#570229] hover:bg-[#6F0335] shadow-xs transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Save className="w-4 h-4" /> Save Fee Architecture
        </button>
      </div>

      {/* Flyviz Payment Summary Banner */}
      <div className="bg-gradient-to-r from-[#570229]/5 via-amber-50/50 to-indigo-50/40 p-5 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#570229]" />
            <h2 className="text-sm font-black text-slate-900">
              Payments to Flyviz / Ferex Structure
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            <strong>1. Registration:</strong> Paid upon onboarding &bull; 
            <strong> 2. Cost for Documents for Visa:</strong> Pay after the offer letter &bull; 
            <strong> 3. Service Charge:</strong> Pay after visa approval.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            * Note: University Application, Tuition Fee, and VFS Embassy Charges are paid by students directly — not to Ferex.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-[#570229] font-mono shadow-xs">
            Total Package: ₹{(advFeeAmount + docFeeAmount + serviceFeeAmount).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* ── SECTION 1: The 3 Core Flyviz Payments ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Payment 1: Registration Fee */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#570229] text-white text-xs font-black flex items-center justify-center">
                1
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">Registration Fee</h3>
                <span className="text-[10px] text-emerald-700 font-bold">You already paid / Due at start</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={advFeeEnabled}
              onChange={(e) => setAdvFeeEnabled(e.target.checked)}
              className="rounded text-[#570229]"
              title="Enable / Disable Fee"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Gross Amount (with 18% GST)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={advFeeAmount}
                  onChange={(e) => setAdvFeeAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#570229]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  {advFeeCurrency}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Currency</span>
              <select
                value={advFeeCurrency}
                onChange={(e) => setAdvFeeCurrency(e.target.value as any)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[10.5px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Base:</span>
                <span className="font-mono font-bold">₹{advBreakdown.taxable}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>18% GST (CGST 9% + SGST 9%):</span>
                <span className="font-mono">₹{advBreakdown.totalGst}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment 2: Cost for Documents for Visa */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">Documents for Visa</h3>
                <span className="text-[10px] text-indigo-700 font-bold">Pay after the offer letter</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={docFeeEnabled}
              onChange={(e) => setDocFeeEnabled(e.target.checked)}
              className="rounded text-indigo-600"
              title="Enable / Disable Fee"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Gross Amount (with 18% GST)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={docFeeAmount}
                  onChange={(e) => setDocFeeAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#570229]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  {docFeeCurrency}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Currency</span>
              <select
                value={docFeeCurrency}
                onChange={(e) => setDocFeeCurrency(e.target.value as any)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-200/60 text-[10.5px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Base:</span>
                <span className="font-mono font-bold">₹{docBreakdown.taxable}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>18% GST (CGST 9% + SGST 9%):</span>
                <span className="font-mono">₹{docBreakdown.totalGst}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment 3: Service Charge */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white text-xs font-black flex items-center justify-center">
                3
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">Service Charge</h3>
                <span className="text-[10px] text-emerald-800 font-bold">Pay after visa</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={serviceFeeEnabled}
              onChange={(e) => setServiceFeeEnabled(e.target.checked)}
              className="rounded text-emerald-700"
              title="Enable / Disable Fee"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Standard Amount (General Service Fee)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={serviceFeeAmount}
                  onChange={(e) => setServiceFeeAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#570229]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  {serviceFeeCurrency}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Currency</span>
              <select
                value={serviceFeeCurrency}
                onChange={(e) => setServiceFeeCurrency(e.target.value as any)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-[10.5px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Base:</span>
                <span className="font-mono font-bold">₹{serviceBreakdown.taxable}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>18% GST (CGST 9% + SGST 9%):</span>
                <span className="font-mono">₹{serviceBreakdown.totalGst}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: University-Wise Service Fee Overrides ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">University-Wise Service Fee Overrides</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Customizable
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Set custom service fees or visa document costs for specific universities. If not set, the general service fee applies.
              </p>
            </div>
          </div>
        </div>

        {/* Add Override Form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
              Select University
            </label>
            <select
              value={selectedUniId}
              onChange={(e) => setSelectedUniId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#570229]"
            >
              <option value="">-- Choose University --</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.country || 'Europe'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
              Custom Service Charge (₹)
            </label>
            <input
              type="number"
              value={customUniServiceFee}
              onChange={(e) => setCustomUniServiceFee(Number(e.target.value))}
              placeholder="e.g. 35000"
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
              Custom Visa Doc Cost (₹)
            </label>
            <input
              type="number"
              value={customUniDocFee}
              onChange={(e) => setCustomUniDocFee(Number(e.target.value))}
              placeholder="e.g. 18000"
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddUniversityOverride}
              className="w-full h-10 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Set Override
            </button>
          </div>
        </div>

        {/* Existing Overrides List */}
        {uniOverrides.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">University</th>
                  <th className="py-2.5 px-4">Visa Documents Cost</th>
                  <th className="py-2.5 px-4">Service Charge</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {uniOverrides.map((ov) => (
                  <tr key={ov.university_id}>
                    <td className="py-3 px-4 font-bold text-slate-900">{ov.university_name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      ₹{Number(ov.visa_documents_amount || 15000).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      ₹{Number(ov.service_charge_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteUniversityOverride(ov.university_id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-md cursor-pointer transition-colors"
                        title="Remove override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            No university-specific overrides configured. All universities use the General Service Fee (₹{serviceFeeAmount.toLocaleString('en-IN')}) and Visa Document Cost (₹{docFeeAmount.toLocaleString('en-IN')}).
          </div>
        )}
      </div>

      {/* ── SECTION 3: Additional Dynamic Payments & Journey Triggers ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Custom Dynamic Payments &amp; Journey Triggers</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Highly Customizable
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Add additional payments before or after any journey step. These dynamically reflect in student payments and roadmap.
              </p>
            </div>
          </div>
        </div>

        {/* Add Custom Payment Form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Payment Title *
              </label>
              <input
                type="text"
                value={newPayTitle}
                onChange={(e) => setNewPayTitle(e.target.value)}
                placeholder="e.g. Apostille Express Processing"
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                value={newPayAmount}
                onChange={(e) => setNewPayAmount(Number(e.target.value))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Trigger in Journey
              </label>
              <select
                value={newPayTrigger}
                onChange={(e) => setNewPayTrigger(e.target.value as any)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#570229]"
              >
                <option value="before_reg">Before Registration Fee</option>
                <option value="after_agreement">After Service Agreement</option>
                <option value="before_application">Before University Application</option>
                <option value="after_offer">After Offer Letter</option>
                <option value="before_visa">Before Visa Lodgement</option>
                <option value="after_visa">After Visa Approval</option>
                <option value="pre_departure">Pre-Departure &amp; Arrival</option>
                <option value="custom">Custom Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Recipient / Payee
              </label>
              <select
                value={newPayRecipient}
                onChange={(e) => setNewPayRecipient(e.target.value as any)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#570229]"
              >
                <option value="ferex">Ferex / Flyviz (Pay Online / Account)</option>
                <option value="direct_third_party">Direct Student Payment (Third Party)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={newPayDesc}
                onChange={(e) => setNewPayDesc(e.target.value)}
                placeholder="Optional description / details for student..."
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#570229]"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomPayment}
              className="h-10 px-4 rounded-xl text-xs font-bold text-white bg-[#570229] hover:bg-[#6F0335] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Payment Item
            </button>
          </div>
        </div>

        {/* Custom Payments Table */}
        {customPayments.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Title &amp; Description</th>
                  <th className="py-2.5 px-4">Trigger Stage</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{p.title}</span>
                      <span className="text-[11px] text-slate-500">{p.description}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{p.trigger_label}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          p.recipient === 'ferex'
                            ? 'bg-[#570229]/10 text-[#570229]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.recipient === 'ferex' ? 'Ferex / Flyviz' : 'Direct (3rd Party)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleCustomPayment(p.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase cursor-pointer ${
                          p.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomPayment(p.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-md cursor-pointer transition-colors"
                        title="Delete payment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            No additional custom payments configured yet. Use the form above to add custom fees at any journey step.
          </div>
        )}
      </div>

      {/* ── SECTION 4: Invoicing & Statutory GST Governance ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Official Invoicing &amp; GST Governance</h2>
            <p className="text-xs text-slate-500 font-medium">
              Statutory GSTIN, PAN, and address printed on official invoices and the Student Service Agreement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
              Company GSTIN
            </label>
            <input
              type="text"
              value={companyGstin}
              onChange={(e) => setCompanyGstin(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
              Company PAN
            </label>
            <input
              type="text"
              value={companyPan}
              onChange={(e) => setCompanyPan(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
              SAC Code
            </label>
            <input
              type="text"
              value={sacCode}
              onChange={(e) => setSacCode(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#570229]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
            Registered Head Office Address
          </label>
          <input
            type="text"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#570229]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
            Terms &amp; Conditions (Printed on Invoices &amp; Receipts)
          </label>
          <textarea
            rows={3}
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#570229]"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="h-10 px-6 rounded-xl text-xs font-bold text-white bg-[#570229] hover:bg-[#6F0335] shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
};
