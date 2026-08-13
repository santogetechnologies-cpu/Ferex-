import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Download, Sparkles, Search, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { usePayments } from '../hooks/usePayments';
import { createValidInvoicePdfBlob } from '../lib/api/payments';
import type { Invoice } from '../lib/types';

export const Invoices: React.FC = () => {
  const { user } = useAuth();
  const { invoices: dbInvoices, payments } = usePayments(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Combine DB invoices with paid payments to guarantee invoice availability
  const invoices: Invoice[] = ([
    ...dbInvoices,
    ...payments
      .filter(p => p.status === 'Paid')
      .map(p => ({
        id: `INV-${p.id.slice(0, 8)}`,
        student_id: p.student_id,
        payment_id: p.id,
        invoice_no: p.ref_no || `INV-${p.id.slice(0, 6)}`,
        description: p.description || 'Installment Payment Clearance',
        amount: Number(p.amount),
        currency: p.currency || 'INR',
        status: 'Paid',
        due_date: p.created_at,
        issued_at: p.paid_at || p.created_at || new Date().toISOString(),
        created_at: p.created_at || new Date().toISOString(),
      }))
  ].filter((inv, index, self) => index === self.findIndex(t => t.id === inv.id || t.invoice_no === inv.invoice_no))) as Invoice[];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleDownload = (invNo: string, description?: string, amount?: number) => {
    const pdfBlob = createValidInvoicePdfBlob({
      invoice_no: invNo,
      title: description || 'Installment Payment Clearance',
      amount: amount || 15000,
      currency: 'INR',
      paid_at: new Date().toISOString()
    });
    const url = URL.createObjectURL(pdfBlob);
    const element = document.createElement('a');
    element.href = url;
    element.download = `${invNo}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`🎉 Downloaded Official Tax Invoice PDF: ${invNo}.pdf`);
  };

  const filteredInvoices = invoices.filter(i => {
    const invTitle = i.description || i.invoice_no || '';
    return invTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
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
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            Official Invoices & Billing Receipts
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            View and download official tax invoices and payment receipts for completed installment transactions.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number or description..."
            className="w-full h-10 pl-9.5 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInvoices.map((inv) => (
          <Card key={inv.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between bg-white relative">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                  {inv.invoice_no || inv.id}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-900 leading-snug mb-1">
                {inv.description || 'Installment Payment Clearance'}
              </h3>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mt-3 mb-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Amount Paid:</span>
                <span className="text-base font-black text-slate-900">₹{Number(inv.amount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">
                {new Date(inv.issued_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold"
                onClick={() => handleDownload(inv.invoice_no || inv.id, inv.description, Number(inv.amount))}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> PDF Invoice
              </Button>
            </div>
          </Card>
        ))}

        {filteredInvoices.length === 0 && (
          <div className="col-span-full py-16 text-center text-xs font-semibold text-slate-400">
            No official invoices available yet. Complete an installment payment to generate an invoice.
          </div>
        )}
      </div>
    </div>
  );
};
