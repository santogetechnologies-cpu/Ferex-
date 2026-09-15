import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, X, CheckCircle2, DollarSign, Calendar,
  User, FileText, Sparkles, Receipt, Hash, Building2
} from 'lucide-react';
import { getStudents } from '../lib/api/students';
import { createAndCompletePayment } from '../lib/api/payments';
import type { UserProfile } from '../lib/types';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { parseFeeToINR } from '../pages/Payments';

interface CashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CashPaymentModal: React.FC<CashPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { config } = useFeeConfig();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [stageNumber, setStageNumber] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState('15000');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Physical cash received at FEREX Education Admissions Desk.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingStudents(true);
      getStudents().then(list => {
        setStudents(list || []);
        if (list && list.length > 0 && !selectedStudentId) {
          setSelectedStudentId(list[0].id);
        }
      }).finally(() => setLoadingStudents(false));

      // Generate receipt number
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`FRX-CSH-${new Date().getFullYear()}-${randomSuffix}`);
      setDateReceived(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (stageNumber === 1) {
      const advFee = config.advance_registration_fee_inr || config.advance_registration_fee_amount;
      setAmount(String(advFee && advFee >= 100 ? advFee : 15000));
    } else if (stageNumber === 2) {
      const agencyFee = config.default_agency_fee ? parseFeeToINR(config.default_agency_fee) : 25000;
      setAmount(String(agencyFee || 25000));
    } else if (stageNumber === 3) {
      const vfsFee = config.default_vfs_fee ? parseFeeToINR(config.default_vfs_fee) : 15000;
      setAmount(String(vfsFee || 15000));
    } else if (stageNumber === 4) {
      setAmount('315000'); // Default ~€3,500 tuition
    }
  }, [stageNumber, config]);

  if (!isOpen) return null;

  const filteredStudents = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setToastMessage('Please select a student.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setToastMessage('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentName = selectedStudent?.full_name || selectedStudent?.email?.split('@')[0] || 'Student';
      const stageMeta = {
        1: { title: 'Advanced Registration Fee', type: 'Advanced Registration Fee' },
        2: { title: 'Agency Processing Fee', type: 'Agency Processing Fee' },
        3: { title: 'VFS / Visa Gov Fee', type: 'VFS / Visa Gov Fee' },
        4: { title: 'University Tuition Fee', type: 'Tuition Fee' },
      }[stageNumber] || { title: 'Advanced Registration Fee', type: 'Advanced Registration Fee' };

      await createAndCompletePayment({
        student_id: selectedStudentId,
        student_name: studentName,
        title: `${stageMeta.title} - Cash Settlement`,
        description: `Cash received on ${dateReceived}. Receipt #${receiptNumber}. ${notes}`,
        amount: numericAmount,
        currency: 'INR',
        payment_type: stageMeta.type,
        payment_method: 'Cash Payment',
        status: 'Paid',
        utr_number: receiptNumber,
        verified_by: 'Admissions Desk Admin',
        verified_at: new Date().toISOString(),
        stage_number: stageNumber
      } as any);

      setToastMessage('Cash payment successfully recorded and invoice generated!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setToastMessage(`Error recording payment: ${err.message || 'Action failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const STAGE_OPTIONS: { num: 1 | 2 | 3 | 4; label: string; sub: string; tag: string }[] = [
    { num: 1, label: 'Advance Registration', sub: '01. Platform Intake', tag: 'SAC 9983' },
    { num: 2, label: 'Agency Processing', sub: '02. Admissions Desk', tag: 'Admissions' },
    { num: 3, label: 'VFS / Visa Gov Fee', sub: '03. Embassy Filing', tag: 'Consular' },
    { num: 4, label: 'University Tuition', sub: '04. Tuition Schedule', tag: 'Tuition' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto text-left"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Record Physical Cash Payment</h2>
              <p className="text-[11px] font-medium text-slate-500">Official Admissions Desk In-Person Receipting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {toastMessage && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            {toastMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Search student by name or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white"
              />
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
              >
                {filteredStudents.length === 0 ? (
                  <option value="">No students found</option>
                ) : (
                  filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email.split('@')[0]} ({s.email})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 4 Standardized Payment Stages matching Student Portal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Category / Stage *</label>
            <div className="grid grid-cols-2 gap-2">
              {STAGE_OPTIONS.map(stage => (
                <button
                  key={stage.num}
                  type="button"
                  onClick={() => setStageNumber(stage.num)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    stageNumber === stage.num
                      ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">{stage.sub}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                      stageNumber === stage.num ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {stage.tag}
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate">{stage.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Receipt Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount Received (₹ INR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Number *</label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Date & Officer Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date Received *</label>
              <input
                type="date"
                required
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Settlement Status</label>
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Auto-Verified (Paid)
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admissions Desk Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received by Counselor at Kochi center, physical receipt handed to student."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-[11px] text-amber-800">
            <Receipt className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Recording this cash payment will instantly mark the student's installment stage as <strong>Paid & Verified</strong>, unlock subsequent application steps, and auto-generate their GST invoice.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#58051E] text-white rounded-xl text-xs font-bold hover:bg-[#430316] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Recording...' : 'Record & Issue Invoice'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
