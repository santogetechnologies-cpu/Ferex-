import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Calendar, Percent, Save, X,
  CreditCard, Clock, ShieldAlert, CheckCircle2,
  Globe, Receipt, AlertTriangle
} from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { DEFAULT_FEE_CONFIG } from '../../lib/api/feeConfig';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  const [activeTab, setActiveTab] = useState<'rates' | 'methods' | 'timing' | 'late_refund' | 'invoice'>('rates');

  // Base Fee Settings
  const [agencyFee, setAgencyFee] = useState(config.default_agency_fee || '₹15,000');
  const [vfsFee, setVfsFee] = useState(config.default_vfs_fee || '₹8,500');
  const [advanceRegInr, setAdvanceRegInr] = useState(config.advance_registration_fee_inr ?? 15000);
  const [advanceRegEur, setAdvanceRegEur] = useState(config.advance_registration_fee_eur ?? 150);

  const [countryFees, setCountryFees] = useState<Record<string, { registration_fee_inr: number; registration_fee_eur: number; description: string }>>(
    config.country_fees || DEFAULT_FEE_CONFIG.country_fees || {}
  );

  const [inst1Pct, setInst1Pct] = useState(config.installment_percentages?.installment_1 ?? 30);
  const [inst2Pct, setInst2Pct] = useState(config.installment_percentages?.installment_2 ?? 40);
  const [inst3Pct, setInst3Pct] = useState(config.installment_percentages?.installment_3 ?? 30);

  const [intakes, setIntakes] = useState<string[]>(config.global_active_intakes || ['October 2026', 'February 2027', 'September 2027']);
  const [newIntakeInput, setNewIntakeInput] = useState('');

  // Currency Settings (Preserved defaults without tab)
  const defaultCurrency = config.currency_settings?.default_currency || 'INR';
  const eurToInrRate = config.currency_settings?.eur_to_inr_rate ?? 90;
  const usdToInrRate = config.currency_settings?.usd_to_inr_rate ?? 85;
  const multiCurrencyEnabled = config.currency_settings?.multi_currency_enabled ?? true;

  // Payment Methods
  const [stripeEnabled, setStripeEnabled] = useState(config.payment_methods?.stripe_enabled ?? true);
  const [upiEnabled, setUpiEnabled] = useState(config.payment_methods?.upi_enabled ?? true);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(config.payment_methods?.bank_transfer_enabled ?? true);
  const [cashAdminOnly, setCashAdminOnly] = useState(config.payment_methods?.cash_admin_only ?? true);

  // Installment Timing
  const [daysAfterOfferStage2, setDaysAfterOfferStage2] = useState(config.installment_timing?.days_after_offer_for_stage_2 ?? 7);
  const [daysBeforeVisaStage3, setDaysBeforeVisaStage3] = useState(config.installment_timing?.days_before_visa_for_stage_3 ?? 14);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(config.installment_timing?.auto_reminders_enabled ?? true);
  const [reminderFreqDays, setReminderFreqDays] = useState(config.installment_timing?.reminder_frequency_days ?? 3);

  // Late Payment & Refund
  const [lateFeeAmount, setLateFeeAmount] = useState(config.late_payment_settings?.late_fee_amount ?? 2500);
  const [gracePeriodDays, setGracePeriodDays] = useState(config.late_payment_settings?.grace_period_days ?? 5);
  const [autoSuspension, setAutoSuspension] = useState(config.late_payment_settings?.auto_suspension_enabled ?? false);

  const [refundStage1Pct, setRefundStage1Pct] = useState(config.refund_policy?.stage_1_refundable_pct ?? 0);
  const [refundStage2Pct, setRefundStage2Pct] = useState(config.refund_policy?.stage_2_refundable_pct ?? 50);
  const [refundStage3Pct, setRefundStage3Pct] = useState(config.refund_policy?.stage_3_refundable_pct ?? 80);
  const [deductionFee, setDeductionFee] = useState(config.refund_policy?.processing_deduction_fee ?? 5000);
  const [refundDays, setRefundDays] = useState(config.refund_policy?.refund_processing_days ?? 14);

  // Invoice Settings
  const [companyGstin, setCompanyGstin] = useState(config.invoice_settings?.company_gstin || '32AABCF1234F1Z8');
  const [companyPan, setCompanyPan] = useState(config.invoice_settings?.company_pan || 'AABCF1234F');
  const [companyAddress, setCompanyAddress] = useState(config.invoice_settings?.company_address || 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042');
  const [invoicePrefix, setInvoicePrefix] = useState(config.invoice_settings?.invoice_prefix || 'FRX-INV');
  const [receiptPrefix, setReceiptPrefix] = useState(config.invoice_settings?.receipt_prefix || 'FRX-RCP');
  const [taxRatePct, setTaxRatePct] = useState(config.invoice_settings?.tax_rate_percent ?? 18);
  const [termsConditions, setTermsConditions] = useState(config.invoice_settings?.terms_conditions || 'Payments once processed are governed by the FEREX Overseas Admission Policy.');

  const [toast, setToast] = useState('');

  const totalPct = Number(inst1Pct) + Number(inst2Pct) + Number(inst3Pct);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleAddIntake = () => {
    if (!newIntakeInput.trim()) return;
    const val = newIntakeInput.trim();
    if (!intakes.includes(val)) {
      setIntakes(prev => [...prev, val]);
    }
    setNewIntakeInput('');
  };

  const handleCountryFeeChange = (country: string, inr: number, eur: number) => {
    setCountryFees(prev => ({
      ...prev,
      [country]: {
        ...prev[country],
        registration_fee_inr: inr,
        registration_fee_eur: eur,
      }
    }));
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (totalPct !== 100) {
      showToast(`Warning: Installment percentages must sum to 100%. Current total: ${totalPct}%`);
      return;
    }

    updateConfig({
      currency: defaultCurrency === 'EUR' ? '€' : defaultCurrency === 'USD' ? '$' : '₹',
      default_agency_fee: agencyFee.startsWith('₹') || agencyFee.startsWith('€') || agencyFee.startsWith('$') ? agencyFee : `₹${agencyFee}`,
      default_vfs_fee: vfsFee.startsWith('₹') || vfsFee.startsWith('€') || vfsFee.startsWith('$') ? vfsFee : `₹${vfsFee}`,
      advance_registration_fee_inr: Number(advanceRegInr),
      advance_registration_fee_eur: Number(advanceRegEur),
      country_fees: countryFees,
      installment_percentages: {
        installment_1: Number(inst1Pct),
        installment_2: Number(inst2Pct),
        installment_3: Number(inst3Pct),
      },
      global_active_intakes: intakes,
      currency_settings: {
        default_currency: defaultCurrency,
        eur_to_inr_rate: Number(eurToInrRate),
        usd_to_inr_rate: Number(usdToInrRate),
        multi_currency_enabled: multiCurrencyEnabled,
      },
      payment_methods: {
        stripe_enabled: stripeEnabled,
        upi_enabled: upiEnabled,
        bank_transfer_enabled: bankTransferEnabled,
        cash_admin_only: cashAdminOnly,
      },
      installment_timing: {
        days_after_offer_for_stage_2: Number(daysAfterOfferStage2),
        days_before_visa_for_stage_3: Number(daysBeforeVisaStage3),
        auto_reminders_enabled: autoRemindersEnabled,
        reminder_frequency_days: Number(reminderFreqDays),
      },
      late_payment_settings: {
        late_fee_amount: Number(lateFeeAmount),
        grace_period_days: Number(gracePeriodDays),
        auto_suspension_enabled: autoSuspension,
      },
      refund_policy: {
        stage_1_refundable_pct: Number(refundStage1Pct),
        stage_2_refundable_pct: Number(refundStage2Pct),
        stage_3_refundable_pct: Number(refundStage3Pct),
        processing_deduction_fee: Number(deductionFee),
        refund_processing_days: Number(refundDays),
      },
      invoice_settings: {
        company_gstin: companyGstin,
        company_pan: companyPan,
        company_address: companyAddress,
        logo_url: config.invoice_settings?.logo_url || '/logo.png',
        invoice_prefix: invoicePrefix,
        receipt_prefix: receiptPrefix,
        tax_rate_percent: Number(taxRatePct),
        terms_conditions: termsConditions,
      }
    });

    showToast('Comprehensive fee, payment methods, timing, refund and invoice configuration saved successfully!');
  };

  const TABS_LIST = [
    { id: 'rates' as const, label: '1. Installment & Country Rates', icon: Percent },
    { id: 'methods' as const, label: '2. Payment Gateways', icon: CreditCard },
    { id: 'timing' as const, label: '3. Timing & Automation', icon: Clock },
    { id: 'late_refund' as const, label: '4. Late Fees & Refunds', icon: ShieldAlert },
    { id: 'invoice' as const, label: '5. Invoices & Taxation', icon: Receipt },
  ];

  return (
    <div className="space-y-5 relative text-left w-full max-w-full overflow-x-hidden">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prominent Sticky Header with Save Button */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-black shrink-0 border border-[#58051E]/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
              Fee & Financial Governance
            </h1>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              Configure installment thresholds, payment gateways, reminder schedules & invoices.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          Save All Settings
        </button>
      </div>

      {/* Navigation Sub-Tabs (Clean Wrap, No side scroll barrier) */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        {TABS_LIST.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#58051E] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Installment & Country Rates */}
      {activeTab === 'rates' && (
        <div className="space-y-5">
          {/* Base Advance Fee & Installment Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#58051E]" />
                Stage 1 Advance Registration Fee Default
              </h2>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Mandatory advance fee required to unlock university application dossier filing when country override is not set.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Fee in INR (₹)</label>
                  <input
                    type="number"
                    value={advanceRegInr}
                    onChange={(e) => setAdvanceRegInr(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Fee in EUR (€)</label>
                  <input
                    type="number"
                    value={advanceRegEur}
                    onChange={(e) => setAdvanceRegEur(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#58051E]" />
                  Total Tuition Installment Split (%)
                </h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  totalPct === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  Sum: {totalPct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Distribution ratio across 3 fee stages. Must total 100%.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 truncate">1st Inst (%)</label>
                  <input
                    type="number"
                    value={inst1Pct}
                    onChange={(e) => setInst1Pct(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 truncate">2nd Inst (%)</label>
                  <input
                    type="number"
                    value={inst2Pct}
                    onChange={(e) => setInst2Pct(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 truncate">3rd Inst (%)</label>
                  <input
                    type="number"
                    value={inst3Pct}
                    onChange={(e) => setInst3Pct(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Country Overrides */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#58051E]" />
                Country-Specific Advance Registration Fees
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(countryFees).map(([country, details]) => (
                <div key={country} className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{country}</span>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">Stage 1</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">INR (₹)</span>
                      <input
                        type="number"
                        value={details.registration_fee_inr}
                        onChange={(e) => handleCountryFeeChange(country, Number(e.target.value), details.registration_fee_eur)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">EUR (€)</span>
                      <input
                        type="number"
                        value={details.registration_fee_eur}
                        onChange={(e) => handleCountryFeeChange(country, details.registration_fee_inr, Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Intakes */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#58051E]" />
              Global Active Admission Intakes
            </h2>
            <div className="flex flex-wrap gap-2 items-center">
              {intakes.map(intake => (
                <span key={intake} className="px-3 py-1.5 bg-white text-[#58051E] border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs">
                  {intake}
                  <button
                    onClick={() => setIntakes(intakes.filter(i => i !== intake))}
                    className="text-slate-400 hover:text-rose-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. March 2027"
                  value={newIntakeInput}
                  onChange={(e) => setNewIntakeInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#58051E]"
                />
                <button
                  type="button"
                  onClick={handleAddIntake}
                  className="px-3 py-1.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Add Intake
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Rates & Intake Config
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Payment Gateways Control */}
      {activeTab === 'methods' && (
        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#58051E]" />
            Active Payment Gateways & Ingestion Channels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="pr-3">
                <span className="text-xs font-black text-slate-900 block">Stripe Online Payment Gateway</span>
                <p className="text-[11px] text-slate-500 font-medium">Credit cards, debit cards & international transactions.</p>
              </div>
              <input
                type="checkbox"
                checked={stripeEnabled}
                onChange={(e) => setStripeEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-[#58051E] accent-[#58051E] cursor-pointer"
              />
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="pr-3">
                <span className="text-xs font-black text-slate-900 block">UPI Payments (QR Code & VPA)</span>
                <p className="text-[11px] text-slate-500 font-medium">Instant UPI QR generation and UTR verification.</p>
              </div>
              <input
                type="checkbox"
                checked={upiEnabled}
                onChange={(e) => setUpiEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-[#58051E] accent-[#58051E] cursor-pointer"
              />
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="pr-3">
                <span className="text-xs font-black text-slate-900 block">Direct Bank Wire / NEFT (Admin Verified)</span>
                <p className="text-[11px] text-slate-500 font-medium">Official company wire transfer with bank swift proof.</p>
              </div>
              <input
                type="checkbox"
                checked={bankTransferEnabled}
                onChange={(e) => setBankTransferEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-[#58051E] accent-[#58051E] cursor-pointer"
              />
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="pr-3">
                <span className="text-xs font-black text-slate-900 block">Physical Cash Receipts (Admin Raised Only)</span>
                <p className="text-[11px] text-slate-500 font-medium">Recorded at admissions desk with automated GST receipt.</p>
              </div>
              <input
                type="checkbox"
                checked={cashAdminOnly}
                onChange={(e) => setCashAdminOnly(e.target.checked)}
                className="w-5 h-5 rounded text-[#58051E] accent-[#58051E] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Payment Gateways
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Timing & Automation */}
      {activeTab === 'timing' && (
        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#58051E]" />
            Installment Due Timelines & Automated Reminders
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Days after Offer Release for 2nd Installment
              </label>
              <input
                type="number"
                value={daysAfterOfferStage2}
                onChange={(e) => setDaysAfterOfferStage2(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400">Student has {daysAfterOfferStage2} days to deposit 2nd installment.</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Days before Visa Appointment for 3rd Installment
              </label>
              <input
                type="number"
                value={daysBeforeVisaStage3}
                onChange={(e) => setDaysBeforeVisaStage3(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400">Due {daysBeforeVisaStage3} days prior to departure clearance.</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Automated Due Date Reminder Engine</p>
                <p className="text-[11px] text-slate-500 font-medium">Sends in-app notifications and email reminders to students.</p>
              </div>
              <input
                type="checkbox"
                checked={autoRemindersEnabled}
                onChange={(e) => setAutoRemindersEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-[#58051E] accent-[#58051E] cursor-pointer"
              />
            </div>
            {autoRemindersEnabled && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <label className="text-xs font-bold text-slate-600">Reminder Trigger Frequency (Days before due date):</label>
                <input
                  type="number"
                  value={reminderFreqDays}
                  onChange={(e) => setReminderFreqDays(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Timing & Automation
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Late Payments & Refunds */}
      {activeTab === 'late_refund' && (
        <div className="space-y-4">
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Late Payment Surcharge & Grace Period
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Late Payment Surcharge Amount (₹)</label>
                <input
                  type="number"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#58051E]" />
              Refund Policy Rules (% Refundable by Stage)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Stage 1 Refundable %</label>
                <input
                  type="number"
                  value={refundStage1Pct}
                  onChange={(e) => setRefundStage1Pct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Advance Registration Fee</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Stage 2 Refundable %</label>
                <input
                  type="number"
                  value={refundStage2Pct}
                  onChange={(e) => setRefundStage2Pct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">If university rejects offer</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Stage 3 Refundable %</label>
                <input
                  type="number"
                  value={refundStage3Pct}
                  onChange={(e) => setRefundStage3Pct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">If visa is refused</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Fixed Processing Deduction (₹)</label>
                <input
                  type="number"
                  value={deductionFee}
                  onChange={(e) => setDeductionFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Refund Processing Window (Days)</label>
                <input
                  type="number"
                  value={refundDays}
                  onChange={(e) => setRefundDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Refund Policies
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Invoicing & Taxation */}
      {activeTab === 'invoice' && (
        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#58051E]" />
            Company Invoicing & GST Compliance Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Company GSTIN Number</label>
              <input
                type="text"
                value={companyGstin}
                onChange={(e) => setCompanyGstin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Company PAN</label>
              <input
                type="text"
                value={companyPan}
                onChange={(e) => setCompanyPan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Tax Rate (% GST)</label>
              <input
                type="number"
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Official Registered Address</label>
            <textarea
              rows={2}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Invoice Terms & Declaration</label>
            <textarea
              rows={2}
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Invoicing & GST Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
