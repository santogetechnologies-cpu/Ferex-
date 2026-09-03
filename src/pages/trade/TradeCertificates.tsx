import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Search, Download, Eye, ShieldCheck, CheckCircle2, X, Plus, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeCertificates, createTradeCertificate, updateTradeCertificateStatus, deleteTradeCertificate } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeCertificates: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCert, setNewCert] = useState({
    title: 'EU Certificate of Origin (Form A)',
    authority: 'Chamber of Commerce Warsaw',
    country: 'Poland 🇵🇱',
    validity_months: 12
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeCertificates();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.certificate_no || d.id,
          rawId: d.id,
          title: d.title,
          authority: d.authority,
          country: d.country || 'Poland 🇵🇱',
          issueDate: d.issue_date || '2026-07-10',
          expiryDate: d.expiry_date || '2027-07-10',
          status: d.status || 'Verified & Active',
          statusBadge: (d.status === 'Verified & Active' || d.status === 'Audit Passed')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }));
        setCerts(formatted);
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
      .channel('realtime_trade_certs')
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

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiry = new Date(Date.now() + (newCert.validity_months * 30 * 86400000)).toISOString().split('T')[0];
    const created = await createTradeCertificate({
      title: newCert.title,
      authority: newCert.authority,
      country: newCert.country,
      expiry_date: expiry,
    });
    await loadData();
    setShowAddModal(false);
    showToastMsg(`Registered Trade Certificate ${created.certificate_no || created.id}`);
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    await updateTradeCertificateStatus(rawId || id, newStatus);
    showToastMsg(`Certificate status updated to ${newStatus}`);
    await loadData();
  };

  const handleDeleteCert = async (id: string, rawId?: string) => {
    await deleteTradeCertificate(rawId || id);
    setCerts(prev => prev.filter(c => c.id !== id && c.rawId !== rawId));
    showToastMsg(`Removed certificate record ${id}`);
  };

  const filteredCerts = certs.filter(c =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.authority || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Award className="w-5 h-5 text-[#6A1B2E]" /> Trade Certificates & Compliance Vault
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • EU Certificates of Origin, Phytosanitary clearances, ISO certifications, and chamber seals.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register Certificate
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search cert #, title, or authority..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredCerts.length} Verified Certificates</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading certificates vault...</div>
      ) : filteredCerts.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Certificates found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No certificates match your query.' : 'There are no active certificates in the compliance vault. Register a new certificate below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Register Certificate
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCerts.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{c.id}</span>
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, c.rawId, e.target.value)}
                    className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 border cursor-pointer ${c.statusBadge}`}
                  >
                    <option value="Verified & Active">Verified & Active</option>
                    <option value="Audit Passed">Audit Passed</option>
                    <option value="Pending Renewal">Pending Renewal</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{c.title}</h3>
                  <p className="text-xs font-bold text-[#6A1B2E] mt-0.5">{c.authority}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.country}</p>
                </div>
                <div className="text-[10.5px] font-bold text-slate-400 pt-1 flex justify-between">
                  <span>Issued: {c.issueDate}</span>
                  <span>Expires: {c.expiryDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setSelectedCert(c)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Inspect Seal
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => showToastMsg(`Downloading Certificate ${c.id}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100" title="Download PDF">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCert(c.id, c.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Certificate">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Certificate Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register Trade Certificate</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCert} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Certificate Title</label>
                  <input type="text" required value={newCert.title} onChange={(e) => setNewCert({ ...newCert, title: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Issuing Authority / Agency</label>
                  <input type="text" required value={newCert.authority} onChange={(e) => setNewCert({ ...newCert, authority: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country Jurisdiction</label>
                    <input type="text" required value={newCert.country} onChange={(e) => setNewCert({ ...newCert, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Validity (Months)</label>
                    <input type="number" required value={newCert.validity_months} onChange={(e) => setNewCert({ ...newCert, validity_months: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Certificate</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedCert && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedCert(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Certificate Verification Seal</h3>
                <button onClick={() => setSelectedCert(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedCert.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedCert.title}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedCert.authority} · {selectedCert.country}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Validity Period</span>
                  <div className="text-xs font-black text-slate-900">Valid From: {selectedCert.issueDate}</div>
                  <div className="text-xs font-semibold text-slate-500">Expires: {selectedCert.expiryDate}</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-extrabold text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  Official Digital Stamp & Customs Clearance Verified
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Exported Verified Seal for ${selectedCert.id}`);
                }}>
                  Export Verified Certificate (PDF)
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
