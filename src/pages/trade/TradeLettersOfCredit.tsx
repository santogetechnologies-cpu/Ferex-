import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, CheckCircle2, X, ShieldCheck, Trash2, Eye } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeLettersOfCredit, createTradeLetterOfCredit, updateTradeLetterOfCreditStatus, deleteTradeLetterOfCredit } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeLettersOfCredit: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLC, setSelectedLC] = useState<any>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [toast, setToast] = useState('');
  const [lcs, setLcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeLettersOfCredit();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.lc_number || d.id,
          rawId: d.id,
          bank: d.issuing_bank,
          beneficiary: d.beneficiary,
          applicant: d.applicant || 'Ferex Global Trade Corp',
          amount: `₹${Number(d.amount).toLocaleString('en-IN')}`,
          issueDate: d.issue_date || '2026-08-15',
          expiryDate: d.expiry_date || '2026-10-30',
          status: d.status || 'Active & Confirmed',
          statusBadge: d.status === 'HSBC Cleared' || d.status === 'Bank Cleared'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : d.status === 'Expired'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
        }));
        setLcs(formatted);
      } else {
        setLcs([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_lcs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_letters_of_credit' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_lcs_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_lcs_change', handleLocalChange);
    };
  }, [loadData]);

  const [newLC, setNewLC] = useState({
    bank: 'HSBC London / Warsaw Desk',
    beneficiary: 'Warsaw Global Logistics Sp. z o.o.',
    amount: '₹1,45,00,000',
    expiryDate: '2026-10-30'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleIssueLC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLC.beneficiary) return;
    const numAmount = parseFloat(newLC.amount.replace(/[^0-9.]/g, '')) || 14500000;
    const created = await createTradeLetterOfCredit({
      issuing_bank: newLC.bank,
      beneficiary: newLC.beneficiary,
      amount: numAmount,
      currency: 'INR',
      expiry_date: newLC.expiryDate,
      status: 'Active & Confirmed'
    });
    await loadData();
    setShowIssueModal(false);
    showToastMsg(`Issued Letter of Credit ${created.lc_number || created.id}`);
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    await updateTradeLetterOfCreditStatus(rawId || id, newStatus);
    showToastMsg(`LC status updated to ${newStatus}`);
    await loadData();
  };

  const handleDeleteLC = async (id: string, rawId?: string) => {
    await deleteTradeLetterOfCredit(rawId || id);
    setLcs(prev => prev.filter(l => l.id !== id && l.rawId !== rawId));
    showToastMsg(`Deleted Letter of Credit ${id}`);
  };

  const filteredLCs = lcs.filter(l =>
    (l.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.beneficiary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.bank || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#6A1B2E]" /> International Letters of Credit (LC Duty)
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Managing irrevocable documentary credits, banking verifications, and beneficiary guarantees.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowIssueModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Issue Letter of Credit
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search LC #, Bank, Beneficiary..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredLCs.length} Active LC Lines</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading letters of credit...</div>
      ) : filteredLCs.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Letters of Credit found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No LC lines match your search filter.' : 'Your documentary credit ledger is empty. Issue a new Letter of Credit below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowIssueModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Issue Letter of Credit
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredLCs.map((l) => (
            <Card key={l.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{l.id} · Irrevocable LC</span>
                  <select
                    value={l.status}
                    onChange={(e) => handleStatusChange(l.id, l.rawId, e.target.value)}
                    className={`text-[10px] font-extrabold rounded-full px-2.5 py-0.5 border cursor-pointer ${l.statusBadge}`}
                  >
                    <option value="Active & Confirmed">Active & Confirmed</option>
                    <option value="HSBC Cleared">HSBC Cleared</option>
                    <option value="Bank Cleared">Bank Cleared</option>
                    <option value="Under Banking Verification">Under Banking Verification</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{l.amount}</h3>
                  <p className="text-xs font-extrabold text-[#6A1B2E]">{l.beneficiary}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{l.bank}</p>
                </div>
                <div className="text-[10.5px] font-bold text-slate-400 pt-1 flex justify-between">
                  <span>Issued: {l.issueDate}</span>
                  <span>Expiry: {l.expiryDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button onClick={() => setSelectedLC(l)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View LC Terms
                </button>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToastMsg(`Requested bank status for ${l.id}`)}>
                    Bank Status
                  </Button>
                  <button onClick={() => handleDeleteLC(l.id, l.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete LC">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Issue Modal */}
      <AnimatePresence>
        {showIssueModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowIssueModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Issue Irrevocable Letter of Credit</h3>
                <button onClick={() => setShowIssueModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleIssueLC} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Beneficiary Corporate Party</label>
                  <input type="text" required value={newLC.beneficiary} onChange={(e) => setNewLC({ ...newLC, beneficiary: e.target.value })} placeholder="e.g. Warsaw Global Logistics Sp. z o.o." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Issuing Bank</label>
                    <input type="text" required value={newLC.bank} onChange={(e) => setNewLC({ ...newLC, bank: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input type="date" required value={newLC.expiryDate} onChange={(e) => setNewLC({ ...newLC, expiryDate: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Guaranteed LC Amount (₹ INR)</label>
                  <input type="text" required value={newLC.amount} onChange={(e) => setNewLC({ ...newLC, amount: e.target.value })} placeholder="₹1,45,00,000" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowIssueModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Submit to Issuing Bank</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedLC && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedLC(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Letter of Credit Document Inspector</h3>
                <button onClick={() => setSelectedLC(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedLC.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedLC.amount}</h4>
                  <p className="text-xs font-semibold text-slate-500">Beneficiary: {selectedLC.beneficiary}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Issuing Bank</span>
                  <div className="text-xs font-black text-slate-900">{selectedLC.bank}</div>
                  <div className="text-[11px] text-slate-500 pt-1">Expiry Date: {selectedLC.expiryDate}</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-extrabold text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  Bank Guarantee Cleared under ICC Uniform Customs Rules (UCP 600)
                </div>

                <Button size="sm" variant="outline" className="w-full text-xs font-bold mt-2" onClick={() => setSelectedLC(null)}>
                  Close Inspector
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
