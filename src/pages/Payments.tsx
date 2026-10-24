import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle2, X, Upload, Clock,
  AlertCircle, FileText, Eye, QrCode, ShieldCheck, Building2, Briefcase, ChevronRight,
  Landmark, ShieldAlert, Check, Lock, Sparkles, ExternalLink, Info, ArrowUpRight
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
import { useVisa } from '../hooks/useVisa';
import { isAgreementSigned } from '../lib/api/agreement';
import { createValidInvoicePdfBlob } from '../lib/api/payments';
import { InvoiceModal, type InvoiceData } from '../components/InvoiceModal';
import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';
import type { PaymentInstallment } from '../lib/types';

export function formatFeeEURandINR(feeStr?: string | number): string {
  if (feeStr === undefined || feeStr === null || feeStr === '' || feeStr === 'N/A' || feeStr === '—') return '—';
  const str = String(feeStr).trim();
  if (str.includes('~') && (str.includes('₹') || str.includes('€') || str.includes('$') || str.includes('£'))) return str;

  // Handle fee range like "€3,200 - €4,500 / yr"
  const rangeMatch = str.match(/([€$£₹]?)\s*([\d,]+)\s*[-–]\s*([€$£₹]?)\s*([\d,]+)(.*)/);
  if (rangeMatch) {
    const sym = rangeMatch[1] || rangeMatch[3] || '€';
    const low = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
    const high = parseInt(rangeMatch[4].replace(/,/g, ''), 10);
    const suffix = rangeMatch[5] || '';
    if (!isNaN(low) && !isNaN(high)) {
      if (sym === '€' || str.toLowerCase().includes('eur')) {
        const inrLow = Math.round(low * 90);
        const inrHigh = Math.round(high * 90);
        return `€${low.toLocaleString('en-US')} - €${high.toLocaleString('en-US')}${suffix} (~₹${inrLow.toLocaleString('en-IN')} - ₹${inrHigh.toLocaleString('en-IN')}${suffix})`;
      } else if (sym === '₹' || str.toLowerCase().includes('inr')) {
        const eurLow = Math.round(low / 90);
        const eurHigh = Math.round(high / 90);
        return `₹${low.toLocaleString('en-IN')} - ₹${high.toLocaleString('en-IN')}${suffix} (~€${eurLow.toLocaleString('en-US')} - €${eurHigh.toLocaleString('en-US')}${suffix})`;
      } else if (sym === '£') {
        const inrLow = Math.round(low * 105);
        const inrHigh = Math.round(high * 105);
        return `£${low.toLocaleString('en-US')} - £${high.toLocaleString('en-US')}${suffix} (~₹${inrLow.toLocaleString('en-IN')} - ₹${inrHigh.toLocaleString('en-IN')}${suffix})`;
      }
    }
  }

  // Single fee amount
  const cleanDigits = str.replace(/,/g, '').match(/\d+/);
  if (!cleanDigits) return str;
  const num = parseInt(cleanDigits[0], 10);
  if (isNaN(num) || num === 0) return str;

  const hasYr = str.toLowerCase().includes('/ yr') || str.toLowerCase().includes('per year') || str.toLowerCase().includes('/yr');
  const hasMo = str.toLowerCase().includes('/ mo') || str.toLowerCase().includes('per month') || str.toLowerCase().includes('/mo');
  const suffix = hasYr ? ' / yr' : hasMo ? ' / mo' : '';

  if (str.includes('€') || str.toLowerCase().includes('eur')) {
    const inr = Math.round(num * 90);
    return `€${num.toLocaleString('en-US')}${suffix} (~₹${inr.toLocaleString('en-IN')}${suffix})`;
  }
  if (str.includes('₹') || str.toLowerCase().includes('inr')) {
    const eur = Math.round(num / 90);
    return `₹${num.toLocaleString('en-IN')}${suffix} (~€${eur.toLocaleString('en-US')}${suffix})`;
  }
  if (str.includes('£') || str.toLowerCase().includes('gbp')) {
    const inr = Math.round(num * 105);
    return `£${num.toLocaleString('en-US')}${suffix} (~₹${inr.toLocaleString('en-IN')}${suffix})`;
  }
  if (str.includes('$') || str.toLowerCase().includes('usd')) {
    const inr = Math.round(num * 84);
    return `$${num.toLocaleString('en-US')}${suffix} (~₹${inr.toLocaleString('en-IN')}${suffix})`;
  }

  return str;
}

export function parseFeeToINR(feeStr?: string | number): number {
  if (!feeStr) return 0;
  if (typeof feeStr === 'number') return feeStr;
  const str = String(feeStr).replace(/,/g, '');
  const match = str.match(/\d+/);
  if (!match) return 0;
  const num = parseInt(match[0], 10);
  if (isNaN(num)) return 0;
  if (str.includes('€') || str.toLowerCase().includes('eur')) {
    return num * 90;
  }
  if (str.includes('£') || str.toLowerCase().includes('gbp')) {
    return num * 105;
  }
  if (str.includes('CAD') || str.toLowerCase().includes('cad')) {
    return num * 62;
  }
  if (str.includes('$') || str.toLowerCase().includes('usd')) {
    return num * 84;
  }
  return num;
}

export interface PaymentItem {
  id: string;
  itemType: 'advanced_registration' | 'visa_documents_fee' | 'service_charge' | 'agency_fee' | 'vfs_fee' | 'tuition_installment' | 'custom_fee' | 'university_app_fee';
  title: string;
  stageName: string;
  amount: number;
  amountFormatted: string;
  description: string;
  dueDateStr: string;
  status: 'Paid' | 'Pending Verification' | 'Rejected' | 'Pending' | 'Upcoming';
  unlocked: boolean;
  lockReason?: string;
  payee?: 'ferex' | 'direct_third_party';
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
  const { records: visaRecords } = useVisa(user?.id);

  const [viewInvoice, setViewInvoice] = useState<InvoiceData | null>(null);
  const [onlinePayItem, setOnlinePayItem] = useState<PaymentItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // 1. Identify student's active application & chosen destination university
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

  // University-Wise Fee Override Check
  const uniOverride = useMemo(() => {
    const targetId = appliedUniversity?.id || activeApp?.university_id;
    const targetName = appliedUniversity?.name || activeApp?.university_name;
    return config.university_service_fees?.find(o =>
      (targetId && o.university_id === targetId) ||
      (targetName && o.university_name?.toLowerCase().trim() === targetName.toLowerCase().trim())
    ) || null;
  }, [appliedUniversity, activeApp, config.university_service_fees]);

  // Stage milestone tracking for locking/unlocking fees
  const hasOffer = applications.some(a =>
    (a.status as string) === 'Offer Issued' ||
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    Boolean(a.offer_letter_url)
  );

  const visaRecord = visaRecords?.find(r =>
    (user?.id && r.student_id === user.id) ||
    (r.student_name && studentName.toLowerCase().includes(r.student_name.toLowerCase()))
  );
  const rawOutcome = (visaRecord as any)?.decision_outcome ||
    (visaRecord?.status_label?.toLowerCase().includes('approv') ? 'Approved' : 'Pending');
  const isVisaApproved = rawOutcome === 'Approved';

  // ───────────────────────────────────────────────────────────
  // ── 3 Payments to Ferex ───────────────────────────
  // ───────────────────────────────────────────────────────────

  // 1. Registration Fee: "Registration — you already paid."
  const advPaymentRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return text.includes('registration') || text.includes('advance') || text.includes('audit deposit') || (p as any).stage_number === 1;
  });
  const isAdvFeePaid = advPaymentRecord?.status === 'Paid' || advPaymentRecord?.status === 'Verified';
  const configuredAdvanceAmount = Number(config.advance_registration_fee_amount ?? 1500);
  const advDisplayAmount = isAdvFeePaid && advPaymentRecord?.amount ? Number(advPaymentRecord.amount) : configuredAdvanceAmount;
  const advDisplayFormatted = `₹${advDisplayAmount.toLocaleString('en-IN')}`;

  const advFeeItem: PaymentItem = {
    id: 'fee-ferex-registration',
    itemType: 'advanced_registration',
    payee: 'ferex',
    title: isAdvFeePaid ? '1. Registration — you already paid.' : '1. Registration Fee',
    stageName: 'Stage 1: Lead Inquiry & Platform Intake',
    amount: advDisplayAmount,
    amountFormatted: advDisplayFormatted,
    description: 'Advisory fee, student eligibility evaluation, profile verification, and institutional seat reservation.',
    dueDateStr: isAdvFeePaid ? 'Settled & Cleared' : 'Due on Student Signup / Onboarding',
    status: isAdvFeePaid
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

  // 2. Cost for Documents for Visa: "pay after the offer letter."
  const docPaymentRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return (text.includes('document') && text.includes('visa')) || text.includes('visa documents');
  });
  const isDocFeePaid = docPaymentRecord?.status === 'Paid' || docPaymentRecord?.status === 'Verified';
  const configuredDocAmount = Number(uniOverride?.visa_documents_amount ?? config.visa_documents_fee_amount ?? 12000);
  const docDisplayAmount = isDocFeePaid && docPaymentRecord?.amount ? Number(docPaymentRecord.amount) : configuredDocAmount;
  const docDisplayFormatted = `₹${docDisplayAmount.toLocaleString('en-IN')}`;

  const docFeeItem: PaymentItem = {
    id: 'fee-ferex-documents',
    itemType: 'visa_documents_fee',
    payee: 'ferex',
    title: '2. Cost for Documents for Visa',
    stageName: 'Stage 7: Offer Letter Issued & Legalization Dossier',
    amount: docDisplayAmount,
    amountFormatted: docDisplayFormatted,
    description: 'Certified translations, sworn affidavit drafting, apostille verification, and embassy checklist assembly. Pay after the offer letter.',
    dueDateStr: isDocFeePaid ? 'Settled & Cleared' : 'Pay after the offer letter',
    status: isDocFeePaid
      ? 'Paid'
      : docPaymentRecord?.status === 'Pending Verification'
      ? 'Pending Verification'
      : docPaymentRecord?.status === 'Rejected'
      ? 'Rejected'
      : !hasOffer
      ? 'Upcoming'
      : 'Pending',
    unlocked: hasOffer || isDocFeePaid || docPaymentRecord?.status === 'Pending Verification',
    lockReason: 'Pay after the offer letter — Unlocks automatically once university offer letter is released.',
    notes: docPaymentRecord?.reviewer_notes,
    utr: docPaymentRecord?.utr_number,
  };

  // 3. Service Charge: "after visa."
  const serviceChargeRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return (text.includes('service charge') || text.includes('agency fee')) && !text.includes('tuition');
  });
  const isServiceChargePaid = serviceChargeRecord?.status === 'Paid' || serviceChargeRecord?.status === 'Verified';
  const configuredServiceAmount = Number(
    uniOverride?.service_charge_amount ??
    config.service_charge_amount ??
    (config.agency_fee_amount ? Number(config.agency_fee_amount) : 25000)
  );
  const serviceDisplayAmount = isServiceChargePaid && serviceChargeRecord?.amount ? Number(serviceChargeRecord.amount) : configuredServiceAmount;
  const serviceDisplayFormatted = `₹${serviceDisplayAmount.toLocaleString('en-IN')}`;

  const serviceChargeItem: PaymentItem = {
    id: 'fee-ferex-service-charge',
    itemType: 'service_charge',
    payee: 'ferex',
    title: '3. Service Charge',
    stageName: 'Stage 9: Visa Decision & Pre-Departure',
    amount: serviceDisplayAmount,
    amountFormatted: serviceDisplayFormatted,
    description: 'Full professional facilitation charge for university admission guidance, visa interview briefing, and departure support. Pay after visa approval.',
    dueDateStr: isServiceChargePaid ? 'Settled & Cleared' : 'Pay after visa approval',
    status: isServiceChargePaid
      ? 'Paid'
      : serviceChargeRecord?.status === 'Pending Verification'
      ? 'Pending Verification'
      : serviceChargeRecord?.status === 'Rejected'
      ? 'Rejected'
      : !isVisaApproved
      ? 'Upcoming'
      : 'Pending',
    unlocked: isVisaApproved || isServiceChargePaid || serviceChargeRecord?.status === 'Pending Verification',
    lockReason: 'Pay after visa — Unlocks automatically once embassy grants your visa approval.',
    notes: serviceChargeRecord?.reviewer_notes,
    utr: serviceChargeRecord?.utr_number,
  };

  // Additional Admin Configured Custom Payments for Ferex
  const customFerexItems: PaymentItem[] = useMemo(() => {
    const rawList = (config.custom_payments || []).filter(c => c.enabled !== false && c.recipient === 'ferex');
    return rawList.map(c => {
      const match = dbPayments.find(p =>
        (p.title && p.title.toLowerCase().includes(c.title.toLowerCase())) ||
        (p as any).custom_payment_id === c.id
      );
      const isPaid = match?.status === 'Paid' || match?.status === 'Verified';
      const isPendingVer = match?.status === 'Pending Verification';
      const isRej = match?.status === 'Rejected';

      const triggerName = c.trigger_label || c.trigger_stage || 'Custom Milestone';

      return {
        id: c.id,
        itemType: 'custom_fee',
        payee: 'ferex',
        title: c.title,
        stageName: triggerName,
        amount: c.amount,
        amountFormatted: `₹${c.amount.toLocaleString('en-IN')}`,
        description: c.description || `Custom payment payable to Ferex Education for ${triggerName}.`,
        dueDateStr: triggerName,
        status: isPaid ? 'Paid' : isPendingVer ? 'Pending Verification' : isRej ? 'Rejected' : 'Pending',
        unlocked: true,
        notes: match?.reviewer_notes,
        utr: match?.utr_number,
      };
    });
  }, [config.custom_payments, dbPayments]);

  // ───────────────────────────────────────────────────────────
  // ── Direct Student Payments (NOT to Ferex) ─────────────────
  // ───────────────────────────────────────────────────────────

  // Direct Item 1: University Application Fee
  const rawUniAppFee = (appliedUniversity as any)?.application_fee || '€100';
  const uniAppFeeItem: PaymentItem = {
    id: 'fee-direct-university-app',
    itemType: 'university_app_fee',
    payee: 'direct_third_party',
    title: 'University Application Fee',
    stageName: 'Stage 6: University Application Submission',
    amount: parseFeeToINR(rawUniAppFee),
    amountFormatted: formatFeeEURandINR(rawUniAppFee),
    description: `Official application processing charge paid directly on ${selectedUniversityName}'s admissions portal.`,
    dueDateStr: 'Paid directly on University Admissions Portal',
    status: 'Pending',
    unlocked: true,
  };

  // Direct Item 2: University Tuition Fee
  const tuitionFeeEnabled = Boolean(appliedUniversity?.tuition_fee_enabled);
  const installmentsEnabled = Boolean(appliedUniversity?.installments_enabled);
  const hasMultipleInstallments = Boolean(appliedUniversity?.installments && appliedUniversity.installments.length > 0);

  const tuitionSingleRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return text.includes('tuition') && !text.includes('agency') && !text.includes('#');
  });
  const isTuitionSinglePaid = tuitionSingleRecord?.status === 'Paid' || tuitionSingleRecord?.status === 'Verified';

  const rawTuitionStr = appliedUniversity?.university_fee || appliedUniversity?.tuition_range || '€3,500 / yr';
  const singleTuitionItem: PaymentItem = {
    id: 'fee-direct-tuition-single',
    itemType: 'tuition_installment',
    payee: 'direct_third_party',
    title: `University Tuition Fee (${formatFeeEURandINR(rawTuitionStr)})`,
    stageName: 'Stage 8: Tuition Remittance & Seat Acceptance',
    amount: parseFeeToINR(rawTuitionStr),
    amountFormatted: formatFeeEURandINR(rawTuitionStr),
    description: `Direct university institutional tuition fee for ${selectedUniversityName}. Remitted via international bank SWIFT wire directly to the university account.`,
    dueDateStr: isTuitionSinglePaid ? 'Remitted & Verified' : 'Due on Unconditional Offer Letter',
    status: isTuitionSinglePaid
      ? 'Paid'
      : tuitionSingleRecord?.status === 'Pending Verification'
      ? 'Pending Verification'
      : tuitionSingleRecord?.status === 'Rejected'
      ? 'Rejected'
      : 'Pending',
    unlocked: true,
    notes: tuitionSingleRecord?.reviewer_notes,
    utr: tuitionSingleRecord?.utr_number,
  };

  // Direct Item 3: VFS / Visa Embassy Charge
  const vfsPaymentRecord = dbPayments.find(p => {
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    return text.includes('vfs') || text.includes('visa gov') || text.includes('consular fee');
  });
  const isVfsFeePaid = vfsPaymentRecord?.status === 'Paid' || vfsPaymentRecord?.status === 'Verified';
  const rawVfsFeeStr = appliedUniversity?.vfs_fee || config.default_vfs_fee || '₹15,000';
  const vfsFeeItem: PaymentItem = {
    id: 'fee-direct-vfs-gov',
    itemType: 'vfs_fee',
    payee: 'direct_third_party',
    title: `VFS / Consular Embassy Charge (${formatFeeEURandINR(rawVfsFeeStr)})`,
    stageName: 'Stage 9: Visa Appointment & Biometrics Booking',
    amount: parseFeeToINR(rawVfsFeeStr),
    amountFormatted: formatFeeEURandINR(rawVfsFeeStr),
    description: 'Official government consular visa fee & biometric appointment booking charge paid directly on the VFS Global or Embassy appointment portal.',
    dueDateStr: isVfsFeePaid ? 'Settled & Verified' : 'Paid directly on VFS / Embassy portal prior to appointment',
    status: isVfsFeePaid
      ? 'Paid'
      : vfsPaymentRecord?.status === 'Pending Verification'
      ? 'Pending Verification'
      : vfsPaymentRecord?.status === 'Rejected'
      ? 'Rejected'
      : 'Pending',
    unlocked: true,
    notes: vfsPaymentRecord?.reviewer_notes,
    utr: vfsPaymentRecord?.utr_number,
  };

  // Direct Custom Payments configured by Admin
  const customDirectItems: PaymentItem[] = useMemo(() => {
    const rawList = (config.custom_payments || []).filter(c => c.enabled !== false && c.recipient === 'direct_third_party');
    return rawList.map(c => {
      const match = dbPayments.find(p =>
        (p.title && p.title.toLowerCase().includes(c.title.toLowerCase())) ||
        (p as any).custom_payment_id === c.id
      );
      const isPaid = match?.status === 'Paid' || match?.status === 'Verified';
      const isPendingVer = match?.status === 'Pending Verification';

      const triggerName = c.trigger_label || c.trigger_stage || 'Direct Remittance';

      return {
        id: c.id,
        itemType: 'custom_fee',
        payee: 'direct_third_party',
        title: c.title,
        stageName: triggerName,
        amount: c.amount,
        amountFormatted: `₹${c.amount.toLocaleString('en-IN')}`,
        description: c.description || `Direct payment paid by student for ${triggerName}. Not payable to Ferex.`,
        dueDateStr: triggerName,
        status: isPaid ? 'Paid' : isPendingVer ? 'Pending Verification' : 'Pending',
        unlocked: true,
        notes: match?.reviewer_notes,
        utr: match?.utr_number,
      };
    });
  }, [config.custom_payments, dbPayments]);

  // Financial Totals
  const ferexItems = [advFeeItem, docFeeItem, serviceChargeItem, ...customFerexItems];
  const ferexTotalAmount = ferexItems.reduce((acc, i) => acc + i.amount, 0);
  const ferexTotalPaid = ferexItems.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.amount, 0);
  const ferexTotalPending = Math.max(0, ferexTotalAmount - ferexTotalPaid);

  // Modal Submission Handlers
  const [payMethod, setPayMethod] = useState('Direct NEFT / IMPS Bank Wire');
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Payment Gateway simulation states
  const [paymentMode, setPaymentMode] = useState<'gateway' | 'manual'>('gateway');
  const [gatewayType, setGatewayType] = useState<'card' | 'netbanking'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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
      const methodLabel = gatewayType === 'card' ? 'Debit/Credit Card' : 'NetBanking Wire';

      const paymentTypeLabel = selectedItem.itemType === 'advanced_registration'
        ? 'Advanced Registration Fee'
        : selectedItem.itemType === 'visa_documents_fee'
        ? 'Cost for Documents for Visa'
        : selectedItem.itemType === 'service_charge'
        ? 'Service Charge'
        : selectedItem.itemType === 'vfs_fee'
        ? 'VFS / Visa Gov Fee'
        : selectedItem.title;

      const completedPayment = await processPayment({
        student_id: studentIdVal,
        student_name: studentNameVal,
        title: selectedItem.title,
        amount: selectedItem.amount,
        payment_type: paymentTypeLabel,
        payment_method: `Direct: ${methodLabel}`,
      });

      setIsSubmitting(false);
      setSelectedItem(null);
      showToast(`Payment of ₹${selectedItem.amount.toLocaleString('en-IN')} submitted and logged for verification.`);

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
      const studentIdVal = user?.id;
      const studentNameVal = profile?.full_name || user?.email?.split('@')[0] || 'Student';

      const paymentTypeLabel = selectedItem.itemType === 'advanced_registration'
        ? 'Advanced Registration Fee'
        : selectedItem.itemType === 'visa_documents_fee'
        ? 'Cost for Documents for Visa'
        : selectedItem.itemType === 'service_charge'
        ? 'Service Charge'
        : selectedItem.itemType === 'vfs_fee'
        ? 'VFS / Visa Gov Fee'
        : selectedItem.title;

      await submitProof({
        student_id: studentIdVal,
        student_name: studentNameVal,
        title: selectedItem.title,
        amount: selectedItem.amount,
        payment_type: paymentTypeLabel,
        payment_method: payMethod,
        utr_number: utrNumber.trim(),
        receipt_url: receiptUrl || 'https://via.placeholder.com/150?text=Payment+Receipt',
      });

      setIsSubmitting(false);
      setSelectedItem(null);
      setUtrNumber('');
      setReceiptUrl('');
      showToast(`Payment proof for "${selectedItem.title}" submitted for review.`);
      window.dispatchEvent(new Event('ferex_payment_change'));
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

  // Reusable Payment Card Component
  const renderPaymentCard = (item: PaymentItem, stepBadge: string, badgeAccent: string = '#58051E') => {
    const isPaid = item.status === 'Paid';
    const isPendingVer = item.status === 'Pending Verification';
    const isRejected = item.status === 'Rejected';
    const isLocked = !item.unlocked;

    return (
      <Card
        key={item.id}
        className={`p-5 flex flex-col justify-between transition-all select-none relative bg-white dark:bg-slate-900 border ${
          isPaid
            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10 dark:bg-emerald-950/10'
            : isPendingVer
            ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10'
            : isRejected
            ? 'border-red-200 dark:border-red-900/60 bg-red-50/10 dark:bg-red-950/10'
            : isLocked
            ? 'border-slate-200 dark:border-slate-800 opacity-80'
            : 'border-[#58051E]/30 dark:border-[#58051E]/40 shadow-xs'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{ backgroundColor: `${badgeAccent}15`, color: badgeAccent }}
            >
              {stepBadge}
            </span>
            {isPaid && <Badge variant="success" dot>Paid & Cleared</Badge>}
            {isPendingVer && <Badge variant="brand" dot>In Verification</Badge>}
            {isRejected && <Badge variant="error" dot>Action Required</Badge>}
            {isLocked && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                <Lock className="w-3 h-3 text-slate-400" /> Locked Stage
              </span>
            )}
            {!isPaid && !isPendingVer && !isRejected && !isLocked && (
              <Badge variant="neutral">Payment Due</Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">{item.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{item.description}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#58051E] dark:text-rose-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.dueDateStr}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 text-left sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Required Outlay</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {item.amountFormatted}
              </span>
            </div>
          </div>

          {isLocked && item.lockReason && (
            <div className="p-3 my-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Stage Milestone Locked:</span>
                {item.lockReason}
              </div>
            </div>
          )}

          {item.notes && isRejected && (
            <div className="p-3 mb-3 bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-900 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Admin Feedback:</span>
                {item.notes}
              </div>
            </div>
          )}

          {isPendingVer && (
            <div className="p-3 mb-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Under Administrative Verification</span>
                Reference UTR: <span className="font-mono font-semibold">{item.utr || 'Logged in Registry'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
          {isPaid ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 h-9 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 w-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled & Verified
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewInvoice({
                    invoice_no: `FE/2026-27/${Math.floor(1000 + Math.random() * 9000)}`,
                    student_name: studentName,
                    amount: item.amount,
                    currency: 'INR',
                    description: item.title,
                    date: new Date().toISOString(),
                    payment_method: 'Direct Bank Wire / Online Gateway',
                    utr_number: item.utr || 'VERIFIED-BANK-UTR-84920',
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
                  onClick={() => handleDownloadInvoice(item)}
                  leftIcon={<FileText className="w-3.5 h-3.5" />}
                >
                  PDF Receipt
                </Button>
              </div>
            </div>
          ) : isPendingVer ? (
            <div className="w-full h-9 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" /> Awaiting Admin Verification
            </div>
          ) : isLocked ? (
            <div className="w-full h-9 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Locked until prerequisite stage completion
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                size="sm"
                className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold"
                onClick={() => setOnlinePayItem(item)}
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              >
                Pay Online (Card / NetBanking)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedItem(item);
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
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#58051E]/10 dark:bg-[#58051E]/25 text-[#58051E] dark:text-rose-400">
              Finance & Invoices
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              3 Stage Fee Model
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Payment Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            Review official payments to Ferex and direct third-party tuition and consular fees.
          </p>
        </div>

        {appliedUniversity && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2.5 text-xs shrink-0 self-start sm:self-auto">
            <Building2 className="w-4 h-4 text-[#58051E] dark:text-rose-400" />
            <div>
              <span className="font-black text-slate-900 dark:text-white block leading-tight">{appliedUniversity.name}</span>
              <span className="text-[10px] text-slate-400 font-bold">{appliedUniversity.city}, {appliedUniversity.country}</span>
            </div>
            {uniOverride && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Custom Uni Rate
              </span>
            )}
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ferex Total Fees</span>
            <span className="text-[10px] font-bold text-slate-400">3 Milestones</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
            ₹{ferexTotalAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-400 block mt-2">
            Registration + Documents + Service Charge
          </span>
        </Card>

        <Card className="p-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verified & Settled</span>
            <Badge variant="success">Cleared</Badge>
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
            ₹{ferexTotalPaid.toLocaleString('en-IN')}
          </span>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all"
              style={{ width: `${ferexTotalAmount > 0 ? (ferexTotalPaid / ferexTotalAmount) * 100 : 0}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Ferex Balance</span>
            <Badge variant="neutral">Open Schedule</Badge>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
            ₹{ferexTotalPending.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-400 block mt-2">Payable across future roadmap stages</span>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── SECTION 1: Payments to Ferex (3 Core Steps) ─── */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-[#58051E]/5 via-[#58051E]/10 to-transparent dark:from-[#58051E]/20 dark:via-[#58051E]/10 dark:to-transparent border border-[#58051E]/20 dark:border-[#58051E]/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#58051E] text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Payments to Ferex
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                There are <strong>3 distinct payments to Ferex</strong> throughout your study abroad journey.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#58051E] dark:text-rose-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-[#58051E]/15 self-start md:self-auto">
            <span>1. Registration</span>
            <span>•</span>
            <span>2. Visa Documents (Post-Offer)</span>
            <span>•</span>
            <span>3. Service Charge (Post-Visa)</span>
          </div>
        </div>

        {/* 1. Registration Fee */}
        {renderPaymentCard(advFeeItem, 'Ferex Payment 1 • Intake Deposit', '#58051E')}

        {/* 2. Cost for Documents for Visa */}
        {renderPaymentCard(docFeeItem, 'Ferex Payment 2 • After Offer Letter', '#0284c7')}

        {/* 3. Service Charge */}
        {renderPaymentCard(serviceChargeItem, 'Ferex Payment 3 • After Visa Approval', '#7c3aed')}

        {/* Additional Admin-Configured Payments to Ferex */}
        {customFerexItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Additional Custom Payments to Ferex
            </h3>
            {customFerexItems.map(item => renderPaymentCard(item, 'Ferex Custom Fee', '#059669'))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── SECTION 2: Direct Student Payments (NOT to Ferex) ────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        {/* Critical Mandatory Disclaimer Banner */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                Direct Third-Party Remittance
              </span>
              <h2 className="text-sm font-black text-amber-950 dark:text-amber-200 mt-1">
                University Application / Tuition Fee / VFS charge are paid by the student directly — not to ferex
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                Ferex Education acts strictly as a counselling and processing facilitator. All tuition fees, institutional university application charges, and official embassy consular appointments are remitted directly by the student to the respective entities.
              </p>
            </div>
          </div>
        </div>

        {/* Direct Card 1: University Application Processing Fee */}
        <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/50">
              Direct University Payment
            </span>
            <Badge variant="neutral">Paid to University</Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">{uniAppFeeItem.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{uniAppFeeItem.description}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Payable directly upon university admission portal application lodging</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 text-left sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Typical University Fee</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {uniAppFeeItem.amountFormatted}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Settled directly by credit card on university admissions portal</span>
            {(appliedUniversity as any)?.website_url && (
              <a
                href={(appliedUniversity as any).website_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#58051E] dark:text-rose-400 font-bold flex items-center gap-1 hover:underline"
              >
                Official Portal <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </Card>

        {/* Direct Card 2: University Tuition Fee */}
        {renderPaymentCard(singleTuitionItem, 'Direct University Tuition SWIFT Remittance', '#1e293b')}

        {/* Direct Card 3: VFS / Visa Embassy Charge */}
        {renderPaymentCard(vfsFeeItem, 'Direct Consular Embassy / VFS Global Portal', '#047857')}

        {/* Additional Admin-Configured Direct Third-Party Payments */}
        {customDirectItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Additional Direct Student Remittances
            </h3>
            {customDirectItems.map(item => renderPaymentCard(item, 'Direct 3rd Party Outlay', '#475569'))}
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
              className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Submit Payment Proof</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">{selectedItem.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex gap-1.5 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMode('gateway')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    paymentMode === 'gateway'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Direct Gateway
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    paymentMode === 'manual'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Bank Wire / UTR
                </button>
              </div>

              {paymentMode === 'gateway' ? (
                <form onSubmit={handleGatewaySubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount Due:</span>
                    <span className="text-base font-black text-[#58051E] dark:text-rose-400">₹{selectedItem.amount.toLocaleString('en-IN')}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['card', 'netbanking'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setGatewayType(type)}
                          className={`h-9 rounded-xl text-xs font-bold border transition-colors text-center uppercase tracking-wide cursor-pointer ${
                            gatewayType === type
                              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {type === 'card' ? 'Debit / Credit Card' : 'Net Banking'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {gatewayType === 'card' && (
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Card Number</label>
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
                          className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry</label>
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
                            className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-center text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">CVV</label>
                          <input
                            required
                            type="password"
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-center text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
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
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount Due:</span>
                    <span className="text-base font-black text-[#58051E] dark:text-rose-400">₹{selectedItem.amount.toLocaleString('en-IN')}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction UTR / Reference Number</label>
                    <input
                      required
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 429381029384"
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Select Payment Channel</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="Direct NEFT / IMPS Bank Wire">Direct NEFT / IMPS Bank Wire</option>
                      <option value="International SWIFT Wire">International SWIFT Wire (EUR / USD)</option>
                      <option value="Direct Net Banking Wire Transfer">Direct Net Banking Wire Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Upload Receipt Proof (Optional)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#58051E]/10 file:text-[#58051E] dark:file:bg-[#58051E]/20 dark:file:text-rose-400 hover:file:bg-[#58051E]/20"
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
                      {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Invoicing Modal */}
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

export default Payments;
