import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderArchive, Search, Upload, Eye, Trash2, X, CheckCircle2, FileText, Folder } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeDocuments, uploadTradeDocumentRecord, deleteTradeDocumentRecord } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeDocuments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFileName, setNewFileName] = useState('');
  const [newFileFolder, setNewFileFolder] = useState('Customs Clearance');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getTradeDocuments();
    const formatted = data.map((d: any) => ({
      id: d.id ? `DOC-${d.id.slice(0, 4).toUpperCase()}` : 'DOC-101',
      rawId: d.id,
      name: d.document_name || d.name,
      folder: d.folder || 'Customs Clearance',
      size: d.file_size || '1.8 MB',
      updated: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently',
      url: d.document_url || '',
      type: 'PDF'
    }));
    setFiles(formatted);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_documents' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_docs_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_docs_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;
    const cleanName = newFileName.endsWith('.pdf') ? newFileName : `${newFileName}.pdf`;
    const created = await uploadTradeDocumentRecord({
      document_name: cleanName,
      folder: newFileFolder,
      file_size: '1.5 MB',
      doc_type: 'Customs Declaration'
    });
    await loadData();
    setShowUploadModal(false);
    showToastMsg(`Uploaded ${cleanName} to vault!`);
    setNewFileName('');
  };

  const handleDeleteFile = async (id: string, rawId?: string) => {
    await deleteTradeDocumentRecord(rawId || id);
    setFiles(prev => prev.filter(f => f.id !== id && f.rawId !== rawId));
    showToastMsg(`Deleted document ${id}`);
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolder === 'All' || f.folder === activeFolder;
    return matchesSearch && matchesFolder;
  });

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
            <FolderArchive className="w-5 h-5 text-[#6A1B2E]" /> Enterprise Trade Document Manager
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Vault for shipping manifests, LC certificates, EUR.1 forms, and customs invoices.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload Trade Document
        </Button>
      </div>

      {/* Folders Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['All', 'Shipment Contracts', 'Export Invoices', 'Customs Clearance'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFolder(f)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activeFolder === f ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700'
            }`}
          >
            <Folder className={`w-4 h-4 mb-2 ${activeFolder === f ? 'text-white' : 'text-[#6A1B2E]'}`} />
            <div className="text-xs font-black truncate">{f}</div>
            <span className="text-[10px] opacity-75 font-semibold block mt-0.5">Cloud Vault</span>
          </button>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search file name or ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredFiles.length} Vault Files Listed</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Category Folder</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6A1B2E] shrink-0" />
                    <div>
                      <div>{file.name}</div>
                      <span className="text-[10px] font-bold text-slate-400">{file.id}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{file.folder}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{file.size}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{file.updated}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedFile(file)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect Document">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFile(file.id, file.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete File">
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

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Upload to Trade Document Vault</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Document File Name</label>
                  <input type="text" required value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="e.g. Phytosanitary_Clearance_Batch8.pdf" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Folder</label>
                  <select value={newFileFolder} onChange={e => setNewFileFolder(e.target.value)} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Shipment Contracts">Shipment Contracts</option>
                    <option value="Export Invoices">Export Invoices</option>
                    <option value="Customs Clearance">Customs Clearance</option>
                    <option value="Letters of Credit">Letters of Credit</option>
                  </select>
                </div>
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-slate-600 block">Drag & drop files or click to browse</span>
                  <span className="text-[10px] font-semibold text-slate-400">Supports PDF, DOCX, XLSX (Max 25MB)</span>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Upload File</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedFile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedFile(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Trade Vault Document Inspector</h3>
                <button onClick={() => setSelectedFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedFile.id}</span>
                  <h4 className="text-sm font-black text-slate-900">{selectedFile.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedFile.folder} · {selectedFile.size}</p>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Downloading file ${selectedFile.name}`);
                }}>
                  Download Vault Copy
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
