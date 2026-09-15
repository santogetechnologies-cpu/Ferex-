import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, Search, Download, Eye, Plus, X, CheckCircle2, ShieldCheck,
  Building2, Globe, Trash2, Calendar, FileText
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeCertificates,
  createTradeCertificate,
  updateTradeCertificateStatus,
  deleteTradeCertificate,
  getTradeCRMContacts,
  getTradeShipments,
  TRADE_MASTER_CERT_TYPES
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeCertificates: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  const initialCert = {
    shipment_no: '',
    cert_type: 'Certificate of Origin (Non-Preferential)',
    title: '',
    authority: 'Polish Chamber of Commerce (KIG), Warsaw',
    country: 'Poland',
    exporter: 'FEREX Global Trade Operations Ltd',
    importer: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: 'Verified & Active',
  };

  const [newCert, setNewCert] = useState(initialCert);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, partners, shipData] = await Promise.all([
        getTradeCertificates(),
        getTradeCRMContacts().catch(() => []),
        getTradeShipments().catch(() => [])
      ]);

      if (Array.isArray(partners)) setCrmPartners(partners);
      if (Array.isArray(shipData)) setShipments(shipData);

      if (Array.isArray(data)) {
        setCerts(data.map((c: any) => ({
          id: c.certificate_no || c.id,
          rawId: c.id,
          shipment_no: c.shipment_no || '',
          certType: c.cert_type || 'Certificate of Origin',
          title: c.title || 'Trade Compliance Certificate',
          authority: c.authority || 'State Authority',
          country: c.country || 'Poland',
          exporter: c.exporter || 'FEREX Global Trade Operations Ltd',
          importer: c.importer || 'Consignee Entity',
          issueDate: c.issue_date || '2026-09-02',
          expiryDate: c.expiry_date || '2027-09-02',
          status: c.status || 'Verified & Active',
          statusBadge: (c.status === 'Verified & Active' || c.status === 'Active')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : (c.status === 'Expired')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
        })));
      } else {
        setCerts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_certs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_certificates' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_certs_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_certs_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.authority || !newCert.country) return;

    const autoTitle = newCert.title || `${newCert.cert_type} (${newCert.country})`;

    const created = await createTradeCertificate({
      shipment_no: newCert.shipment_no,
      cert_type: newCert.cert_type,
      title: autoTitle,
      authority: newCert.authority,
      country: newCert.country,
      exporter: newCert.exporter,
      importer: newCert.importer,
      issue_date: newCert.issue_date,
      expiry_date: newCert.expiry_date,
      status: newCert.status,
    });

    setNewCert(initialCert);
    setShowCreateModal(false);
    showToastMsg(`Registered Certificate ${created.certificate_no || created.id}`);
    await loadData();
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    try {
      await updateTradeCertificateStatus(rawId || id, newStatus);
      showToastMsg(`Certificate status updated to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteCert = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete Certificate ${id}?`)) return;
    setCerts(prev => prev.filter(c => c.id !== id && c.rawId !== rawId));
    showToastMsg(`Removed Certificate ${id}`);
    await deleteTradeCertificate(rawId || id);
    await loadData();
  };

  const downloadCertCSV = (c: any) => {
    const rows = [
      ['FEREX GLOBAL TRADE COMPLIANCE CERTIFICATE'],
      ['Certificate Number', c.id],
      ['Shipment Reference', c.shipment_no || 'N/A'],
      ['Certificate Type', c.certType],
      ['Official Title', c.title],
      ['Issuing Authority', c.authority],
      ['Country of Issue', c.country],
      ['Exporter', c.exporter],
      ['Importer', c.importer],
      ['Issue Date', c.issueDate],
      ['Expiry Date', c.expiryDate],
      ['Compliance Status', c.status],
    ];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.id}_Trade_Certificate.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredCerts = certs.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || c.certType === filterType;
    return matchesSearch && matchesType;
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
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#58051E]" />
            Trade Certificates & Compliance Vault
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Certificates of Origin, Phytosanitary health checks, SGS Quality Analysis, and EUR.1 movement compliance.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Register Certificate
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by certificate #, title, authority, country..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
            >
              <option value="All">All Certificate Types ({certs.length})</option>
              {TRADE_MASTER_CERT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Certificates Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading compliance certificates...</div>
      ) : filteredCerts.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No trade certificates found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No certificates match your query.' : 'Register official trade certificates from national chambers of commerce and inspection bodies.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Register Certificate
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Certificate #</th>
                  <th className="py-3 px-4">Title & Type</th>
                  <th className="py-3 px-4">Issuing Authority</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Shipment Link</th>
                  <th className="py-3 px-4">Validity Expiry</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredCerts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#58051E] whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate">
                      <div className="font-extrabold text-slate-900 truncate">{c.title}</div>
                      <div className="text-[10px] text-slate-400">{c.certType}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 max-w-[170px] truncate" title={c.authority}>
                      {c.authority}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {c.country}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                      {c.shipment_no || <span className="text-slate-400">Master Record</span>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {c.expiryDate}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, c.rawId, e.target.value)}
                        className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${c.statusBadge}`}
                      >
                        <option value="Verified & Active">Verified & Active</option>
                        <option value="Under Inspection">Under Inspection</option>
                        <option value="Expired">Expired</option>
                        <option value="Revoked">Revoked</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedCert(c)}
                          className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="View Certificate Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadCertCSV(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Export Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCert(c.id, c.rawId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete Certificate"
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

      {/* ── MODAL 1: REGISTER CERTIFICATE ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#58051E]" /> Register Trade Compliance Certificate
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateCert} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Certificate Type</label>
                  <select
                    value={newCert.cert_type}
                    onChange={(e) => setNewCert({ ...newCert, cert_type: e.target.value })}
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                  >
                    {TRADE_MASTER_CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Official Certificate Title</label>
                  <input
                    type="text"
                    value={newCert.title}
                    onChange={(e) => setNewCert({ ...newCert, title: e.target.value })}
                    placeholder="e.g. EU Non-Preferential Certificate of Origin"
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Issuing Authority / Agency *</label>
                    <input
                      type="text"
                      required
                      value={newCert.authority}
                      onChange={(e) => setNewCert({ ...newCert, authority: e.target.value })}
                      placeholder="e.g. Polish Chamber of Commerce (KIG)"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country of Issue *</label>
                    <input
                      type="text"
                      required
                      value={newCert.country}
                      onChange={(e) => setNewCert({ ...newCert, country: e.target.value })}
                      placeholder="e.g. Poland, Germany, UAE"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Link to Shipment (Optional)</label>
                    <select
                      value={newCert.shipment_no}
                      onChange={(e) => setNewCert({ ...newCert, shipment_no: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">No linked shipment (Master Certificate)</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.id} ({s.cargo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Importer / Consignee</label>
                    <input
                      type="text"
                      list="cert-importer-list"
                      value={newCert.importer}
                      onChange={(e) => setNewCert({ ...newCert, importer: e.target.value })}
                      placeholder="e.g. Baltic Grain Sp. z o.o."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="cert-importer-list">
                      {crmPartners.map(p => <option key={p.id} value={p.company_name || p.name}>{p.company_name || p.name}</option>)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={newCert.issue_date}
                      onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={newCert.expiry_date}
                      onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Register Certificate</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: CERTIFICATE DOSSIER ── */}
      <AnimatePresence>
        {selectedCert && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedCert(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {selectedCert.id}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{selectedCert.title}</h2>
                  <p className="text-xs text-slate-500">{selectedCert.certType} • {selectedCert.country}</p>
                </div>
                <button onClick={() => setSelectedCert(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div><span className="text-slate-400 font-bold">Issuing Authority:</span> <strong className="text-slate-900">{selectedCert.authority}</strong></div>
                  <div><span className="text-slate-400 font-bold">Exporter Entity:</span> <strong className="text-slate-900">{selectedCert.exporter}</strong></div>
                  <div><span className="text-slate-400 font-bold">Importer Entity:</span> <strong className="text-slate-900">{selectedCert.importer}</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Issue Date</span>
                    <span className="font-extrabold text-slate-900">{selectedCert.issueDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Expiry Date</span>
                    <span className="font-extrabold text-slate-900">{selectedCert.expiryDate}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Shipment Link</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedCert.shipment_no || 'Master Registry'}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${selectedCert.statusBadge}`}>{selectedCert.status}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => downloadCertCSV(selectedCert)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Record
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedCert(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
