import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle2, Lock, X, Upload, Clock,
  AlertCircle, FileText, Eye, QrCode, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { usePayments } from '../hooks/usePayments';
import { useApplications } from '../hooks/useApplications';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { createValidInvoicePdfBlob } from '../lib/api/payments';
import { InvoiceModal, type InvoiceData } from '../components/InvoiceModal';
import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';

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
  const [onlinePayInst, setOnlinePayInst] = useState<Installment | null>(null);
  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // Dynamic Course Fee Lookup from Selected Application
  const activeApp = applications.find(a =>
    Boolean(a.course) &&
    Boolean(a.university_name) &&
    a.course !== 'Higher Studies' &&
    a.course !== 'Academic Recognition & Admission Initiation' &&
    a.university_name !== 'Pending NAWA Selection' &&
    a.university_name !== 'Pending University Selection' &&
    !a.university_name?.includes('NAWA Partner')
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

  // Course Tuition Fee Parser
  const parseCourseFee = (val?: any): { inr: number; formatted: string } => {
    if (!val || !hasCourseSelected) return { inr: 0, formatted: 'Pending University Selection' };

    const str = String(val).trim();
    const lower = str.toLowerCase();

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

    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      if (num < 20000) {
        const inrAmount = Math.round(num * 90);
        return {
          inr: inrAmount,
          formatted: `₹${inrAmount.toLocaleString('en-IN')} (€${num.toLocaleString()}/yr)`
        };
      }
      if (num < 100) {
        const inrAmount = Math.round(num * 100000);
        const euroApprox = Math.round(inrAmount / 90);
        return {
          inr: inrAmount,
          formatted: `₹${inrAmount.toLocaleString('en-IN')} (€${euroApprox.toLocaleString()}/yr)`
        };
      }
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

  const parseFeeNum = (strVal?: string, fallback: number = 0) => {
    if (!strVal) return fallback;
    const cleaned = String(strVal).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  };

  const configuredAgencyFee = parseFeeNum(config.default_agency_fee, 25000);
  const configuredVfsFee = parseFeeNum(config.default_vfs_fee, 28000);

  const targetCountry = localStorage.getItem('ferex_student_target_country') || activeApp?.universities?.country || (activeApp as any)?.country || 'Poland';
  const countryFeeObj = config.country_fees?.[targetCountry] || config.country_fees?.[targetCountry.replace('United Kingdom', 'UK').replace('United States', 'USA')];
  const inst1Amount = countryFeeObj?.registration_fee_inr || config.advance_registration_fee_inr || 15000;
  const inst2Amount = courseTuitionFee;
  const inst3Amount = configuredAgencyFee + configuredVfsFee;

  const getStagePayment = (stageNum: number) => {
    return dbPayments.find(p => {
      if ((p as any).stage_number !== undefined && (p as any).stage_number !== null) {
        return Number((p as any).stage_number) === stageNum;
      }
      if ((p as any).installment_stage !== undefined && (p as any).installment_stage !== null) {
        return Number((p as any).installment_stage) === stageNum;
      }
      const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
      if (stageNum === 1) return text.includes('1st') || text.includes('stage 1') || text.includes('registration fee') || text.includes('advance') || text.includes('audit deposit');
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
      title: `1st Installment — Advance Registration Fee (₹${inst1Amount.toLocaleString('en-IN')})`,
      stageName: 'Initial Registration & Audit',
      amount: inst1Amount,
      description: `Advance advisory fee, country eligibility check (${targetCountry}), university allocation, and document legalization audit.`,
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
        ? `Course Tuition Fee (${formattedTuitionFee}) for ${selectedCourse} at ${selectedUniversity}. Required for Official Final Acceptance Letter.`
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
    if (!selectedInst) return;

    try {
      setIsSubmitting(true);

      const studentIdVal = user?.id;
      const studentNameVal = profile?.full_name || user?.email?.split('@')[0] || 'Student';
      const methodLabel = gatewayType === 'card' ? 'Debit/Credit Card' : gatewayType === 'upi' ? `UPI (${upiId || 'GPay'})` : 'NetBanking';

      const completedPayment = await processPayment({
        student_id: studentIdVal,
        student_name: studentNameVal,
        title: selectedInst.title,
        amount: selectedInst.amount,
        payment_type: `${selectedInst.stageNum}st Installment`,
        payment_method: `Direct: ${methodLabel}`,
      });

      setIsSubmitting(false);
      setSelectedInst(null);

      showToast(`Payment of ₹${selectedInst.amount.toLocaleString()} submitted and logged for verification.`);

      // Trigger automatic branded PDF download
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
      showToast(`Payment proof for Stage ${selectedInst.stageNum} submitted for review.`);
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
    showToast(`Tax invoice PDF generated for Stage ${inst.stageNum}.`);
  };

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-card text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <CreditCard className="w-4 h-4 text-[#58051E]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Fee Schedule & Settlements
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Submit milestone payments, upload UTR proofs, and access official tax invoices.
          </p>
        </div>
      </div>

      {/* Tuition / Program Overview Banner */}
      <div className="p-5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800 shadow-card">
        <div>
          <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
            {!hasCourseSelected ? 'Stage 01 Registration Deposit' : 'Program Fee Schedule'}
          </span>
          <h2 className="text-base font-semibold mt-2 text-white">
            {!hasCourseSelected ? 'Registration & Legalization Audit Deposit' : selectedCourse}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {!hasCourseSelected
              ? `Clear the initial registration deposit below to unlock accredited university selection (${targetCountry}).`
              : `Institution: ${selectedUniversity} — Tuition fee structured into milestone installments.`}
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0 bg-white/5 px-4 py-2.5 rounded-lg border border-white/10 w-full sm:w-auto">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
            {!hasCourseSelected ? 'Deposit Amount' : 'Total Program Fee'}
          </span>
          <span className="text-xl font-bold text-white">
            ₹{(!hasCourseSelected ? inst1Amount : totalFee).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Financial Metrics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            {!hasCourseSelected ? 'Initial Required Fee' : 'Total Package Fee'}
          </span>
          <span className="text-2xl font-bold text-slate-900 leading-none">
            ₹{(!hasCourseSelected ? inst1Amount : totalFee).toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 block mt-2">
            {!hasCourseSelected ? 'Stage 1 Deposit' : 'Structured into 3 Milestones'}
          </span>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Verified & Paid</span>
            <Badge variant="success">Cleared</Badge>
          </div>
          <span className="text-2xl font-bold text-slate-900 leading-none">₹{paidTotal.toLocaleString()}</span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all"
              style={{ width: `${(paidTotal / (!hasCourseSelected ? inst1Amount : totalFee)) * 100}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Pending Balance</span>
            <Badge variant="neutral">
              {installments.filter(i => i.status === 'Pending' || i.status === 'Pending Verification').length} Remaining
            </Badge>
          </div>
          <span className="text-2xl font-bold text-slate-900 leading-none">₹{pendingTotal.toLocaleString()}</span>
          <span className="text-xs text-slate-400 block mt-2">Due across subsequent phases</span>
        </Card>
      </div>

      {/* 3 Installment Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Installment Payment & Verification Schedule
          </h2>
          <span className="text-xs text-slate-400">3 Structured Milestones</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {installments.map((inst) => {
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
                    <span className="w-7 h-7 rounded-lg bg-[#58051E] text-white font-semibold flex items-center justify-center text-xs">
                      {inst.stageNum}
                    </span>
                    {isPaid && <Badge variant="success" dot>Paid</Badge>}
                    {isPendingVerification && <Badge variant="brand" dot>In Verification</Badge>}
                    {isRejected && <Badge variant="error" dot>Action Required</Badge>}
                    {isPending && <Badge variant="neutral">Pending</Badge>}
                    {!isPaid && !isPendingVerification && !isRejected && !isPending && (
                      <Badge variant="neutral">Locked</Badge>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1">{inst.title}</h3>
                  <p className="text-xs text-[#58051E] font-medium mb-3">{inst.stageName}</p>

                  <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Milestone Amount</span>
                    <span className="text-xl font-bold text-slate-900">
                      {inst.amount > 0 ? `₹${inst.amount.toLocaleString('en-IN')}` : 'Pending Selection'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{inst.description}</p>

                  {isRejected && inst.notes && (
                    <div className="p-3 mb-3 bg-red-50/80 border border-red-200 rounded-lg text-xs text-red-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Admin Notes:</span>
                        {inst.notes}
                      </div>
                    </div>
                  )}

                  {isPendingVerification && (
                    <div className="p-3 mb-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Under Verification</span>
                        Reference: <span className="font-mono font-semibold">{inst.utr || 'Submitted'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  {isPaid ? (
                    <div className="space-y-2">
                      <div className="w-full h-9 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled & Verified
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          className="flex-1"
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
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Invoice
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownloadInvoice(inst)}
                          leftIcon={<FileText className="w-3.5 h-3.5" />}
                        >
                          PDF
                        </Button>
                      </div>
                    </div>
                  ) : isPendingVerification ? (
                    <div className="w-full h-9 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" /> Awaiting Admin Approval
                    </div>
                  ) : inst.unlocked ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setOnlinePayInst(inst)}
                        leftIcon={<QrCode className="w-3.5 h-3.5" />}
                      >
                        Pay Online
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedInst(inst);
                          setUtrNumber('');
                        }}
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                      >
                        Proof
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-9 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Unlocks After Stage {inst.stageNum - 1}
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-card border border-slate-200 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Settle Milestone</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{selectedInst.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInst(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex gap-1.5 mb-4 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPaymentMode('gateway')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center cursor-pointer ${
                    paymentMode === 'gateway' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Direct Gateway
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all text-center cursor-pointer ${
                    paymentMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bank Wire / UTR
                </button>
              </div>

              {paymentMode === 'gateway' ? (
                <form onSubmit={handleGatewaySubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Amount Due:</span>
                    <span className="text-base font-bold text-[#58051E]">₹{selectedInst.amount.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['card', 'upi', 'netbanking'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setGatewayType(type as any)}
                          className={`h-9 rounded-lg text-xs font-medium border transition-colors text-center uppercase tracking-wide cursor-pointer ${
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
                    <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Card Number</label>
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
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
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
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E] text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">CVV</label>
                          <input
                            required
                            type="password"
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E] text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {gatewayType === 'upi' && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center space-y-3">
                      <div className="w-full">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Enter UPI Virtual Payment Address</label>
                        <input
                          required
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. name@okhdfcbank"
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                    </div>
                  )}

                  {gatewayType === 'netbanking' && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Bank</label>
                      <select className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]">
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="kotak">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedInst(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? 'Processing...' : `Pay ₹${selectedInst.amount.toLocaleString()}`}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleProofSubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Amount Due:</span>
                    <span className="text-base font-bold text-[#58051E]">₹{selectedInst.amount.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method Used</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe / Paytm</option>
                      <option value="Bank Wire Transfer (NEFT / IMPS / RTGS)">Bank Wire Transfer (NEFT / IMPS / RTGS)</option>
                      <option value="Debit / Credit Card">Debit / Credit Card</option>
                      <option value="NetBanking">Online NetBanking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transaction UTR / Reference ID</label>
                    <input
                      required
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. UTR128491048201 or Ref ID"
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Upload Receipt Proof</label>
                    <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-[#58051E]/50 transition-colors bg-slate-50">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="receipt-file-input"
                      />
                      <label htmlFor="receipt-file-input" className="cursor-pointer flex flex-col items-center gap-1">
                        <FileText className="w-5 h-5 text-[#58051E]" />
                        <span className="text-xs font-semibold text-slate-700">Click to upload payment proof</span>
                        <span className="text-[11px] text-slate-400">PNG, JPG, PDF up to 10MB</span>
                      </label>
                    </div>
                    {receiptUrl && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Proof file attached
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedInst(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                    </Button>
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

      {/* Online Checkout Modal */}
      {onlinePayInst && (
        <UnifiedPaymentModal
          isOpen={Boolean(onlinePayInst)}
          onClose={() => setOnlinePayInst(null)}
          division="education"
          amount={onlinePayInst.amount}
          currency="INR"
          title={`Pay ${onlinePayInst.title}`}
          purpose={onlinePayInst.description || 'Student Tuition Fee Installment'}
          payerName={studentName}
          payerEmail={user?.email}
          studentId={user?.id}
          invoiceNo={`INV-EDU-${onlinePayInst.stageNum}-${Date.now().toString().slice(-4)}`}
          onSuccess={() => {
            setOnlinePayInst(null);
          }}
        />
      )}
    </div>
  );
};
