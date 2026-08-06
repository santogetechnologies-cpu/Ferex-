import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle2, AlertCircle, X, Wallet, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Payments: React.FC = () => {
  // In-memory transactions
  const [transactions, setTransactions] = useState([
    { id: 1, refNo: 'TX-2026-8901', desc: 'Ferex Admissions Processing Fee', amount: '$450.00', date: 'Jun 12, 2026', status: 'Paid' },
    { id: 2, refNo: 'TX-2026-9214', desc: 'Stanford Application Deposit', amount: '$125.00', date: 'Jun 28, 2026', status: 'Paid' },
    { id: 3, refNo: 'TX-2026-9541', desc: 'MIT Evaluation Documents Legalization', amount: '$150.00', date: 'Jul 04, 2026', status: 'Paid' },
    { id: 4, refNo: 'TX-2026-1025', desc: 'NAWA Polish Equivalence Deposit', amount: '$1,200.00', date: 'Aug 01, 2026', status: 'Pending Outstanding' },
  ]);

  // Payment states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payCardName, setPayCardName] = useState('');
  const [payCardNumber, setPayCardNumber] = useState('');
  const [payCardExpiry, setPayCardExpiry] = useState('');
  const [payCardCvv, setPayCardCvv] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Stats calculation
  const outstandingAmount = '$1,200.00';
  const paidAmount = '$725.00';
  const upcomingAmount = '$850.00';

  // Mock submit payment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);

    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      
      // Update transaction status to Paid
      setTransactions(prev =>
        prev.map(tx =>
          tx.refNo === 'TX-2026-1025' ? { ...tx, status: 'Paid' } : tx
        )
      );
    }, 2000);
  };

  const closePaymentFlow = () => {
    setShowPayModal(false);
    setPaymentSuccess(false);
    setPayCardName('');
    setPayCardNumber('');
    setPayCardExpiry('');
    setPayCardCvv('');
    if (paymentSuccess) {
      setToastMessage('Payment of $1,200.00 successfully cleared!');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    const isPaid = status === 'Paid';
    return isPaid 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';
  };

  return (
    <div className="space-y-6 text-left relative">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
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
            Payments Center
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Secure gateway for tuition, processing fees, and financial ledger reviews.
          </p>
        </div>
      </div>

      {/* Financial Indicators Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: 'Outstanding Balance', amount: outstandingAmount, sub: 'Due immediately', type: 'out', color: 'border-l-amber-500' },
          { title: 'Total Paid Fees', amount: paidAmount, sub: '3 transactions cleared', type: 'paid', color: 'border-l-emerald-500' },
          { title: 'Upcoming Term Tuition', amount: upcomingAmount, sub: 'Invoice generation Oct 01', type: 'up', color: 'border-l-slate-400' },
        ].map((block, idx) => {
          const isOut = block.type === 'out';
          const hasOutstanding = block.amount !== '$0.00';

          return (
            <Card key={idx} className={`p-5 border-l-4 ${block.color} flex flex-col justify-between h-40`}>
              <div className="text-left select-none">
                <span className="text-xs font-bold text-slate-400 block mb-1">{block.title}</span>
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{block.amount}</span>
                <span className="text-[10px] font-bold text-slate-500 block mt-1.5">{block.sub}</span>
              </div>

              {isOut && hasOutstanding && (
                <Button
                  size="sm"
                  className="text-xs w-full font-bold h-9 mt-2 flex items-center justify-center gap-1.5 shadow-none"
                  onClick={() => setShowPayModal(true)}
                  disabled={transactions.find(tx => tx.refNo === 'TX-2026-1025')?.status === 'Paid'}
                >
                  <Wallet className="w-3.5 h-3.5" /> Pay Balance
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Ledger Log */}
      <Card className="overflow-hidden border border-slate-100 shadow-sm text-left">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900">Payment Transactions History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-semibold select-none">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Transaction Ref</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isPaid = tx.status === 'Paid';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-extrabold text-slate-800">{tx.refNo}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{tx.desc}</td>
                    <td className="px-6 py-4 text-slate-900 text-xs font-extrabold">{tx.amount}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{tx.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] uppercase font-bold ${getStatusBadge(tx.status)}`}>
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MOCK CREDIT CARD PAYMENT DIALOG */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closePaymentFlow}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-md w-full relative z-10 p-6 space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#6A1B2E]" />
                  <h3 className="text-sm font-extrabold text-slate-900">Secure Payment Gateway</h3>
                </div>
                <button onClick={closePaymentFlow} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!paymentSuccess ? (
                /* Card Input form */
                <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs font-semibold">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                    <span className="text-slate-500">Processing Amount:</span>
                    <span className="text-sm font-extrabold text-slate-900">$1,200.00</span>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="Sarah Jenkins"
                      value={payCardName}
                      onChange={(e) => setPayCardName(e.target.value)}
                      required
                      disabled={paymentLoading}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      value={payCardNumber}
                      onChange={(e) => setPayCardNumber(e.target.value)}
                      required
                      disabled={paymentLoading}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Expiration Date</label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        value={payCardExpiry}
                        onChange={(e) => setPayCardExpiry(e.target.value)}
                        required
                        disabled={paymentLoading}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Security Code (CVV)</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={3}
                        value={payCardCvv}
                        onChange={(e) => setPayCardCvv(e.target.value)}
                        required
                        disabled={paymentLoading}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>256-bit Secure Sockets Layer (SSL) payment. Ferex doesn't store cards.</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button type="button" variant="outline" size="sm" className="text-xs" onClick={closePaymentFlow} disabled={paymentLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="text-xs" isLoading={paymentLoading} disabled={paymentLoading}>
                      Clear Balance
                    </Button>
                  </div>
                </form>
              ) : (
                /* Success message screen */
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Payment Authorization Cleared</h4>
                    <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto mt-1 leading-relaxed">
                      Reference Code: TX-2026-1025. Receipt and invoices are available.
                    </p>
                  </div>
                  <div className="pt-4">
                    <Button size="sm" className="w-full text-xs font-bold" onClick={closePaymentFlow}>
                      Return to Workspace
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
