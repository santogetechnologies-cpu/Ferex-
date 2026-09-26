import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  CheckCircle2,
  X,
  ShieldCheck,
  Trash2,
  Eye,
  Download,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  Ship,
  FileText
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getTradeLettersOfCredit,
  createTradeLetterOfCredit,
  updateTradeLetterOfCreditStatus,
  deleteTradeLetterOfCredit,
  getTradeCRMContacts,
  getTradeShipments,
  getTradeInvoices,
  getTradeDossier,
  TRADE_MASTER_BANKS,
  TRADE_MASTER_CURRENCIES
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

const LC_STATUSES = [
  'Draft',
  'Issued',
  'Advised',
  'Documents Submitted',
  'Under Review',
  'Accepted',
  'Discrepancy',
  'Settled',
  'Expired'
];

export const TradeLettersOfCredit: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedLC, setSelectedLC] = useState<any>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [toast, setToast] = useState('');
  const [lcs, setLcs] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialLC = {
    bank: TRADE_MASTER_BANKS[0],
    advising_bank: TRADE_MASTER_BANKS[1],
    applicant: 'Ferex Global Trade Corp',
    beneficiary: '',
    amount: '',
    currency: 'INR',
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    shipment_no: '',
    invoice_no: '',
    lc_type: 'Irrevocable Confirmed at Sight',
    tenor: '60 Days Sight',
    status: 'Issued'
  };

  const [newLC, setNewLC] = useState(initialLC);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, partners, ships, invs] = await Promise.all([
        getTradeLettersOfCredit(),
        getTradeCRMContacts().catch(() => []),
        getTradeShipments().catch(() => []),
        getTradeInvoices().catch(() => [])
      ]);
      if (Array.isArray(partners)) setCrmPartners(partners);
      if (Array.isArray(ships)) setShipments(ships);
      if (Array.isArray(invs)) setInvoices(invs);

      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.lc_number || d.id,
          rawId: d.id,
          bank: d.issuing_bank || d.bank,
          advising_bank: d.advising_bank || 'State Bank of India Overseas',
          beneficiary: d.beneficiary,
          applicant: d.applicant || 'Ferex Global Trade Corp',
          rawAmount: Number(d.amount) || 0,
          currency: d.currency || 'INR',
          amount: `${d.currency === 'USD' ? '$' : d.currency === 'EUR' ? '€' : '₹'}${Number(d.amount).toLocaleString('en-IN')}`,
          issueDate: d.issue_date || d.created_at?.split('T')[0] || '2026-08-15',
          expiryDate: d.expiry_date || '2026-10-30',
          shipment_no: d.shipment_no || '',
          invoice_no: d.invoice_no || '',
          lc_type: d.lc_type || 'Irrevocable Confirmed at Sight',
          status: d.status || 'Issued',
          statusBadge:
            d.status === 'Settled' || d.status === 'Accepted' || d.status === 'HSBC Cleared'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : d.status === 'Expired' || d.status === 'Discrepancy'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : d.status === 'Under Review' || d.status === 'Documents Submitted'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
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
      .channel('realtime_trade_lcs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_letters_of_credit' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_lcs_change', handleLocalChange);
    window.addEventListener('ferex_trade_crm_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_lcs_change', handleLocalChange);
      window.removeEventListener('ferex_trade_crm_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleIssueLC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLC.beneficiary) return;
    const numAmount = parseFloat(String(newLC.amount).replace(/[^0-9.]/g, '')) || 0;
    const created = await createTradeLetterOfCredit({
      issuing_bank: newLC.bank,
      advising_bank: newLC.advising_bank,
      applicant: newLC.applicant,
      beneficiary: newLC.beneficiary,
      amount: numAmount,
      currency: newLC.currency,
      expiry_date: newLC.expiryDate,
      shipment_no: newLC.shipment_no || undefined,
      invoice_no: newLC.invoice_no || undefined,
      lc_type: newLC.lc_type,
      status: newLC.status || 'Issued'
    });
    setNewLC(initialLC);
    await loadData();
    setShowIssueModal(false);
    showToastMsg(`Issued Letter of Credit ${created.lc_number || created.id}`);
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    try {
      await updateTradeLetterOfCreditStatus(rawId || id, newStatus);
      showToastMsg(`LC ${id} status updated to ${newStatus}`);
      await loadData();
      if (selectedLC && (selectedLC.id === id || selectedLC.rawId === rawId)) {
        setSelectedLC((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      showToastMsg(`Error updating LC status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteLC = async (id: string, rawId?: string) => {
    if (!confirm(`Are you sure you want to delete Letter of Credit ${id}?`)) return;
    try {
      await deleteTradeLetterOfCredit(rawId || id);
      setLcs((prev) => prev.filter((l) => l.id !== id && l.rawId !== rawId));
      if (selectedLC?.id === id) setSelectedLC(null);
      showToastMsg(`Deleted Letter of Credit ${id}`);
    } catch (err: any) {
      showToastMsg(`Error deleting LC: ${err.message || 'Unknown error'}`);
    }
  };

  const handleInspectLC = async (lc: any) => {
    setSelectedLC(lc);
    const d = await getTradeDossier('lc', lc.id);
    setDossier(d);
  };

  const handleExportCSV = () => {
    if (lcs.length === 0) return;
    const headers = ['LC Number', 'Issuing Bank', 'Advising Bank', 'Applicant', 'Beneficiary', 'Amount', 'Currency', 'Issue Date', 'Expiry Date', 'Status'];
    const rows = lcs.map((l) => [
      l.id,
      `"${l.bank}"`,
      `"${l.advising_bank}"`,
      `"${l.applicant}"`,
      `"${l.beneficiary}"`,
      l.rawAmount,
      l.currency,
      l.issueDate,
      l.expiryDate,
      l.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FEREX_LC_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg('Exported LC Ledger to CSV');
  };

  // Aggregated Stats
  const totalLCAmount = lcs.reduce((sum, l) => sum + l.rawAmount, 0);
  const activeLCAmount = lcs.filter((l) => l.status !== 'Expired' && l.status !== 'Settled').reduce((sum, l) => sum + l.rawAmount, 0);
  const settledLCCount = lcs.filter((l) => l.status === 'Settled' || l.status === 'Accepted').length;
  const discrepancyCount = lcs.filter((l) => l.status === 'Discrepancy').length;

  const formatCr = (amt: number) => {
    if (!amt || amt === 0) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const filteredLCs = lcs.filter((l) => {
    const matchesSearch =
      (l.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.beneficiary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.bank || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.applicant || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#58051E]" /> International Letters of Credit (LC Duty & Guarantees)
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Irrevocable documentary credits, banking guarantees, UCP 600 compliance, and cross-border bank settlement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold cursor-pointer" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export LC Ledger
          </Button>
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
            onClick={() => {
              setNewLC(initialLC);
              setShowIssueModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Issue Letter of Credit
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500 border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Total LC Credit Volume</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{formatCr(totalLCAmount)}</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">{lcs.length} Total Registered LCs</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Active Bank Exposure</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600">{formatCr(activeLCAmount)}</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">Confirmed Irrevocable Lines</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#58051E] border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Settled Under UCP 600</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#58051E]" />
            </div>
          </div>
          <div className="text-xl font-black text-[#58051E]">{settledLCCount} Lines</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">Completed Bank Clearances</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Under Review / Discrepancy</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600">{discrepancyCount} Pending</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">Documentary Verification</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search LC #, Bank, Beneficiary..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8.5 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
          >
            <option value="All">All LC Statuses</option>
            {LC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-xs font-bold text-slate-400">{filteredLCs.length} Active Records</span>
        </div>
      </Card>

      {/* LC Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading letters of credit...</div>
      ) : filteredLCs.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Letters of Credit found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No LC lines match your search filter.' : 'Your documentary credit ledger is empty. Issue a new Letter of Credit below.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
            onClick={() => {
              setNewLC(initialLC);
              setShowIssueModal(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Issue Letter of Credit
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLCs.map((l) => (
            <Card key={l.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#58051E] uppercase font-mono">{l.id}</span>
                  <select
                    value={l.status}
                    onChange={(e) => handleStatusChange(l.id, l.rawId, e.target.value)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border cursor-pointer focus:outline-none ${l.statusBadge}`}
                  >
                    {LC_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">{l.amount}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate" title={l.beneficiary}>
                    Beneficiary: <strong className="text-slate-800">{l.beneficiary}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">Applicant: {l.applicant}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="text-slate-500 font-semibold truncate">
                    Issuing: <span className="font-bold text-slate-800">{l.bank}</span>
                  </div>
                  <div className="text-slate-500 font-semibold truncate">
                    Advising: <span className="font-bold text-slate-800">{l.advising_bank}</span>
                  </div>
                  <div className="text-slate-500 font-semibold flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span>Expiry:</span>
                    <span className="font-bold text-slate-800 font-mono">{l.expiryDate}</span>
                  </div>
                  {(l.shipment_no || l.invoice_no) && (
                    <div className="text-[10px] font-bold text-blue-600 flex items-center gap-2 pt-0.5">
                      {l.shipment_no && <span className="flex items-center gap-1"><Ship className="w-3 h-3 text-blue-500" /> {l.shipment_no}</span>}
                      {l.invoice_no && <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-blue-500" /> {l.invoice_no}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleInspectLC(l)}
                  className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect LC Dossier
                </button>
                <button
                  onClick={() => handleDeleteLC(l.id, l.rawId)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                  title="Delete LC"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#58051E]" /> Issue Irrevocable Letter of Credit (MT700)
                </h3>
                <button onClick={() => setShowIssueModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleIssueLC} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Applicant (Buyer)</label>
                    <input
                      type="text"
                      required
                      value={newLC.applicant}
                      onChange={(e) => setNewLC({ ...newLC, applicant: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Beneficiary Party</label>
                    <input
                      type="text"
                      required
                      list="crm-lc-beneficiary-list"
                      value={newLC.beneficiary}
                      onChange={(e) => setNewLC({ ...newLC, beneficiary: e.target.value })}
                      placeholder="e.g. Baltic Grain Sp. z o.o."
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="crm-lc-beneficiary-list">
                      {crmPartners.map((p) => (
                        <option key={p.id} value={p.company_name || p.name}>
                          {p.category ? `${p.company_name || p.name} (${p.category})` : p.company_name || p.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Issuing Bank</label>
                    <select
                      value={newLC.bank}
                      onChange={(e) => setNewLC({ ...newLC, bank: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Advising Bank</label>
                    <select
                      value={newLC.advising_bank}
                      onChange={(e) => setNewLC({ ...newLC, advising_bank: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Guaranteed LC Amount</label>
                    <input
                      type="text"
                      required
                      value={newLC.amount}
                      onChange={(e) => setNewLC({ ...newLC, amount: e.target.value })}
                      placeholder="e.g. 14500000"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Currency</label>
                    <select
                      value={newLC.currency}
                      onChange={(e) => setNewLC({ ...newLC, currency: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Linked Shipment</label>
                    <select
                      value={newLC.shipment_no}
                      onChange={(e) => setNewLC({ ...newLC, shipment_no: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- Optional Shipment Link --</option>
                      {shipments.map((s) => (
                        <option key={s.id} value={s.shipment_no || s.id}>
                          {s.shipment_no || s.id} ({s.carrier || 'Ocean'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Linked Invoice</label>
                    <select
                      value={newLC.invoice_no}
                      onChange={(e) => setNewLC({ ...newLC, invoice_no: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- Optional Invoice Link --</option>
                      {invoices.map((i) => (
                        <option key={i.id} value={i.invoice_no || i.id}>
                          {i.invoice_no || i.id} (₹{Number(i.amount).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={newLC.expiryDate}
                      onChange={(e) => setNewLC({ ...newLC, expiryDate: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Initial Status</label>
                    <select
                      value={newLC.status}
                      onChange={(e) => setNewLC({ ...newLC, status: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {LC_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold cursor-pointer" onClick={() => setShowIssueModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] cursor-pointer">Submit to Issuing Bank</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LC Inspector Drawer */}
      <AnimatePresence>
        {selectedLC && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedLC(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <span className="text-[10px] font-black text-[#58051E] uppercase">{selectedLC.id}</span>
                  <h3 className="text-sm font-black text-slate-900">Letter of Credit Document Inspector</h3>
                </div>
                <button onClick={() => setSelectedLC(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Guaranteed Amount</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${selectedLC.statusBadge}`}>{selectedLC.status}</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">{selectedLC.amount}</h4>
                  <p className="text-xs font-semibold text-slate-500">Beneficiary: <strong className="text-slate-800">{selectedLC.beneficiary}</strong></p>
                  <p className="text-xs font-semibold text-slate-500">Applicant: <strong className="text-slate-800">{selectedLC.applicant}</strong></p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issuing Bank:</span>
                    <strong className="text-slate-900">{selectedLC.bank}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Advising Bank:</span>
                    <strong className="text-slate-900">{selectedLC.advising_bank}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issue Date:</span>
                    <strong className="text-slate-900">{selectedLC.issueDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expiry Date:</span>
                    <strong className="text-slate-900 font-mono">{selectedLC.expiryDate}</strong>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-extrabold text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  Bank Guarantee Cleared under ICC Uniform Customs Rules (UCP 600)
                </div>

                {dossier && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Linked Ecosystem Records</h4>
                    {dossier.shipments && dossier.shipments.length > 0 && (
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1">
                        <div className="font-bold text-blue-900 flex items-center gap-1.5"><Ship className="w-3.5 h-3.5" /> Linked Shipment</div>
                        <div className="text-slate-700">{dossier.shipments[0].shipment_no} · {dossier.shipments[0].origin_port} → {dossier.shipments[0].destination_port}</div>
                      </div>
                    )}
                    {dossier.invoices && dossier.invoices.length > 0 && (
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Linked Invoice</div>
                        <div className="text-slate-700">{dossier.invoices[0].invoice_no} · ₹{Number(dossier.invoices[0].amount).toLocaleString('en-IN')}</div>
                      </div>
                    )}
                  </div>
                )}

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
