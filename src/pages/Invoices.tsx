import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Download, Eye, CheckCircle2, AlertCircle, Sparkles, Search, Printer, X, CreditCard } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState([
    { id: 1, invNo: 'INV-2026-0410', desc: 'Ferex Administrative Processing Fee', amount: '₹40,500', rawAmount: 40500, date: 'Jun 12, 2026', status: 'Paid', items: ['Global Student Verification', 'Document Legalization Audit', 'Advisor Allocation'] },
    { id: 2, invNo: 'INV-2026-0457', desc: 'Stanford Application Submission Fee', amount: '₹11,250', rawAmount: 11250, date: 'Jun 28, 2026', status: 'Paid', items: ['Direct Portal Filing', 'Credential Evaluation', 'Courier Docket'] },
    { id: 3, invNo: 'INV-2026-0498', desc: 'MIT Transcript Evaluation Legalization', amount: '₹13,500', rawAmount: 13500, date: 'Jul 04, 2026', status: 'Paid', items: ['WES Attestation', 'Sworn Translation', 'Consular Clearance'] },
    { id: 4, invNo: 'INV-2026-0560', desc: 'NAWA Polish Equivalency Validation Charge', amount: '₹1,08,000', rawAmount: 10800, date: 'Aug 01, 2026', status: 'Unpaid', items: ['Ministry Attestation', 'Diploma Nostrification', 'Apostille Processing'] },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDownload = (invNo: string) => {
    showToast(`Downloading Official Invoice PDF: ${invNo}.pdf`);
  };

  const handlePrint = (invNo: string) => {
    showToast(`Printing invoice ${invNo}...`);
  };

  const handlePayInvoice = (invNo: string) => {
    setInvoices(invoices.map(i => i.invNo === invNo ? { ...i, status: 'Paid' } : i));
    if (selectedInvoice && selectedInvoice.invNo === invNo) {
      setSelectedInvoice({ ...selectedInvoice, status: 'Paid' });
    }
    showToast(`Invoice ${invNo} successfully paid! Receipt generated.`);
  };

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.invNo.toLowerCase().includes(searchQuery.toLowerCase()) || i.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || i.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            Invoices
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Invoices generated for program fees, applications, and legal translations.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number or description..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['All', 'Paid', 'Unpaid'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-semibold select-none">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Billing Item Description</th>
                <th className="px-6 py-4">Billing Amount</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.map((inv) => {
                const isPaid = inv.status === 'Paid';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{inv.invNo}</td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">{inv.desc}</td>
                    <td className="px-6 py-4 text-slate-900 font-extrabold">{inv.amount}</td>
                    <td className="px-6 py-4 text-slate-400">{inv.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] uppercase font-bold ${
                        isPaid 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {isPaid ? <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} /> : <AlertCircle className="w-3 h-3" strokeWidth={2.5} />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-[#6A1B2E] rounded-lg hover:bg-slate-100 transition-colors"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(inv.invNo)}
                          className="p-1.5 text-slate-400 hover:text-[#6A1B2E] rounded-lg hover:bg-slate-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {!isPaid && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[10px] font-extrabold bg-[#6A1B2E] hover:bg-[#521221]"
                            onClick={() => handlePayInvoice(inv.invNo)}
                          >
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Inspector Drawer */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-40"
              onClick={() => setSelectedInvoice(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Official Invoice Document</h3>
                <button onClick={() => setSelectedInvoice(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedInvoice.invNo}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedInvoice.desc}</h4>
                  <p className="text-xs font-semibold text-slate-500">Issued: {selectedInvoice.date}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Included Service Items</span>
                  <div className="space-y-1.5">
                    {selectedInvoice.items.map((item: string, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>{item}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Invoice Valuation</span>
                  <div className="text-2xl font-black text-slate-900">{selectedInvoice.amount}</div>
                  <span className="text-[10px] font-semibold text-slate-500">Includes all applicable tax clearances</span>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handlePrint(selectedInvoice.invNo)}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handleDownload(selectedInvoice.invNo)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </div>

                {selectedInvoice.status !== 'Paid' && (
                  <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => handlePayInvoice(selectedInvoice.invNo)}>
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Clear Invoice Balance ({selectedInvoice.amount})
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
