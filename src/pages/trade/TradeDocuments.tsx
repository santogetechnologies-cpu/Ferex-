import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderArchive, Search, Plus, CheckCircle2, X, Download,
  Eye, Trash2, Send, ShieldCheck, ShieldAlert, Clock,
  FileText, Building2, UserCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeDocuments,
  uploadTradeDocument,
  updateTradeDocumentStatus,
  deleteTradeDocument,
  getTradeOrders,
  TRADE_STANDARD_DOC_TYPES,
  TRADE_DOC_STATUSES,
  type TradeDocument,
  type TradeDocType,
  type TradeDocInternalStatus,
  type TradeOrder
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradeDocuments: React.FC = () => {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<TradeDocument[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TradeDocument | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState('');

  const userName = profile?.full_name || 'Trade Officer';

  const initialUploadForm = {
    order_no: '',
    client_name: '',
    doc_type: 'Commercial Invoice' as TradeDocType,
    doc_number: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
    file_name: '',
    notes: '',
    status: 'Submitted' as TradeDocInternalStatus,
    auto_send: true,
  };

  const [uploadForm, setUploadForm] = useState(initialUploadForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allDocs, allOrders] = await Promise.all([
        getTradeDocuments(),
        getTradeOrders()
      ]);
      setDocs(Array.isArray(allDocs) ? allDocs : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
      if (allOrders.length > 0 && !uploadForm.order_no) {
        setUploadForm(prev => ({
          ...prev,
          order_no: allOrders[0].order_no,
          client_name: allOrders[0].client_name
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_docs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_documents' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_documents_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_documents_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOrderSelect = (orderNo: string) => {
    const ord = orders.find(o => o.order_no === orderNo);
    setUploadForm(prev => ({
      ...prev,
      order_no: orderNo,
      client_name: ord?.client_name || prev.client_name,
      file_name: `${prev.doc_type.replace(/[^a-zA-Z0-9]/g, '_')}_${orderNo}.pdf`
    }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.order_no || !uploadForm.client_name) {
      showToastMsg('Please select an order to link this document.');
      return;
    }

    try {
      const created = await uploadTradeDocument({
        order_no: uploadForm.order_no,
        client_name: uploadForm.client_name,
        doc_type: uploadForm.doc_type,
        doc_number: uploadForm.doc_number,
        file_name: uploadForm.file_name || `${uploadForm.doc_type.replace(/[^a-zA-Z0-9]/g, '_')}_${uploadForm.order_no}.pdf`,
        file_size: `${Math.floor(180 + Math.random() * 400)} KB`,
        notes: uploadForm.notes,
        status: uploadForm.status,
        uploaded_by: userName,
      }, uploadForm.auto_send);

      setShowUploadModal(false);
      showToastMsg(`Attached ${created.doc_type} (${created.file_name})${uploadForm.auto_send ? ' & notified client' : ''}!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Upload failed: ${err.message || 'Error'}`);
    }
  };

  const handleStatusChange = async (docId: string, status: TradeDocInternalStatus, reason?: string) => {
    try {
      await updateTradeDocumentStatus(docId, status, userName, reason);
      showToastMsg(`Document status updated to ${status}`);
      setRejectingDocId(null);
      setRejectionReason('');
      await loadData();
      if (selectedDoc?.id === docId) {
        setSelectedDoc(prev => prev ? { ...prev, status, rejection_reason: reason || '' } : null);
      }
    } catch (err: any) {
      showToastMsg(`Failed to update status: ${err.message || 'Error'}`);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!window.confirm(`Delete document "${docName}"?`)) return;
    await deleteTradeDocument(docId);
    showToastMsg(`Deleted ${docName}`);
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    await loadData();
  };

  const handleDownloadMock = (doc: TradeDocument) => {
    const csvContent = [
      ['FEREX GLOBAL TRADE COMPLIANCE VAULT'],
      ['Document Type', doc.doc_type],
      ['Document Number', doc.doc_number || doc.id],
      ['Order Reference', doc.order_no],
      ['Client / Consignee', doc.client_name],
      ['Internal Status', doc.status],
      ['Verified By', doc.verified_by || 'Pending'],
      ['Verification Date', doc.verified_at || 'Pending'],
      ['Notes', doc.notes || 'None'],
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.doc_type.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.order_no}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg(`Downloaded ${doc.file_name}`);
  };

  const getStatusBadge = (status: TradeDocInternalStatus) => {
    switch (status) {
      case 'Verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredDocs = docs.filter(d => {
    const matchesSearch =
      d.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.doc_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || d.doc_type === filterType;
    const matchesStatus = filterStatus === 'All' || d.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-[#58051E]" />
            Trade Document Vault & Internal Verification
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage the 7 core international trade documents with internal statuses (Pending / Submitted / Verified / Rejected).
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowUploadModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Attach & Send Document
        </Button>
      </div>

      {/* 7 Standard Documents Categorical Tabs */}
      <Card className="p-3 border border-slate-200/80 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[700px]">
          {['All', ...TRADE_STANDARD_DOC_TYPES].map(type => {
            const count = type === 'All' ? docs.length : docs.filter(d => d.doc_type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterType === type
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{type}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filterType === type ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Search and Internal Status Filter Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Client, Document name..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Internal Status:</span>
          {['All', ...TRADE_DOC_STATUSES].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Documents Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading trade documents...
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Attach standard Proforma, Commercial Invoices, Packing Lists, BLs, or Certificates to linked orders.
          </p>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Order & Client</th>
                  <th className="py-3 px-4">Internal Status</th>
                  <th className="py-3 px-4">Uploaded / Sent</th>
                  <th className="py-3 px-4">Verification Audit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Document Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{doc.doc_type}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{doc.file_name} ({doc.file_size})</div>
                        </div>
                      </div>
                    </td>

                    {/* Order & Client */}
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 font-mono">{doc.order_no}</div>
                      <div className="text-[11px] text-slate-500">{doc.client_name}</div>
                    </td>

                    {/* Internal Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(doc.status)}`}>
                        {doc.status === 'Verified' && <ShieldCheck className="w-3 h-3" />}
                        {doc.status === 'Rejected' && <ShieldAlert className="w-3 h-3" />}
                        {doc.status === 'Submitted' && <Clock className="w-3 h-3" />}
                        {doc.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {doc.status}
                      </span>
                      {doc.rejection_reason && (
                        <div className="text-[10px] text-rose-600 mt-0.5 truncate max-w-[150px]" title={doc.rejection_reason}>
                          ⚠️ {doc.rejection_reason}
                        </div>
                      )}
                    </td>

                    {/* Uploaded / Sent */}
                    <td className="py-3 px-4">
                      <div className="text-slate-800">By: {doc.uploaded_by}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        {doc.sent_to_client ? '✓ Dispatched to Client' : 'Internal Only'}
                      </div>
                    </td>

                    {/* Verification Audit */}
                    <td className="py-3 px-4">
                      {doc.verified_by ? (
                        <div>
                          <div className="text-slate-900 font-bold">{doc.verified_by}</div>
                          <div className="text-[10px] text-slate-400">{doc.verified_at}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold">Awaiting Verification</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.status !== 'Verified' && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'Verified')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-black shadow-2xs transition-all cursor-pointer"
                            title="Verify and Approve Document"
                          >
                            ✓ Verify
                          </button>
                        )}
                        {doc.status !== 'Rejected' && (
                          <button
                            onClick={() => setRejectingDocId(doc.id)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10.5px] font-black transition-all cursor-pointer"
                            title="Reject Document with Discrepancy Reason"
                          >
                            ✕ Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadMock(doc)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="View Document Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Document"
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

      {/* ── UPLOAD DOCUMENT MODAL ── */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#58051E]" /> Attach Trade Document
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    Attaches international compliance files and triggers instant client email.
                  </p>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Select Linked Order *</label>
                  <select
                    required
                    value={uploadForm.order_no}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">-- Choose active order --</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.order_no}>
                        {o.order_no} — {o.client_name} ({o.commodity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Standard Document Type *</label>
                    <select
                      value={uploadForm.doc_type}
                      onChange={(e) => {
                        const dt = e.target.value as TradeDocType;
                        setUploadForm(prev => ({
                          ...prev,
                          doc_type: dt,
                          file_name: `${dt.replace(/[^a-zA-Z0-9]/g, '_')}_${prev.order_no || 'TRD'}.pdf`
                        }));
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_STANDARD_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Document / Serial #</label>
                    <input
                      type="text"
                      value={uploadForm.doc_number}
                      onChange={(e) => setUploadForm({ ...uploadForm, doc_number: e.target.value })}
                      placeholder="e.g. CI-8801 / BL-98394"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">File Name</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.file_name}
                    onChange={(e) => setUploadForm({ ...uploadForm, file_name: e.target.value })}
                    placeholder="e.g. Commercial_Invoice_TRD-8801.pdf"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Internal Status</label>
                    <select
                      value={uploadForm.status}
                      onChange={(e) => setUploadForm({ ...uploadForm, status: e.target.value as TradeDocInternalStatus })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {TRADE_DOC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Client Notification</label>
                    <label className="flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadForm.auto_send}
                        onChange={(e) => setUploadForm({ ...uploadForm, auto_send: e.target.checked })}
                        className="rounded text-[#58051E] focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-800">Auto-send email</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Compliance Notes</label>
                  <textarea
                    rows={2}
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                    placeholder="Attestation, seal numbers, chamber stamp details..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Attach & Send Document</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── REJECT REASON MODAL ── */}
      <AnimatePresence>
        {rejectingDocId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onClick={() => setRejectingDocId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <h3 className="text-sm font-black text-rose-900 flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Specify Rejection Discrepancy Reason
              </h3>
              <p className="text-xs text-slate-500 font-semibold mb-3">
                Log why this document failed internal compliance verification so staff can rectify it.
              </p>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. HS Code mismatch on Invoice line item 2, missing Chamber of Commerce stamp..."
                className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-rose-500 mb-3"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setRejectingDocId(null)}>Cancel</Button>
                <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => handleStatusChange(rejectingDocId, 'Rejected', rejectionReason)}>
                  Confirm Rejection
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DOCUMENT DETAILS MODAL ── */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onClick={() => setSelectedDoc(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(selectedDoc.status)}`}>
                    {selectedDoc.status}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{selectedDoc.doc_type}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedDoc.file_name} • {selectedDoc.order_no}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-3 text-xs font-semibold">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Reference:</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedDoc.order_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client / Consignee:</span>
                    <span className="text-slate-900 font-bold">{selectedDoc.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Uploaded By:</span>
                    <span className="text-slate-900 font-bold">{selectedDoc.uploaded_by}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification By:</span>
                    <span className="text-slate-900 font-bold">{selectedDoc.verified_by || 'Pending'}</span>
                  </div>
                  {selectedDoc.rejection_reason && (
                    <div className="pt-2 border-t border-slate-200/60 text-rose-700">
                      <strong>Rejection Reason:</strong> {selectedDoc.rejection_reason}
                    </div>
                  )}
                </div>

                {selectedDoc.notes && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Notes</span>
                    <p className="text-slate-700">{selectedDoc.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => handleDownloadMock(selectedDoc)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Export
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedDoc(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeDocuments;
