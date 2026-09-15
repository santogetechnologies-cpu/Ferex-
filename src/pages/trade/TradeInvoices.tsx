import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, Search, Download, Eye, Plus, X, CheckCircle2,
  Trash2, CreditCard, DollarSign, Calendar, Building2, Truck, ArrowRight, Printer
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeInvoices,
  createTradeInvoice,
  updateTradeInvoiceStatus,
  deleteTradeInvoice,
  getTradeCRMContacts,
  getTradeShipments,
  createTradePayment,
  TRADE_MASTER_INCOTERMS,
  TRADE_INVOICE_STATUSES,
  TRADE_MASTER_PAYMENT_METHODS
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeInvoices: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedInv, setSelectedInv] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, partners, shipData] = await Promise.all([
        getTradeInvoices(),
        getTradeCRMContacts().catch(() => []),
        getTradeShipments().catch(() => [])
      ]);

      if (Array.isArray(partners)) setCrmPartners(partners);
      if (Array.isArray(shipData)) setShipments(shipData);

      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.invoice_no || d.id,
          rawId: d.id,
          shipment_no: d.shipment_no || '',
          buyer: d.buyer_name || 'Trade Partner Buyer',
          seller: d.seller_name || 'FEREX Global Trade Operations Ltd',
          incoterms: d.incoterms || 'CIF (Cost, Insurance and Freight)',
          rawAmount: Number(d.amount || 0),
          amount: `₹${Number(d.amount || 0).toLocaleString('en-IN')}`,
          subtotal: Number(d.subtotal || d.amount || 0),
          freight: Number(d.freight_charges || 0),
          insurance: Number(d.insurance_charges || 0),
          tax: Number(d.tax_charges || 0),
          amountPaid: Number(d.amount_paid || 0),
          outstandingAmount: Number(d.outstanding_amount !== undefined ? d.outstanding_amount : (d.status === 'Paid' ? 0 : d.amount)),
          dueDate: d.due_date || '2026-10-15',
          issueDate: d.issue_date || '2026-09-01',
          paymentTerms: d.payment_terms || 'Letter of Credit (LC) at Sight',
          lcReference: d.lc_reference || '',
          items: d.items || [],
          status: d.status || d.payment_status || 'Issued',
          statusBadge: (d.status === 'Paid' || d.payment_status === 'Paid')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : (d.status === 'Partially Paid')
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : (d.status === 'Cancelled')
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200',
        }));
        setInvoices(formatted);
      } else {
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_invoices_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_invoices' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_invoices_change', handleLocalChange);
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_invoices_change', handleLocalChange);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
    };
  }, [loadData]);

  // Form State for Create Invoice
  const initialInv = {
    shipment_no: '',
    buyer: '',
    seller: 'FEREX Global Trade Operations Ltd',
    incoterms: 'CIF (Cost, Insurance and Freight)',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    paymentTerms: 'Letter of Credit (LC) at Sight',
    lcReference: '',
    freight_charges: '0',
    insurance_charges: '0',
    tax_charges: '0',
    item_desc: 'Agricultural Milling Wheat Grade-A',
    item_hs: '1001.99',
    item_qty: '20',
    item_unit: 'Metric Tons',
    item_price: '135000',
  };

  const [newInv, setNewInv] = useState(initialInv);

  // Form State for Record Payment Modal
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'SWIFT Wire Transfer',
    bank_name: 'HSBC London Trade Banking',
    account_no: 'GB29HSBC40051512345678',
    settlement_date: new Date().toISOString().split('T')[0],
    desc: 'Invoice settlement payment'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Dynamic calculation for subtotal & total in new invoice
  const itemTotal = (Number(newInv.item_qty) || 0) * (Number(newInv.item_price) || 0);
  const calculatedGrandTotal =
    itemTotal +
    (Number(newInv.freight_charges) || 0) +
    (Number(newInv.insurance_charges) || 0) +
    (Number(newInv.tax_charges) || 0);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInv.buyer || calculatedGrandTotal <= 0) return;

    const itemsPayload = [
      {
        description: newInv.item_desc || 'Commercial Trade Goods',
        hs_code: newInv.item_hs || '1001.99',
        quantity: Number(newInv.item_qty) || 1,
        unit: newInv.item_unit || 'Metric Tons',
        unit_price: Number(newInv.item_price) || calculatedGrandTotal,
        total: itemTotal,
      }
    ];

    const created = await createTradeInvoice({
      shipment_no: newInv.shipment_no,
      buyer_name: newInv.buyer,
      seller_name: newInv.seller,
      incoterms: newInv.incoterms,
      amount: calculatedGrandTotal,
      subtotal: itemTotal,
      freight_charges: Number(newInv.freight_charges) || 0,
      insurance_charges: Number(newInv.insurance_charges) || 0,
      tax_charges: Number(newInv.tax_charges) || 0,
      currency: 'INR',
      due_date: newInv.dueDate,
      payment_terms: newInv.paymentTerms,
      lc_reference: newInv.lcReference,
      status: 'Issued',
      items: itemsPayload,
    });

    setShowCreateModal(false);
    showToastMsg(`Commercial Invoice ${created.invoice_no} issued successfully`);
    setNewInv(initialInv);
    await loadData();
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    try {
      await updateTradeInvoiceStatus(rawId || id, newStatus);
      showToastMsg(`Invoice status updated to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error updating status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteInvoice = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete Commercial Invoice ${id}?`)) return;
    try {
      setInvoices(prev => prev.filter(i => i.id !== id && i.rawId !== rawId));
      showToastMsg(`Removed Invoice ${id}`);
      await deleteTradeInvoice(rawId || id);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error deleting invoice: ${err.message || 'Unknown error'}`);
    }
  };

  const handleOpenPayment = (inv: any) => {
    setPayingInvoice(inv);
    setPaymentForm({
      amount: String(inv.outstandingAmount > 0 ? inv.outstandingAmount : inv.rawAmount),
      payment_type: 'SWIFT Wire Transfer',
      bank_name: 'HSBC London Trade Banking',
      account_no: 'GB29HSBC40051512345678',
      settlement_date: new Date().toISOString().split('T')[0],
      desc: `Settlement for ${inv.id} (${inv.buyer})`
    });
    setShowPaymentModal(true);
  };

  const handleRecordInvoicePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice || !paymentForm.amount) return;

    await createTradePayment({
      partner_entity: payingInvoice.buyer,
      invoice_no: payingInvoice.id,
      shipment_no: payingInvoice.shipment_no,
      lc_reference: payingInvoice.lcReference,
      amount: Number(paymentForm.amount),
      currency: 'INR',
      bank_name: paymentForm.bank_name,
      account_no: paymentForm.account_no,
      payment_type: paymentForm.payment_type,
      flow_type: 'inbound',
      status: 'Completed',
      settlement_date: paymentForm.settlement_date,
      description: paymentForm.desc,
    });

    setShowPaymentModal(false);
    setPayingInvoice(null);
    showToastMsg(`Recorded payment of ₹${Number(paymentForm.amount).toLocaleString('en-IN')}`);
    await loadData();
  };

  const downloadInvoiceCSV = (inv: any) => {
    const rows = [
      ['FEREX GLOBAL TRADE COMMERCIAL INVOICE'],
      ['Invoice Number', inv.id],
      ['Buyer / Consignee', inv.buyer],
      ['Seller / Exporter', inv.seller],
      ['Shipment Reference', inv.shipment_no || 'N/A'],
      ['Incoterms', inv.incoterms],
      ['Issue Date', inv.issueDate],
      ['Due Date', inv.dueDate],
      ['Payment Terms', inv.paymentTerms],
      ['LC Reference', inv.lcReference || 'N/A'],
      ['Status', inv.status],
      ['Subtotal', `INR ${inv.subtotal}`],
      ['Freight Charges', `INR ${inv.freight}`],
      ['Insurance', `INR ${inv.insurance}`],
      ['Total Invoice Value', `INR ${inv.rawAmount}`],
      ['Amount Paid', `INR ${inv.amountPaid}`],
      ['Outstanding Balance', `INR ${inv.outstandingAmount}`],
    ];
    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${inv.id}_Commercial_Invoice.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.shipment_no && i.shipment_no.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'All' || i.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#58051E]" />
            Commercial Invoices & Trade Receivables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue international trade invoices with dynamic line items, freight & insurance breakdowns, and automatic payment reconciliation.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Commercial Invoice
        </Button>
      </div>

      {/* Search & Status Filter */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, buyer, or shipment..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
            >
              <option value="All">All Invoices ({invoices.length})</option>
              {TRADE_INVOICE_STATUSES.map(st => (
                <option key={st} value={st}>{st} ({invoices.filter(i => i.status === st).length})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading commercial invoices...</div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No commercial invoices found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No invoices match your search query.' : 'Generate your first commercial export invoice linked to a booked shipment.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Commercial Invoice
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Invoice Ref</th>
                  <th className="py-3 px-4">Shipment Link</th>
                  <th className="py-3 px-4">Buyer Entity</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#58051E] whitespace-nowrap">
                      {inv.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-600">
                      {inv.shipment_no ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono text-slate-800">{inv.shipment_no}</span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Direct Trade</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 max-w-[170px] truncate" title={inv.buyer}>
                      {inv.buyer}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-black text-slate-900">
                      {inv.amount}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`font-black ${inv.outstandingAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        ₹{inv.outstandingAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {inv.dueDate}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, inv.rawId, e.target.value)}
                        className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${inv.statusBadge}`}
                      >
                        {TRADE_INVOICE_STATUSES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.outstandingAmount > 0 && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer border border-emerald-200"
                            title="Record Payment against Invoice"
                          >
                            <CreditCard className="w-3 h-3" /> Settle
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInv(inv)}
                          className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="View Invoice Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadInvoiceCSV(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Export CSV"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.rawId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL 1: CREATE INVOICE ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#58051E]" /> Create Commercial Export Invoice
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Buyer / Consignee *</label>
                    <input
                      type="text"
                      required
                      list="invoice-buyer-list"
                      value={newInv.buyer}
                      onChange={(e) => setNewInv({ ...newInv, buyer: e.target.value })}
                      placeholder="Select or type buyer..."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="invoice-buyer-list">
                      {crmPartners.map(p => <option key={p.id} value={p.company_name || p.name}>{p.company_name || p.name}</option>)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Linked Shipment</label>
                    <select
                      value={newInv.shipment_no}
                      onChange={(e) => setNewInv({ ...newInv, shipment_no: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">No linked shipment (Direct)</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.id} ({s.cargo})</option>)}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Itemized Cargo Line Item</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product Description</label>
                    <input
                      type="text"
                      required
                      value={newInv.item_desc}
                      onChange={(e) => setNewInv({ ...newInv, item_desc: e.target.value })}
                      className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">HS Tariff Code</label>
                      <input
                        type="text"
                        value={newInv.item_hs}
                        onChange={(e) => setNewInv({ ...newInv, item_hs: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity (MT)</label>
                      <input
                        type="number"
                        required
                        value={newInv.item_qty}
                        onChange={(e) => setNewInv({ ...newInv, item_qty: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Price (INR ₹)</label>
                      <input
                        type="number"
                        required
                        value={newInv.item_price}
                        onChange={(e) => setNewInv({ ...newInv, item_price: e.target.value })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Freight (INR ₹)</label>
                    <input
                      type="number"
                      value={newInv.freight_charges}
                      onChange={(e) => setNewInv({ ...newInv, freight_charges: e.target.value })}
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Insurance (INR ₹)</label>
                    <input
                      type="number"
                      value={newInv.insurance_charges}
                      onChange={(e) => setNewInv({ ...newInv, insurance_charges: e.target.value })}
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tax / Duty (INR ₹)</label>
                    <input
                      type="number"
                      value={newInv.tax_charges}
                      onChange={(e) => setNewInv({ ...newInv, tax_charges: e.target.value })}
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                {/* Grand Total Bar */}
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <span className="text-xs font-extrabold">Calculated Grand Total</span>
                  <span className="text-base font-black text-amber-300">₹{calculatedGrandTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Incoterms</label>
                    <select
                      value={newInv.incoterms}
                      onChange={(e) => setNewInv({ ...newInv, incoterms: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      value={newInv.dueDate}
                      onChange={(e) => setNewInv({ ...newInv, dueDate: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Generate Invoice</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: RECORD PAYMENT DIRECTLY AGAINST INVOICE ── */}
      <AnimatePresence>
        {showPaymentModal && payingInvoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowPaymentModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Record Settlement for {payingInvoice.id}
                </h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleRecordInvoicePayment} className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="text-slate-500">Buyer: <strong>{payingInvoice.buyer}</strong></div>
                  <div className="text-slate-500 mt-0.5">Outstanding Balance: <strong className="text-amber-700">₹{payingInvoice.outstandingAmount.toLocaleString('en-IN')}</strong></div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Settlement Amount (INR ₹) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentForm.payment_type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                  >
                    {TRADE_MASTER_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Receiving Bank</label>
                    <input
                      type="text"
                      value={paymentForm.bank_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Settlement Date</label>
                    <input
                      type="date"
                      value={paymentForm.settlement_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, settlement_date: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Confirm Payment</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: INVOICE FULL DOSSIER ── */}
      <AnimatePresence>
        {selectedInv && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedInv(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {selectedInv.id}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">Commercial Invoice Dossier</h2>
                  <p className="text-xs text-slate-500">Issued: {selectedInv.issueDate} • Due: {selectedInv.dueDate}</p>
                </div>
                <button onClick={() => setSelectedInv(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Seller / Exporter</span>
                    <span className="font-extrabold text-slate-900">{selectedInv.seller}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Buyer / Consignee</span>
                    <span className="font-extrabold text-slate-900">{selectedInv.buyer}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Incoterms</span>
                    <span className="font-bold text-slate-800">{selectedInv.incoterms}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Terms</span>
                    <span className="font-bold text-slate-800">{selectedInv.paymentTerms}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedInv.statusBadge}`}>{selectedInv.status}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-slate-600"><span>Commodity Subtotal:</span> <span>₹{selectedInv.subtotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Ocean Freight:</span> <span>₹{selectedInv.freight.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Marine Insurance:</span> <span>₹{selectedInv.insurance.toLocaleString('en-IN')}</span></div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-sm text-slate-900">
                    <span>Total Invoice Value:</span>
                    <span>{selectedInv.amount}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Amount Cleared:</span>
                    <span>₹{selectedInv.amountPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-black">
                    <span>Outstanding Receivable:</span>
                    <span>₹{selectedInv.outstandingAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => downloadInvoiceCSV(selectedInv)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedInv(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
