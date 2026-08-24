import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle2, Lock, Sparkles, X, Upload, Clock, AlertCircle, FileText, Eye } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { usePayments } from '../hooks/usePayments';
import { useApplications } from '../hooks/useApplications';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { createValidInvoicePdfBlob } from '../lib/api/payments';
import { InvoiceModal, type InvoiceData } from '../components/InvoiceModal';

interface Installment {
  id: number;
  stageNum: 1 | 2 | 3;
  title: string;
  stageName: string;
  amount: number;
  description: string;
  dueDateStr: string;
  status: 'Paid' | 'Pending Verification' | 'Rejected' | 'Pending' | 'Upcoming';
  unlocked: boolean;
  notes?: string;
  utr?: string;
}

export const Payments: React.FC = () => {
  const { user, profile } = useAuth();
  const { payments: dbPayments, submitProof, processPayment } = usePayments(user?.id);
  const { applications } = useApplications(user?.id);
  const { config } = useFeeConfig();

  const [viewInvoice, setViewInvoice] = useState<InvoiceData | null>(null);
  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // Dynamic Course Fee Lookup from Selected Application
  const activeApp = applications.find(a =>
    Boolean(a.course) &&
    Boolean(a.university_name) &&
    a.course !== 'Higher Studies' &&
    a.course !== 'Academic Recognition & Admission Initiation' &&
    a.university_name !== 'Pending NAWA Selection' &&
    a.university_name !== 'Pending University Selection' &&
    !a.university_name.includes('NAWA Partner')
  ) || null;

  const hasCourseSelected = Boolean(
    activeApp &&
    activeApp.course &&
    activeApp.university_name &&
    activeApp.university_name !== 'Pending University Selection' &&
    activeApp.university_name !== 'Pending NAWA Selection'
  );

  const selectedCourse = activeApp?.course || activeApp?.program_name || 'Selected European Program';
  const selectedUniversity = (activeApp?.university_name && activeApp.university_name !== 'Pending University Selection') ? activeApp.university_name : (activeApp?.universities?.name || 'University Applied For');

  // Robust Course Tuition Fee Parser (handles "€3,500", "₹3,15,000", "3.15 Lakhs", "315000", "3500")
  const parseCourseFee = (val?: any): { inr: number; formatted: string } => {
    if (!val || !hasCourseSelected) return { inr: 0, formatted: 'Pending University Selection' };

    const str = String(val).trim();
    const lower = str.toLowerCase();

    // 1. If expressed in Euros (€3,500 or 3500 EUR)
    if (str.includes('€') || lower.includes('eur') || lower.includes('euro')) {
      const cleaned = str.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        const inrAmount = Math.round(num * 90);
        return {
          inr: inrAmount,
          formatted: `₹${inrAmount.toLocaleString('en-IN')} (€${num.toLocaleString()}/yr)`
        };
      }
    }

    // 2. If expressed in Lakhs (e.g. "3.15 Lakhs", "3.15L", "7.5 Lakhs")
    if (lower.includes('lakh') || lower.includes('l') || lower.includes('lac')) {
      const match = str.match(/([0-9.]+)/);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0) {
          const inrAmount = num < 100 ? Math.round(num * 100000) : Math.round(num);
          const euroApprox = Math.round(inrAmount / 90);
          return {
            inr: inrAmount,
            formatted: `₹${inrAmount.toLocaleString('en-IN')} (€${euroApprox.toLocaleString()}/yr)`
          };
        }
      }
    }

    // 3. Raw numbers (e.g. "315000", "₹3,15,000", "3500")
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      // If number is small like 3500 (Euros), convert with x90
      if (num < 20000) {
        const inrAmount = Math.round(num * 90);
        return {
          inr: inrAmount,
          formatted: `₹${inrAmount.toLocaleString('en-IN')} (€${num.toLocaleString()}/yr)`
        };
      }
      // If number is small like 3.15 (Lakhs), convert with x100000
      if (num < 100) {
        const inrAmount = Math.round(num * 100000);
        const euroApprox = Math.round(inrAmount / 90);
        return {
          inr: inrAmount,
          formatted: `₹${inrAmount.toLocaleString('en-IN')} (€${euroApprox.toLocaleString()}/yr)`
        };
      }
      // Direct INR amount (e.g. 315000)
      const euroApprox = Math.round(num / 90);
      return {
        inr: Math.round(num),
        formatted: `₹${Math.round(num).toLocaleString('en-IN')} (€${euroApprox.toLocaleString()}/yr)`
      };
    }

    return { inr: 315000, formatted: '₹3,15,000 (€3,500/yr)' };
  };

  const rawFee = (activeApp as any)?.tuition_fee || (activeApp as any)?.course_fee || (activeApp as any)?.fee;
  const { inr: courseTuitionFee, formatted: formattedTuitionFee } = parseCourseFee(rawFee);

  // Extract Admin Fee & Intake Config values (Agency Fee & VFS Fee)
  const parseFeeNum = (strVal?: string, fallback: number = 0) => {
    if (!strVal) return fallback;
    const cleaned = String(strVal).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  };

  const configuredAgencyFee = parseFeeNum(config.default_agency_fee, 25000);
  const configuredVfsFee = parseFeeNum(config.default_vfs_fee, 28000);

  // Exact Fee & Intake Config Installment Structure:
  // 1st Installment: Registration & Legalization Audit Deposit (₹15,000)
  // 2nd Installment: Full University Tuition Fee (100% Selected Course Tuition Fee)
  // 3rd Installment: Agency Service & VFS Visa Clearance Fee (Configured in Admin Fee & Intake Config)
  const inst1Amount = 15000;
  const inst2Amount = courseTuitionFee;
  const inst3Amount = configuredAgencyFee + configuredVfsFee;

  // Helper to find DB record for stage
  const getStagePayment = (stageNum: number) => {
    return dbPayments.find(p => {
      // 1. Direct stage_number property matching if present
      if ((p as any).stage_number !== undefined && (p as any).stage_number !== null) {
        return Number((p as any).stage_number) === stageNum;
      }
      if ((p as any).installment_stage !== undefined && (p as any).installment_stage !== null) {
        return Number((p as any).installment_stage) === stageNum;
      }
      // 2. Strict ordinal word matching (1st, 2nd, 3rd)
      const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
      if (stageNum === 1) return text.includes('1st') || text.includes('stage 1') || text.includes('registration fee') || text.includes('audit deposit');
      if (stageNum === 2) return text.includes('2nd') || text.includes('stage 2') || text.includes('tuition fee');
      if (stageNum === 3) return text.includes('3rd') || text.includes('stage 3') || text.includes('vfs') || text.includes('visa clearance');
      return false;
    });
  };

  const p1 = getStagePayment(1);
  const p2 = getStagePayment(2);
  const p3 = getStagePayment(3);

  const p1Paid = p1?.status === 'Paid' || p1?.status === 'Verified';
  const p2Paid = p2?.status === 'Paid' || p2?.status === 'Verified';
  const p3Paid = p3?.status === 'Paid' || p3?.status === 'Verified';

  const installments: Installment[] = [
    {
      id: 1,
      stageNum: 1,
      title: '1st Installment — Process Initiation & Audit Deposit',
      stageName: 'Initial Registration & Audit',
      amount: inst1Amount,
      description: 'University choice allocation, portal registration, and document legalization audit. Unlocks university selection.',
      dueDateStr: 'Due Before University Application',
      status: p1Paid
        ? 'Paid'
        : p1?.status === 'Pending Verification'
        ? 'Pending Verification'
        : p1?.status === 'Rejected'
        ? 'Rejected'
        : 'Pending',
      unlocked: true,
      notes: p1?.reviewer_notes,
      utr: p1?.utr_number,
    },
    {
      id: 2,
      stageNum: 2,
      title: hasCourseSelected
        ? `2nd Installment — Course Tuition Fee (${formattedTuitionFee})`
        : '2nd Installment — Course Tuition Fee (Pending University Selection)',
      stageName: 'After Course Selection & Offer Letter',
      amount: hasCourseSelected ? inst2Amount : 0,
      description: hasCourseSelected
        ? `Selected Course Tuition Fee (${formattedTuitionFee}) for ${selectedCourse} at ${selectedUniversity}. Required for Official Final Acceptance Letter.`
        : 'Selected Course Tuition Fee will be calculated automatically once you select your university and course in the Applications portal.',
      dueDateStr: 'Due After Offer Letter Released',
      status: p2Paid
        ? 'Paid'
        : p2?.status === 'Pending Verification'
        ? 'Pending Verification'
        : p2?.status === 'Rejected'
        ? 'Rejected'
        : p1Paid
        ? 'Pending'
        : 'Upcoming',
      unlocked: p1Paid,
      notes: p2?.reviewer_notes,
      utr: p2?.utr_number,
    },
    {
      id: 3,
      stageNum: 3,
      title: '3rd Installment — Agency Service & Visa Clearance Fee',
      stageName: 'After Receiving Visa Approval',
      amount: hasCourseSelected ? inst3Amount : 0,
      description: `Agency consultancy service fee, embassy VFS appointment booking, pre-departure arrival packet, and visa clearance.`,
      dueDateStr: 'Due After Embassy Visa Approval',
      status: p3Paid
        ? 'Paid'
        : p3?.status === 'Pending Verification'
        ? 'Pending Verification'
        : p3?.status === 'Rejected'
        ? 'Rejected'
        : p2Paid
        ? 'Pending'
        : 'Upcoming',
      unlocked: p2Paid,
      notes: p3?.reviewer_notes,
      utr: p3?.utr_number,
    },
  ];

  const totalFee = inst1Amount + inst2Amount + inst3Amount;
  const paidTotal = installments.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.amount, 0);
  const pendingTotal = installments.filter(i => i.status === 'Pending' || i.status === 'Pending Verification').reduce((acc, i) => acc + i.amount, 0);

  // Modal & Toast states
  const [selectedInst, setSelectedInst] = useState<Installment | null>(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptUrl(URL.createObjectURL(file));
      showToast(`Receipt screenshot "${file.name}" attached successfully!`);
    }
  };

  const handleGatewaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;

    try {
      setIsSubmitting(true);

      // Simulate Processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const studentIdVal = user?.id || 'demo-student-id';
      const studentNameVal = profile?.full_name || user?.email?.split('@')[0] || 'Student';
      const methodLabel = gatewayType === 'card' ? 'Debit/Credit Card' : gatewayType === 'upi' ? `UPI (${upiId || 'GPay'})` : 'NetBanking';

      const completedPayment = await processPayment({
        student_id: studentIdVal,
        student_name: studentNameVal,
        title: selectedInst.title,
        amount: selectedInst.amount,
        payment_type: `${selectedInst.stageNum}st Installment`,
        payment_method: `Gateway: ${methodLabel}`,
      });

      setIsSubmitting(false);
      setSelectedInst(null);

      showToast(`⌛ Payment of ₹${selectedInst.amount.toLocaleString()} Submitted! Sent to Admin for Verification & Clearance.`);

      // Trigger automatic branded PDF download immediately
      const generatedInvoiceNo = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const pdfBlob = createValidInvoicePdfBlob({
        invoice_no: generatedInvoiceNo,
        student_name: studentNameVal,
        amount: selectedInst.amount,
        currency: 'INR',
        title: selectedInst.title,
        payment_method: `Gateway: ${methodLabel}`,
        utr_number: completedPayment?.utr_number || `FEREX-GATEWAY-${Date.now()}`,
        paid_at: new Date().toISOString()
      });
      const url = URL.createObjectURL(pdfBlob);
      const element = document.createElement('a');
      element.href = url;
      element.download = `Invoice_${selectedInst.stageNum}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      // Notify other parts of the app
      window.dispatchEvent(new Event('ferex_payment_change'));

    } catch (err: any) {
      setIsSubmitting(false);
      showToast(`Error: ${err.message || 'Payment failed'}`);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;
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
        title: selectedInst.title,
        amount: selectedInst.amount,
        payment_type: `${selectedInst.stageNum}st Installment`,
        payment_method: payMethod,
        utr_number: utrNumber.trim(),
        receipt_url: receiptUrl || 'https://via.placeholder.com/150?text=Payment+Receipt',
      });

      setIsSubmitting(false);
      setSelectedInst(null);
      setUtrNumber('');
      setReceiptUrl('');
      showToast(`Payment proof for ${selectedInst.title} submitted! Sent to Admin for verification.`);
    } catch (err: any) {
      setIsSubmitting(false);
      showToast(`Error submitting payment: ${err.message || 'Submission failed'}`);
    }
  };

  const handleDownloadInvoice = (inst: Installment) => {
    const pdfBlob = createValidInvoicePdfBlob({
      invoice_no: `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      student_name: studentName,
      amount: inst.amount,
      currency: 'INR',
      title: inst.title,
      payment_method: 'Verified Bank Wire / UPI',
      utr_number: inst.utr || 'VERIFIED-BANK-UTR-84920',
      paid_at: new Date().toISOString()
    });
    const url = URL.createObjectURL(pdfBlob);
    const element = document.createElement('a');
    element.href = url;
    element.download = `Official_Tax_Invoice_Stage_${inst.stageNum}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`🎉 Downloaded Tax Invoice & Receipt PDF for Stage ${inst.stageNum}`);
  };

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </span>
            Installment Payment & Verification Portal
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Submit payment proof, UTR transaction numbers, and receipts for admin approval.
          </p>
        </div>
      </div>
      {/* Dynamic Course Tuition Banner vs Initial Registration Notice */}
      {!hasCourseSelected ? (
        <div className="p-5 bg-gradient-to-r from-slate-900 via-[#6A1B2E] to-[#4A101E] text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-white/10">
          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-300/20">
              Stage 1 — Initial Registration Deposit
            </span>
            <h2 className="text-base md:text-lg font-black mt-1.5 text-white">
              Registration & Legalization Audit Deposit
            </h2>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              Clear the initial registration deposit below to unlock accredited university selection and course applications.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-extrabold text-slate-300 block">Initial Amount Required</span>
            <span className="text-xl font-black text-amber-300">₹{inst1Amount.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-gradient-to-r from-slate-900 via-[#6A1B2E] to-[#4A101E] text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-white/10">
          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-300/20">
              Selected Course Tuition Schedule
            </span>
            <h2 className="text-base md:text-lg font-black mt-1.5 text-white">
              {selectedCourse}
            </h2>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              Target Institution: <span className="font-extrabold text-white">{selectedUniversity}</span> — Full Tuition Fee paid in 2nd Installment.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-extrabold text-slate-300 block">Total Program Package</span>
            <span className="text-xl font-black text-amber-300">₹{totalFee.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Progress & Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200/80 bg-white">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            {!hasCourseSelected ? 'Initial Required Fee' : 'Total Package Fee'}
          </span>
          <span className="text-2xl font-black text-slate-900 leading-none">
            ₹{(!hasCourseSelected ? inst1Amount : totalFee).toLocaleString()}
          </span>
          <span className="text-[10.5px] font-extrabold text-slate-500 block mt-2">
            {!hasCourseSelected ? 'Stage 1 Registration Deposit' : 'Structured into 3 Milestones'}
          </span>
        </Card>

        <Card className="p-5 border border-emerald-100 bg-emerald-50/50">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">Verified & Paid</span>
          <span className="text-2xl font-black text-emerald-800 leading-none">₹{paidTotal.toLocaleString()}</span>
          <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-emerald-600 h-full transition-all" style={{ width: `${(paidTotal / (!hasCourseSelected ? inst1Amount : totalFee)) * 100}%` }} />
          </div>
        </Card>

        <Card className="p-5 border border-amber-100 bg-amber-50/50">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-700 block mb-1">Pending Balance</span>
          <span className="text-2xl font-black text-amber-800 leading-none">₹{pendingTotal.toLocaleString()}</span>
          <span className="text-[10.5px] font-extrabold text-amber-700 block mt-2">
            {installments.filter(i => i.status === 'Pending' || i.status === 'Pending Verification').length} Milestone(s) Remaining
          </span>
        </Card>
      </div>

      {/* 3 Installment Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          3-Stage Installment Payment & Verification Schedule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {installments.map((inst) => {
            const isPaid = inst.status === 'Paid';
            const isPendingVerification = inst.status === 'Pending Verification';
            const isRejected = inst.status === 'Rejected';
            const isPending = inst.status === 'Pending';

            return (
              <Card
                key={inst.id}
                className={`p-6 flex flex-col justify-between transition-all select-none relative overflow-hidden border ${
                  isPaid
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isPendingVerification
                    ? 'border-amber-200 bg-amber-50/20 shadow-xs'
                    : isRejected
                    ? 'border-red-200 bg-red-50/20'
                    : isPending
                    ? 'border-[#6A1B2E]/30 bg-white shadow-md'
                    : 'border-slate-200/60 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  {/* Top Stage Indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-xl bg-[#6A1B2E] text-white font-black flex items-center justify-center text-xs shadow-xs">
                      {inst.stageNum}
                    </span>
                    <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full border ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isPendingVerification
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-black animate-pulse'
                        : isRejected
                        ? 'bg-red-100 text-red-800 border-red-200 font-extrabold'
                        : isPending
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {isPendingVerification ? '⏳ Pending Verification' : inst.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug mb-1">{inst.title}</h3>
                  <p className="text-[11px] font-bold text-[#6A1B2E] mb-3">{inst.stageName}</p>

                  <div className="my-3 p-3 bg-slate-50/90 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Installment Amount</span>
                    <span className="text-2xl font-black text-slate-900">
                      {inst.amount > 0 ? `₹${inst.amount.toLocaleString('en-IN')}` : 'Pending University Selection'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-4">{inst.description}</p>

                  {/* Rejection Notes Notice */}
                  {isRejected && inst.notes && (
                    <div className="p-3 mb-3 bg-red-100/70 border border-red-200 rounded-xl text-xs font-semibold text-red-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">Admin Notes:</span>
                        {inst.notes}
                      </div>
                    </div>
                  )}

                  {/* Pending Verification Notice */}
                  {isPendingVerification && (
                    <div className="p-3 mb-3 bg-amber-100/70 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">Verification Underway</span>
                        UTR: <span className="font-black">{inst.utr || 'Submitted'}</span>. Admin will review and issue receipt shortly.
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100">
                  {isPaid ? (
                    <div className="space-y-2">
                      <div className="w-full h-10 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Payment Verified & Approved
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewInvoice({
                            invoice_no: `FE/2026-27/${Math.floor(1000 + Math.random() * 9000)}`,
                            student_name: studentName,
                            amount: inst.amount,
                            currency: 'INR',
                            description: inst.title,
                            date: new Date().toISOString(),
                            payment_method: 'Bank Transfer / UPI',
                            utr_number: inst.utr || 'VERIFIED-BANK-UTR-84920',
                            sac_code: '9992',
                            place_of_supply: 'Kerala'
                          })}
                          className="flex-1 h-9 bg-[#50001D] hover:bg-[#6b0027] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(inst)}
                          className="flex-1 h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#6A1B2E]" /> Download PDF
                        </button>
                      </div>
                    </div>
                  ) : isPendingVerification ? (
                    <div className="w-full h-10 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" /> Awaiting Admin Approval
                    </div>
                  ) : inst.unlocked ? (
                    <button
                      onClick={() => {
                        setSelectedInst(inst);
                        setUtrNumber('');
                      }}
                      className="w-full h-10 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-md shadow-[#6A1B2E]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" /> {isRejected ? 'Re-upload Payment Proof' : `Submit Payment Proof (₹${inst.amount.toLocaleString()})`}
                    </button>
                  ) : (
                    <div className="w-full h-10 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" /> Unlocks After Stage {inst.stageNum - 1} Approved
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Submit Payment Proof Modal */}
      <AnimatePresence>
        {selectedInst && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setSelectedInst(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Make Milestone Payment</h3>
                  <p className="text-xs font-semibold text-slate-400 truncate max-w-[280px]">{selectedInst.title}</p>
                </div>
                <button onClick={() => setSelectedInst(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMode('gateway')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    paymentMode === 'gateway' ? 'bg-[#6A1B2E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  💳 Secure Gateway
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    paymentMode === 'manual' ? 'bg-[#6A1B2E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  📄 Bank Transfer
                </button>
              </div>

              {paymentMode === 'gateway' ? (
                <form onSubmit={handleGatewaySubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Amount Due:</span>
                    <span className="text-base font-black text-[#6A1B2E]">₹{selectedInst.amount.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['card', 'upi', 'netbanking'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setGatewayType(type as any)}
                          className={`h-9 rounded-xl text-xs font-bold border transition-all text-center uppercase tracking-wide ${
                            gatewayType === type
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {gatewayType === 'card' && (
                    <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/50 rounded-2xl">
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Cardholder Name</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Card Number</label>
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Expiry Date</label>
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
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">CVV</label>
                          <input
                            required
                            type="password"
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="***"
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {gatewayType === 'upi' && (
                    <div className="p-4 bg-slate-50/75 border border-slate-200/50 rounded-2xl flex flex-col items-center space-y-3">
                      <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-150 flex items-center justify-center shadow-3xs">
                        <div className="w-full h-full border border-slate-100 flex flex-col items-center justify-center bg-slate-50 rounded-lg relative overflow-hidden select-none">
                          <span className="text-[10px] font-black text-[#6A1B2E]">FEREX SECURE</span>
                          <span className="text-[8px] font-bold text-slate-400 mt-1">Scan QR Code</span>
                          <div className="w-16 h-16 border-2 border-slate-800 rounded-lg mt-1 bg-white flex items-center justify-center">
                            <div className="w-10 h-10 border border-slate-400 border-dashed rounded bg-slate-50 flex items-center justify-center animate-pulse">
                              <span className="text-[8px] font-bold text-slate-400">QR</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-full">
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Or Enter UPI ID</label>
                        <input
                          required
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="rahul@okaxis"
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {gatewayType === 'netbanking' && (
                    <div className="p-4 bg-slate-50/75 border border-[#6A1B2E]/10 rounded-2xl">
                      <label className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Select Bank</label>
                      <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-950 focus:outline-none">
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="kotak">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInst(null)}
                      className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-9.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" /> Gateway Processing...
                        </>
                      ) : (
                        `Pay Instantly (₹${selectedInst.amount.toLocaleString()})`
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleProofSubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Amount Due:</span>
                    <span className="text-base font-black text-[#6A1B2E]">₹{selectedInst.amount.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                      Payment Method Used *
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    >
                      <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe / Paytm</option>
                      <option value="Bank Wire Transfer (NEFT / IMPS / RTGS)">Bank Wire Transfer (NEFT / IMPS / RTGS)</option>
                      <option value="Debit / Credit Card">Debit / Credit Card</option>
                      <option value="NetBanking">Online NetBanking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                      Transaction UTR / Reference Number *
                    </label>
                    <input
                      required
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. UTR128491048201 or Ref ID"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                      Upload Receipt / Screenshot Proof
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#6A1B2E]/40 transition-colors bg-slate-50">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="receipt-file-input"
                      />
                      <label htmlFor="receipt-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                        <FileText className="w-6 h-6 text-[#6A1B2E]" />
                        <span className="text-xs font-bold text-slate-700">Click to upload payment screenshot</span>
                        <span className="text-[10px] font-semibold text-slate-400">PNG, JPG, PDF up to 10MB</span>
                      </label>
                    </div>
                    {receiptUrl && (
                      <p className="text-[10.5px] font-extrabold text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot attached
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInst(null)}
                      className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs flex items-center gap-1.5"
                    >
                      {isSubmitting ? 'Submitting Proof...' : 'Submit Payment for Verification'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Tax Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(viewInvoice)}
        onClose={() => setViewInvoice(null)}
        invoice={viewInvoice}
      />
    </div>
  );
};
