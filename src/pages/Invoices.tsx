import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Download, Sparkles, Search, CheckCircle2, RotateCcw, FileText, Eye } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { usePayments } from '../hooks/usePayments';
import { createValidInvoicePdfBlob, createCreditNotePdfBlob, getCreditNotes } from '../lib/api/payments';
import type { Invoice, CreditNote } from '../lib/types';
import { InvoiceModal, type InvoiceData } from '../components/InvoiceModal';

export const Invoices: React.FC = () => {
  const { user, profile } = useAuth();
  const { invoices: dbInvoices, payments } = usePayments(user?.id);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'credits'>('invoices');
  const [toastMessage, setToastMessage] = useState('');
  const [viewInvoice, setViewInvoice] = useState<InvoiceData | null>(null);

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    if (user?.id) {
      getCreditNotes(user.id).then(res => setCreditNotes(res || [])).catch(() => setCreditNotes([]));
    }
  }, [user]);

  // Combine credit notes from API and refunded payments for 100% coverage
  const allCreditNotes: CreditNote[] = ([
    ...creditNotes,
    ...payments
      .filter(p => p.status === 'Refunded')
      .map(p => ({
        id: `CN-${p.id.slice(0, 8)}`,
        student_id: p.student_id,
        payment_id: p.id,
        credit_note_no: (p as any).credit_note_no || `CN-${p.ref_no || p.id.slice(0, 6)}`,
        original_amount: Number(p.amount) || 0,
        refund_amount: Number((p as any).refund_amount) || Number(p.amount) || 0,
        reason: (p as any).refund_reason || 'Refund processed by Admin',
        issued_at: p.paid_at || p.created_at || new Date().toISOString(),
        created_at: p.created_at || new Date().toISOString(),
      }))
  ].filter((cn, index, self) =>
    index === self.findIndex(t => t.id === cn.id || t.credit_note_no === cn.credit_note_no)
  )) as CreditNote[];

  // Merge DB invoices with paid payments for full coverage
  const invoices: Invoice[] = ([
    ...dbInvoices,
    ...payments
      .filter(p => p.status === 'Paid' || p.status === 'Verified')
      .map(p => ({
        id: `INV-${p.id.slice(0, 8)}`,
        student_id: p.student_id,
        payment_id: p.id,
        invoice_no: p.ref_no || `INV-${p.id.slice(0, 6)}`,
        description: p.title || p.description || (p.payment_type ? `${p.payment_type} Clearance` : 'Registration Fee & Legalization Audit Deposit'),
        amount: Number(p.amount),
        currency: p.currency || 'INR',
        status: 'Paid' as const,
        due_date: p.created_at,
        issued_at: p.paid_at || p.created_at || new Date().toISOString(),
        created_at: p.created_at || new Date().toISOString(),
        // extended fields
        payment_type: p.payment_type,
        payment_method: p.payment_method,
        milestone_step: (p as any).milestone_step,
        utr_number: p.utr_number || (p as any).transaction_id,
        student_name: p.student_name || studentName,
      } as any))
  ].filter((inv, index, self) =>
    index === self.findIndex(t => t.id === inv.id || t.invoice_no === inv.invoice_no)
  )) as Invoice[];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleDownloadInvoice = (inv: any) => {
    const pdfBlob = createValidInvoicePdfBlob({
      invoice_no: inv.invoice_no || inv.id,
      student_name: inv.student_name || studentName,
      amount: Number(inv.amount) || 0,
      currency: inv.currency || 'INR',
      title: inv.description || 'Installment Payment Clearance',
      payment_type: inv.payment_type,
      payment_method: inv.payment_method,
      utr_number: inv.utr_number,
      paid_at: inv.issued_at,
    });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_no || inv.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded Invoice: ${inv.invoice_no || inv.id}.pdf`);
  };

  const handleDownloadCreditNote = (cn: CreditNote) => {
    const pdfBlob = createCreditNotePdfBlob({
      credit_note_no: cn.credit_note_no,
      student_name: studentName,
      original_amount: cn.original_amount,
      refund_amount: cn.refund_amount,
      reason: cn.reason,
      issued_at: cn.issued_at,
    });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cn.credit_note_no}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded Credit Note: ${cn.credit_note_no}.pdf`);
  };

  const filteredInvoices = invoices.filter(i => {
    const text = `${i.description} ${i.invoice_no}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredCredits = allCreditNotes.filter(cn => {
    const text = `${cn.credit_note_no} ${cn.reason}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const totalPaid = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalRefunded = allCreditNotes.reduce((s, cn) => s + (Number(cn.refund_amount) || 0), 0);

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            Invoice History & Credit Notes
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Official tax invoices for all cleared payments. Credit notes issued for any refunds.
          </p>
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <p className="text-[9.5px] font-extrabold uppercase text-emerald-700">Total Invoiced</p>
            <p className="text-sm font-black text-emerald-900">INR {totalPaid.toLocaleString('en-IN')}</p>
          </div>
          {totalRefunded > 0 && (
            <div className="px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl text-center">
              <p className="text-[9.5px] font-extrabold uppercase text-violet-700">Total Refunded</p>
              <p className="text-sm font-black text-violet-900">INR {totalRefunded.toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number, description..."
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { id: 'invoices', label: `Invoices (${invoices.length})`, Icon: FileText },
            { id: 'credits', label: `Credit Notes (${creditNotes.length})`, Icon: RotateCcw },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === t.id ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60'
              }`}
            >
              <t.Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInvoices.map(inv => {
            const extInv = inv as any;
            return (
              <Card key={inv.id} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between bg-white">
                <div>
                  {/* Invoice number + status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-mono">
                      {inv.invoice_no || inv.id}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug mb-1">
                    {inv.description || 'Installment Payment'}
                  </h3>

                  {/* Payment type + milestone step */}
                  <div className="flex items-center gap-2 mb-3">
                    {extInv.payment_type && (
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {extInv.payment_type}
                      </span>
                    )}
                    {extInv.milestone_step && (
                      <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20">
                        Journey Step {extInv.milestone_step}
                      </span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">Amount Paid:</span>
                    <span className="text-base font-black text-slate-900">INR {Number(inv.amount || 0).toLocaleString('en-IN')}</span>
                  </div>

                  {/* UTR / Method */}
                  {(extInv.utr_number || extInv.payment_method) && (
                    <div className="text-[10.5px] font-semibold text-slate-400 space-y-0.5">
                      {extInv.payment_method && <p>Method: <span className="text-slate-700 font-bold">{extInv.payment_method}</span></p>}
                      {extInv.utr_number && <p className="font-mono">UTR: <span className="text-slate-700 font-bold">{extInv.utr_number}</span></p>}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 gap-2">
                  <button
                    onClick={() => setViewInvoice({
                      invoice_no: inv.invoice_no || inv.id,
                      student_name: (inv as any).student_name || studentName,
                      amount: Number(inv.amount) || 0,
                      currency: inv.currency || 'INR',
                      description: inv.description || 'Registration Fee – Overseas Education Consultancy Services (Study in Poland)',
                      date: inv.issued_at || (inv as any).created_at || new Date().toISOString(),
                      payment_method: extInv.payment_method || 'Bank Transfer / UPI',
                      utr_number: extInv.utr_number,
                      sac_code: '9992',
                      place_of_supply: 'Kerala'
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#50001D] text-white text-xs font-bold rounded-xl hover:bg-[#6b0027] transition-all shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Invoice
                  </button>

                  <button
                    onClick={() => handleDownloadInvoice(extInv)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </Card>
            );
          })}

          {filteredInvoices.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-extrabold text-slate-700">No Invoices Yet</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                Complete a payment to generate your first official invoice.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Credit Notes Tab */}
      {activeTab === 'credits' && (
        <div className="space-y-4">
          {filteredCredits.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
              <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-extrabold text-slate-700">No Credit Notes</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                Credit notes are issued when admin processes a refund on your behalf.
              </p>
            </div>
          ) : (
            filteredCredits.map(cn => (
              <Card key={cn.id} className="p-5 border border-violet-200 bg-violet-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-violet-100 text-violet-700 rounded-lg border border-violet-200 font-mono">
                      {cn.credit_note_no}
                    </span>
                    <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-violet-600 text-white">REFUNDED</span>
                  </div>
                  <p className="text-sm font-black text-slate-900">Refund — INR {Number(cn.refund_amount).toLocaleString('en-IN')}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{cn.reason}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    Original: INR {Number(cn.original_amount).toLocaleString('en-IN')} •{' '}
                    {new Date(cn.issued_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCreditNote(cn)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition-all shadow-xs self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" /> PDF Credit Note
                </button>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Official Tax Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(viewInvoice)}
        onClose={() => setViewInvoice(null)}
        invoice={viewInvoice}
      />
    </div>
  );
};
