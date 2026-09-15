import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle2, Lock, X, Upload, Clock,
  AlertCircle, FileText, Eye, QrCode, ShieldCheck, Building2, Briefcase, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { usePayments } from '../hooks/usePayments';
import { useApplications } from '../hooks/useApplications';
import { useUniversities } from '../hooks/useUniversities';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { createValidInvoicePdfBlob } from '../lib/api/payments';
import { InvoiceModal, type InvoiceData } from '../components/InvoiceModal';
import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';
import type { PaymentInstallment } from '../lib/types';

export function formatFeeEURandINR(feeStr?: string | number): string {
  if (!feeStr || feeStr === 'N/A' || feeStr === '—') return '—';
  const str = String(feeStr);
  if (str.includes('₹') && str.includes('€')) return str;
  const cleanStr = str.replace(/,/g, '');
  const numMatch = cleanStr.match(/(\d+)/);
  if (!numMatch) return str;
  const amount = parseInt(numMatch[1], 10);
  if (isNaN(amount) || amount === 0) return str;
  if (str.includes('€') || str.toLowerCase().includes('eur')) {
    const inrVal = Math.round(amount * 90);
    return `€${amount.toLocaleString('en-US')} (~₹${inrVal.toLocaleString('en-IN')})`;
  } else if (str.includes('₹') || str.toLowerCase().includes('inr')) {
    const eurVal = Math.round(amount / 90);
    return `₹${amount.toLocaleString('en-IN')} (~€${eurVal.toLocaleString('en-US')})`;
  }
  return `€${amount.toLocaleString('en-US')} (~₹${Math.round(amount * 90).toLocaleString('en-IN')})`;
}

export interface PaymentItem {
  id: string;
  itemType: 'advanced_registration' | 'agency_fee' | 'tuition_installment';
  title: string;
  stageName: string;
  amount: number;
  amountFormatted: string;
  description: string;
  dueDateStr: string;
  status: 'Paid' | 'Pending Verification' | 'Rejected' | 'Pending' | 'Upcoming';
  unlocked: boolean;
  notes?: string;
  utr?: string;
  verificationRequirement?: string;
  installmentIndex?: number;
}

export const Payments: React.FC = () => {
  const { user, profile } = useAuth();
  const { payments: dbPayments, submitProof, processPayment } = usePayments(user?.id);
  const { applications } = useApplications(user?.id);
  const { universities } = useUniversities();
  const { config } = useFeeConfig();

  const [viewInvoice, setViewInvoice] = useState<InvoiceData | null>(null);
  const [onlinePayItem, setOnlinePayItem] = useState<PaymentItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // 1. Identify student's active application & chosen university
  const activeApp = applications.find(a =>
    Boolean(a.course) &&
    Boolean(a.university_name) &&
    a.course !== 'Higher Studies' &&
    a.course !== 'Academic Recognition & Admission Initiation' &&
    a.university_name !== 'Pending Legalization Selection' &&
    a.university_name !== 'Pending University Selection'
  ) || null;

  const appliedUniversity = useMemo(() => {
    let uniId = activeApp?.university_id;
    let uniName = activeApp?.university_name;
    if (!uniId && !uniName) {
      try {
        const storedUni = localStorage.getItem('ferex_student_selected_uni');
        if (storedUni) {
          const parsed = JSON.parse(storedUni);
          uniId = parsed?.id;
          uniName = parsed?.name;
        }
      } catch (e) {}
    }
    return universities.find(u =>
      (uniId && u.id === uniId) ||
      (uniName && u.name?.toLowerCase().trim() === uniName.toLowerCase().trim())
    ) || null;
  }, [activeApp, universities]);

  const hasCourseSelected = Boolean(activeApp || appliedUniversity);
  const selectedCourse = activeApp?.course || activeApp?.program_name || 'Degree Program';
  const selectedUniversityName = appliedUniversity?.name || activeApp?.university_name || 'Selected University';

  // 2. Resolve Payment Records from Database
  const advPaymentRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return text.includes('registration') || text.includes('advance') || text.includes('audit deposit') || (p as any).stage_number === 1;
  });

  const agencyPaymentRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return text.includes('agency') && !text.includes('tuition');
  });

  const isAdvFeePaid = config.advance_registration_fee_enabled === false ||
    advPaymentRecord?.status === 'Paid' || advPaymentRecord?.status === 'Verified';

  const isAgencyFeePaid = agencyPaymentRecord?.status === 'Paid' || agencyPaymentRecord?.status === 'Verified';

  // 3. Build Payment Item 1: Advanced Registration Fee (Platform Intake Deposit)
  const isAdvanceFeeEnabled = config.advance_registration_fee_enabled !== false;
  const advanceFeeAmount = Number(config.advance_registration_fee_amount || config.advance_registration_fee_inr || 15000);
  const advanceFeeCurrency = config.advance_registration_fee_currency || 'INR';

  const advFeeItem: PaymentItem = {
    id: 'fee-advance-reg',
    itemType: 'advanced_registration',
    title: isAdvanceFeeEnabled
      ? `Advanced Registration Fee (${advanceFeeCurrency === 'EUR' ? '€' : advanceFeeCurrency === 'USD' ? '$' : '₹'} ${advanceFeeAmount.toLocaleString('en-IN')})`
      : 'Advanced Registration Fee (Waived by Policy)',
    stageName: 'Initial Platform Intake & Legalization Audit',
    amount: isAdvanceFeeEnabled ? advanceFeeAmount : 0,
    amountFormatted: isAdvanceFeeEnabled
      ? `${advanceFeeCurrency === 'EUR' ? '€' : advanceFeeCurrency === 'USD' ? '$' : '₹'} ${advanceFeeAmount.toLocaleString('en-IN')}`
      : 'Waived',
    description: isAdvanceFeeEnabled
      ? 'Advisory fee, student eligibility verification, institutional seat reservation, and initial compliance audit.'
      : 'Advanced registration deposit has been waived by administrative policy.',
    dueDateStr: isAdvanceFeeEnabled ? 'Due Before University Application' : 'Cleared',
    status: !isAdvanceFeeEnabled
      ? 'Paid'
      : isAdvFeePaid
      ? 'Paid'
      : advPaymentRecord?.status === 'Pending Verification'
      ? 'Pending Verification'
      : advPaymentRecord?.status === 'Rejected'
      ? 'Rejected'
      : 'Pending',
    unlocked: true,
    notes: advPaymentRecord?.reviewer_notes,
    utr: advPaymentRecord?.utr_number,
  };

  // 4. Build Payment Item 2: Separate Agency Processing Fee (Varies upon Country & University)
  const rawAgencyFeeStr = appliedUniversity?.agency_fee || config.default_agency_fee || '€250';
  const cleanAgencyNum = parseInt(String(rawAgencyFeeStr).replace(/[^0-9]/g, ''), 10) || 250;
  const agencyFeeInr = rawAgencyFeeStr.includes('€') ? cleanAgencyNum * 90 : cleanAgencyNum;
  const agencyFeeDesc = appliedUniversity?.agency_fee_description || 'FEREX Comprehensive Admissions Processing, Document Legalization Guidance & Offer Letter Handling';

  const agencyFeeItem: PaymentItem = {
    id: 'fee-agency-processing',
    itemType: 'agency_fee',
    title: `Agency Processing Fee (${formatFeeEURandINR(rawAgencyFeeStr)})`,
    stageName: 'Admissions Processing & Consular Support',
    amount: agencyFeeInr,
    amountFormatted: formatFeeEURandINR(rawAgencyFeeStr),
    description: agencyFeeDesc,
    dueDateStr: 'Due After Offer Letter Released',
    status: isAgencyFeePaid
      ? 'Paid'
      : agencyPaymentRecord?.status === 'Pending Verification'
      ? 'Pending Verification'
      : agencyPaymentRecord?.status === 'Rejected'
      ? 'Rejected'
      : isAdvFeePaid
      ? 'Pending'
      : 'Upcoming',
    unlocked: isAdvFeePaid,
    notes: agencyPaymentRecord?.reviewer_notes,
    utr: agencyPaymentRecord?.utr_number,
  };

  // 5. Build Payment Items 3: University Tuition Installments & Verification Schedule
  const installmentsEnabled = appliedUniversity ? (appliedUniversity.installments_enabled !== false) : true;
  const universityInstallmentsConfig: PaymentInstallment[] = (appliedUniversity?.installments && appliedUniversity.installments.length > 0)
    ? appliedUniversity.installments
    : [
        {
          id: 'inst-default-1',
          title: 'Tuition Installment #1 (Initial Seat Deposit)',
          amount: appliedUniversity?.tuition_range ? '50% of Tuition' : '€1,500',
          due_stage: 'On Offer Letter Approval',
          verification_requirement: 'Bank SWIFT Transfer Receipt Upload',
        },
        {
          id: 'inst-default-2',
          title: 'Tuition Installment #2 (Balance Tuition Fee)',
          amount: appliedUniversity?.tuition_range ? '50% of Tuition' : '€1,700',
          due_stage: 'Prior to Visa Filing / On Arrival',
          verification_requirement: 'University Fee Clearance Ledger Confirmation',
        }
      ];

  const tuitionInstallmentItems: PaymentItem[] = useMemo(() => {
    if (!installmentsEnabled) return [];

    return universityInstallmentsConfig.map((inst, index) => {
      const instRecord = dbPayments.find(p => {
        if ((p as any).installment_id === inst.id) return true;
        const text = (String(p.title || '') + ' ' + String(p.description || '')).toLowerCase();
        return (inst.title && text.includes(inst.title.toLowerCase())) ||
               text.includes(`tuition installment #${index + 1}`) ||
               text.includes(`installment ${index + 1}`) ||
               (p as any).stage_number === index + 2;
      });

      const isPaid = instRecord?.status === 'Paid' || instRecord?.status === 'Verified';
      const isPendingVerification = instRecord?.status === 'Pending Verification';
      const isRejected = instRecord?.status === 'Rejected';

      const rawAmountStr = String(inst.amount || '€1,500');
      const numMatch = rawAmountStr.replace(/,/g, '').match(/\d+/);
      const parsedNum = numMatch ? parseInt(numMatch[0], 10) : 1500;
      const amountInr = rawAmountStr.includes('€') ? parsedNum * 90 : parsedNum;

      // Stage unlocked if previous stages cleared
      const previousPaid = index === 0 ? isAdvFeePaid : (
        dbPayments.some(p => (p.status === 'Paid' || p.status === 'Verified') && String(p.title).includes(`Installment #${index}`))
      );

      return {
        id: inst.id || `inst-${index + 1}`,
        itemType: 'tuition_installment',
        installmentIndex: index + 1,
        title: inst.title || `Tuition Installment #${index + 1}`,
        stageName: inst.due_stage || 'Tuition Milestone',
        amount: amountInr,
        amountFormatted: formatFeeEURandINR(inst.amount),
        description: `Institutional tuition fee milestone for ${selectedUniversityName}. Verification Schedule Trigger: ${inst.due_stage || 'On Offer Letter Approval'}.`,
        dueDateStr: inst.due_stage || 'Milestone Verification',
        verificationRequirement: inst.verification_requirement || 'SWIFT Transfer Receipt Upload',
        status: isPaid
          ? 'Paid'
          : isPendingVerification
          ? 'Pending Verification'
          : isRejected
          ? 'Rejected'
          : previousPaid
          ? 'Pending'
          : 'Upcoming',
        unlocked: Boolean(previousPaid),
        notes: instRecord?.reviewer_notes,
        utr: instRecord?.utr_number,
      };
    });
  }, [installmentsEnabled, universityInstallmentsConfig, dbPayments, isAdvFeePaid, selectedUniversityName]);

  // Financial Outlay Totals
  const totalDueAmount = advFeeItem.amount + (hasCourseSelected ? agencyFeeItem.amount : 0) + tuitionInstallmentItems.reduce((acc, i) => acc + i.amount, 0);
  const totalPaidAmount = (advFeeItem.status === 'Paid' ? advFeeItem.amount : 0) +
                          (agencyFeeItem.status === 'Paid' ? agencyFeeItem.amount : 0) +
                          tuitionInstallmentItems.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.amount, 0);
  const totalPendingAmount = Math.max(0, totalDueAmount - totalPaidAmount);

  // Modal Submission Handlers
  const [payMethod, setPayMethod] = useState('UPI / GPay / PhonePe');
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Payment Gateway simulation states
  const [paymentMode, setPaymentMode] = useState<'gateway' | 'manual'>('gateway');
  const [gatewayType, setGatewayType] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { uploadFileToBucket } = await import('../lib/storage');
      const res = await uploadFileToBucket('receipts', file, 'payment_receipt');
      setReceiptUrl(res.url || URL.createObjectURL(file));
      showToast(`Receipt proof "${file.name}" uploaded successfully.`);
    }
  };

  const handleGatewaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setIsSubmitting(true);
      const studentIdVal = user?.id;
      const studentNameVal = profile?.full_name || user?.email?.split('@')[0] || 'Student';
      const methodLabel = gatewayType === 'card' ? 'Debit/Credit Card' : gatewayType === 'upi' ? `UPI (${upiId || 'GPay'})` : 'NetBanking';

      const completedPayment = await processPayment({
        student_id: studentIdVal,
        student_name: studentNameVal,
        title: selectedItem.title,
        amount: selectedItem.amount,
        payment_type: selectedItem.itemType === 'advanced_registration'
          ? 'Advanced Registration Fee'
          : selectedItem.itemType === 'agency_fee'
          ? 'Agency Processing Fee'
          : `Tuition Installment #${selectedItem.installmentIndex || 1}`,
        payment_method: `Direct: ${methodLabel}`,
      });

      setIsSubmitting(false);
      setSelectedItem(null);
      showToast(`Payment of ₹${selectedItem.amount.toLocaleString()} submitted and logged for verification.`);

      // Trigger automatic branded PDF download
      const generatedInvoiceNo = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const pdfBlob = createValidInvoicePdfBlob({
        invoice_no: generatedInvoiceNo,
        student_name: studentNameVal,
        amount: selectedItem.amount,
        currency: 'INR',
        title: selectedItem.title,
        payment_method: `Gateway: ${methodLabel}`,
        utr_number: completedPayment?.utr_number || `FEREX-GATEWAY-${Date.now()}`,
        paid_at: new Date().toISOString()
      });
      const url = URL.createObjectURL(pdfBlob);
      const element = document.createElement('a');
      element.href = url;
      element.download = `Invoice_${selectedItem.itemType}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      window.dispatchEvent(new Event('ferex_payment_change'));
    } catch (err: any) {
      setIsSubmitting(false);
      showToast(`Error: ${err.message || 'Payment failed'}`);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!utrNumber.trim()) {
      showToast('Please enter transaction UTR / Reference number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const studentIdVal = user?.id || 'demo-student-id';
      const studentNameVal = profile?.full_name || user?.email?.split('@')[0] || 'Student';

      await submitProof({
        student_id: studentIdVal,
        student_name: studentNameVal,
        title: selectedItem.title,
        amount: selectedItem.amount,
        payment_type: selectedItem.itemType === 'advanced_registration'
          ? 'Advanced Registration Fee'
          : selectedItem.itemType === 'agency_fee'
          ? 'Agency Processing Fee'
          : `Tuition Installment #${selectedItem.installmentIndex || 1}`,
        payment_method: payMethod,
        utr_number: utrNumber.trim(),
        receipt_url: receiptUrl || 'https://via.placeholder.com/150?text=Payment+Receipt',
      });

      setIsSubmitting(false);
      setSelectedItem(null);
      setUtrNumber('');
      setReceiptUrl('');
      showToast(`Payment proof for "${selectedItem.title}" submitted for review.`);
    } catch (err: any) {
      setIsSubmitting(false);
      showToast(`Error submitting payment: ${err.message || 'Submission failed'}`);
    }
  };

  const handleDownloadInvoice = (item: PaymentItem) => {
    const pdfBlob = createValidInvoicePdfBlob({
      invoice_no: `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      student_name: studentName,
      amount: item.amount,
      currency: 'INR',
      title: item.title,
      payment_method: 'Verified Bank Wire / UPI',
      utr_number: item.utr || 'VERIFIED-BANK-UTR-84920',
      paid_at: new Date().toISOString()
    });
    const url = URL.createObjectURL(pdfBlob);
    const element = document.createElement('a');
    element.href = url;
    element.download = `Official_Tax_Invoice_${item.itemType}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Tax invoice PDF generated for ${item.title}.`);
  };

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-card text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <CreditCard className="w-4 h-4 text-[#58051E]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
              Student Finance Portal
            </span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              ● 100% Transparent Financials
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Fee & Payment Schedule
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage your Advanced Registration Fee, University Agency Processing, and Tuition Installments.
          </p>
        </div>

        {appliedUniversity && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs shrink-0 self-start sm:self-auto">
            <Building2 className="w-4 h-4 text-[#58051E]" />
            <div>
              <span className="font-black text-slate-900 block leading-tight">{appliedUniversity.name}</span>
              <span className="text-[10px] text-slate-400 font-bold">{appliedUniversity.city}, {appliedUniversity.country}</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Total Program Outlay</span>
            <span className="text-[10px] font-bold text-slate-400">Includes Tuition</span>
          </div>
          <span className="text-2xl font-black text-slate-900 leading-none">
            ₹{totalDueAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-400 block mt-2">
            {hasCourseSelected ? `${selectedCourse} • ${selectedUniversityName}` : 'Advance Fee • Course Pending'}
          </span>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Verified & Settled</span>
            <Badge variant="success">Cleared</Badge>
          </div>
          <span className="text-2xl font-black text-emerald-600 leading-none">
            ₹{totalPaidAmount.toLocaleString('en-IN')}
          </span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all"
              style={{ width: `${totalDueAmount > 0 ? (totalPaidAmount / totalDueAmount) * 100 : 0}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Pending Balance</span>
            <Badge variant="neutral">Milestones</Badge>
          </div>
          <span className="text-2xl font-black text-slate-900 leading-none">
            ₹{totalPendingAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-400 block mt-2">Due across subsequent milestone phases</span>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── SECTION 1: Advanced Registration Fee (Default Onboarding) ── */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#58051E] text-white font-bold flex items-center justify-center text-xs">
              01
            </span>
            <h2 className="text-sm font-black text-slate-900">
              Advanced Registration Fee
            </h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Includes 18% GST (SAC 9983)
            </span>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Default Platform Onboarding Deposit</span>
        </div>

        <Card
          className={`p-5 flex flex-col justify-between transition-all select-none relative bg-white border ${
            advFeeItem.status === 'Paid'
              ? 'border-emerald-200/80 bg-emerald-50/10'
              : advFeeItem.status === 'Pending Verification'
              ? 'border-amber-200/80 bg-amber-50/10'
              : advFeeItem.status === 'Rejected'
              ? 'border-red-200/80 bg-red-50/10'
              : 'border-[#58051E]/30 shadow-subtle'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#58051E] bg-[#58051E]/10 px-2.5 py-1 rounded-md">
                Platform Onboarding & Seat Audit
              </span>
              {advFeeItem.status === 'Paid' && <Badge variant="success" dot>Paid & Cleared</Badge>}
              {advFeeItem.status === 'Pending Verification' && <Badge variant="brand" dot>In Verification</Badge>}
              {advFeeItem.status === 'Rejected' && <Badge variant="error" dot>Action Required</Badge>}
              {advFeeItem.status === 'Pending' && <Badge variant="neutral">Payment Due</Badge>}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">{advFeeItem.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{advFeeItem.description}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Outlay</span>
                <span className="text-2xl font-black text-slate-900">
                  {advFeeItem.amountFormatted}
                </span>
              </div>
            </div>

            {advFeeItem.notes && advFeeItem.status === 'Rejected' && (
              <div className="p-3 mb-3 bg-red-50/80 border border-red-200 rounded-lg text-xs text-red-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Admin Feedback:</span>
                  {advFeeItem.notes}
                </div>
              </div>
            )}

            {advFeeItem.status === 'Pending Verification' && (
              <div className="p-3 mb-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Under Compliance Review</span>
                  Reference UTR: <span className="font-mono font-semibold">{advFeeItem.utr || 'Logged'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-2">
            {advFeeItem.status === 'Paid' ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 h-9 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 w-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled & Verified
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewInvoice({
                      invoice_no: `FE/2026-27/${Math.floor(1000 + Math.random() * 9000)}`,
                      student_name: studentName,
                      amount: advFeeItem.amount,
                      currency: 'INR',
                      description: advFeeItem.title,
                      date: new Date().toISOString(),
                      payment_method: 'PhonePe UPI / Bank Transfer',
                      utr_number: advFeeItem.utr || 'VERIFIED-BANK-UTR-84920',
                      sac_code: '9983',
                      place_of_supply: 'India'
                    })}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Invoice (18% GST)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadInvoice(advFeeItem)}
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                  >
                    PDF Receipt
                  </Button>
                </div>
              </div>
            ) : advFeeItem.status === 'Pending Verification' ? (
              <div className="w-full h-9 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" /> Awaiting Admin Verification
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  size="sm"
                  className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold"
                  onClick={() => setOnlinePayItem(advFeeItem)}
                  leftIcon={<QrCode className="w-3.5 h-3.5" />}
                >
                  Pay Online (UPI / Card / NetBanking)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedItem(advFeeItem);
                    setUtrNumber('');
                  }}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload Bank Transfer Proof
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── SECTION 2: Separate Agency Processing Fee ───────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              02
            </span>
            <h2 className="text-sm font-black text-slate-900">
              Agency Processing Fee
            </h2>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Customized per University
            </span>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Admissions & Visa Filing Support</span>
        </div>

        {hasCourseSelected ? (
          <Card
            className={`p-5 flex flex-col justify-between transition-all select-none relative bg-white border ${
              agencyFeeItem.status === 'Paid'
                ? 'border-emerald-200/80 bg-emerald-50/10'
                : agencyFeeItem.status === 'Pending Verification'
                ? 'border-amber-200/80 bg-amber-50/10'
                : agencyFeeItem.status === 'Rejected'
                ? 'border-red-200/80 bg-red-50/10'
                : 'border-indigo-200/80 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {selectedUniversityName} Admissions Support
                </span>
                {agencyFeeItem.status === 'Paid' && <Badge variant="success" dot>Paid & Cleared</Badge>}
                {agencyFeeItem.status === 'Pending Verification' && <Badge variant="brand" dot>In Verification</Badge>}
                {agencyFeeItem.status === 'Rejected' && <Badge variant="error" dot>Action Required</Badge>}
                {agencyFeeItem.status === 'Pending' && <Badge variant="neutral">Payment Due</Badge>}
                {agencyFeeItem.status === 'Upcoming' && <Badge variant="neutral">Unlocks After Registration</Badge>}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{agencyFeeItem.title}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{agencyFeeItem.description}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Agency Outlay</span>
                  <span className="text-2xl font-black text-slate-900">
                    {agencyFeeItem.amountFormatted}
                  </span>
                </div>
              </div>

              {agencyFeeItem.status === 'Pending Verification' && (
                <div className="p-3 mb-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Under Verification</span>
                    Reference UTR: <span className="font-mono font-semibold">{agencyFeeItem.utr || 'Logged'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-2">
              {agencyFeeItem.status === 'Paid' ? (
                <div className="w-full h-9 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Agency Processing Fee Cleared
                </div>
              ) : agencyFeeItem.status === 'Pending Verification' ? (
                <div className="w-full h-9 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" /> Awaiting Review
                </div>
              ) : agencyFeeItem.unlocked ? (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Button
                    size="sm"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    onClick={() => setOnlinePayItem(agencyFeeItem)}
                    leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  >
                    Settle Agency Fee Online
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedItem(agencyFeeItem);
                      setUtrNumber('');
                    }}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Upload Bank Transfer Proof
                  </Button>
                </div>
              ) : (
                <div className="w-full h-9 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Complete Advanced Registration Fee to Unlock
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-800">Select Destination University</h3>
              <p className="text-slate-500 mt-0.5">
                Agency processing fee is configured individually per destination university and country.
              </p>
            </div>
            <Link to="/student/select-university">
              <Button size="sm" variant="outline" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                Browse Universities
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── SECTION 3: University Tuition Installments & Verification ─ */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
              03
            </span>
            <h2 className="text-sm font-black text-slate-900">
              Tuition Installments & Verification Schedule
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold">University Fee Distribution</span>
        </div>

        {!hasCourseSelected ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-xs font-bold text-slate-800">Institution-Specific Tuition Installments</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please choose your destination university in the <strong>Select University</strong> catalog to view the university's official tuition installment milestones and verification schedule triggers.
            </p>
            <div className="pt-1">
              <Link to="/student/select-university">
                <Button size="sm" className="bg-[#58051E] text-white">
                  Go to University Selection
                </Button>
              </Link>
            </div>
          </div>
        ) : !installmentsEnabled ? (
          <div className="p-5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-1.5 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Direct Institutional Payment Configured</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Tuition fees for <strong>{selectedUniversityName}</strong> are settled directly with the university's official bank account prior to visa filing or upon arrival. No platform tuition installment submissions are required.
            </p>
          </div>
        ) : tuitionInstallmentItems.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            No installment milestones defined for this university.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tuitionInstallmentItems.map((inst) => {
              const isPaid = inst.status === 'Paid';
              const isPendingVerification = inst.status === 'Pending Verification';
              const isRejected = inst.status === 'Rejected';
              const isPending = inst.status === 'Pending';

              return (
                <Card
                  key={inst.id}
                  className={`p-5 flex flex-col justify-between transition-all select-none relative bg-white border ${
                    isPaid
                      ? 'border-emerald-200/80 bg-emerald-50/10'
                      : isPendingVerification
                      ? 'border-amber-200/80 bg-amber-50/10'
                      : isRejected
                      ? 'border-red-200/80 bg-red-50/10'
                      : isPending
                      ? 'border-[#58051E]/30 shadow-subtle'
                      : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-7 h-7 rounded-lg bg-[#58051E] text-white font-bold flex items-center justify-center text-xs">
                        {inst.installmentIndex}
                      </span>
                      {isPaid && <Badge variant="success" dot>Paid</Badge>}
                      {isPendingVerification && <Badge variant="brand" dot>In Verification</Badge>}
                      {isRejected && <Badge variant="error" dot>Action Required</Badge>}
                      {isPending && <Badge variant="neutral">Pending</Badge>}
                      {!isPaid && !isPendingVerification && !isRejected && !isPending && (
                        <Badge variant="neutral">Locked</Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">{inst.title}</h3>
                    <p className="text-xs text-[#58051E] font-semibold mb-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#58051E]" /> Trigger: {inst.stageName}
                    </p>

                    <div className="my-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Milestone Fee</span>
                      <span className="text-lg font-black text-slate-900">{inst.amountFormatted}</span>
                    </div>

                    {inst.verificationRequirement && (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 mb-3 space-y-0.5">
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Verification Requirement:</span>
                        <span className="font-semibold text-slate-800">{inst.verificationRequirement}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-2">
                    {isPaid ? (
                      <div className="w-full h-9 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified & Cleared
                      </div>
                    ) : isPendingVerification ? (
                      <div className="w-full h-9 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" /> Awaiting Verification
                      </div>
                    ) : inst.unlocked ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold"
                          onClick={() => setOnlinePayItem(inst)}
                          leftIcon={<QrCode className="w-3.5 h-3.5" />}
                        >
                          Pay Online
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedItem(inst);
                            setUtrNumber('');
                          }}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Upload Proof
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-9 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Complete Prior Stages to Unlock
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Online Payment Modal */}
      {onlinePayItem && (
        <UnifiedPaymentModal
          isOpen={Boolean(onlinePayItem)}
          onClose={() => setOnlinePayItem(null)}
          onSuccess={() => {
            setOnlinePayItem(null);
            showToast(`Payment submitted successfully!`);
            window.dispatchEvent(new Event('ferex_payment_change'));
          }}
          division="education"
          amount={onlinePayItem.amount}
          currency="INR"
          title={onlinePayItem.title}
          purpose={onlinePayItem.description}
          payerName={studentName}
          payerEmail={user?.email || 'student@ferex.com'}
          studentId={user?.id}
        />
      )}

      {/* Bank Transfer Manual Proof Upload Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Submit Payment Proof</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{selectedItem.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex gap-1.5 mb-4 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMode('gateway')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    paymentMode === 'gateway' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Direct Gateway
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    paymentMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bank Wire / UTR
                </button>
              </div>

              {paymentMode === 'gateway' ? (
                <form onSubmit={handleGatewaySubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Amount Due:</span>
                    <span className="text-base font-black text-[#58051E]">₹{selectedItem.amount.toLocaleString('en-IN')}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['card', 'upi', 'netbanking'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setGatewayType(type as any)}
                          className={`h-9 rounded-xl text-xs font-bold border transition-colors text-center uppercase tracking-wide cursor-pointer ${
                            gatewayType === type
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {gatewayType === 'card' && (
                    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Card Number</label>
                        <input
                          required
                          type="text"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            setCardNumber(val);
                          }}
                          placeholder="4111 2222 3333 4444"
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry</label>
                          <input
                            required
                            type="text"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\s?/g, '');
                              if (val.length === 2 && !val.includes('/')) {
                                setCardExpiry(val + '/');
                              } else {
                                setCardExpiry(val);
                              }
                            }}
                            placeholder="MM/YY"
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">CVV</label>
                          <input
                            required
                            type="password"
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {gatewayType === 'upi' && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Enter UPI ID</label>
                      <input
                        required
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. yourname@okhdfcbank"
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold"
                    >
                      {isSubmitting ? 'Processing...' : `Pay ₹${selectedItem.amount.toLocaleString('en-IN')}`}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleProofSubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Amount Due:</span>
                    <span className="text-base font-black text-[#58051E]">₹{selectedItem.amount.toLocaleString('en-IN')}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction UTR / Reference Number</label>
                    <input
                      required
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 423984729182"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method Used</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="UPI / GPay / PhonePe">UPI / PhonePe / GPay</option>
                      <option value="NEFT / RTGS Bank Transfer">NEFT / RTGS Bank Wire</option>
                      <option value="IMPS Immediate Payment">IMPS Transfer</option>
                      <option value="International SWIFT Wire">International SWIFT Wire</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Upload Receipt Screenshot (PDF, JPG)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold"
                    >
                      {isSubmitting ? 'Uploading...' : 'Submit Proof'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Viewer Modal */}
      {viewInvoice && (
        <InvoiceModal
          isOpen={Boolean(viewInvoice)}
          onClose={() => setViewInvoice(null)}
          invoice={viewInvoice}
        />
      )}
    </div>
  );
};
