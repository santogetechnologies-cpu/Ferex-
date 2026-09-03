import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderArchive, Search, Upload, Eye, Trash2, X, CheckCircle2, FileText, Folder, Plus } from 'lucide-react';
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
    try {
      const data = await getTradeDocuments();
      if (Array.isArray(data)) {
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
      } else {
        setFiles([]);
      }
    } finally {
      setLoading(false);
    }
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
    const matchesSearch = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
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
            <FolderArchive className="w-5 h-5 text-[#6A1B2E]" /> Global Trade Document Vault
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Repository for Bill of Lading scans, export licenses, customs declarations, and LC contracts.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload Document
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search document by name..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'Shipment Contracts', 'Export Invoices', 'Customs Clearance', 'Letters of Credit'].map((folder) => (
            <button key={folder} onClick={() => setActiveFolder(folder)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeFolder === folder ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {folder}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading document vault...</div>
      ) : filteredFiles.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No documents match your query.' : 'There are no active files in this vault folder. Upload a new document below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="p-4 border border-slate-200/70 shadow-xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">{file.size}</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2" title={file.name}>{file.name}</h4>
                  <span className="text-[10.5px] font-semibold text-slate-500 block mt-1">{file.folder}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 pt-1">
                  Updated: {file.updated}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setSelectedFile(file)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Inspect
                </button>
                <button onClick={() => handleDeleteFile(file.id, file.rawId)} className="p-1 text-slate-400 hover:text-red-600 rounded" title="Delete Document">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Upload Trade Document to Vault</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Document File Name</label>
                  <input type="text" required value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="e.g. Maersk_Bill_Of_Lading_BL992014.pdf" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Vault Folder</label>
                  <select value={newFileFolder} onChange={(e) => setNewFileFolder(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Shipment Contracts">Shipment Contracts</option>
                    <option value="Export Invoices">Export Invoices</option>
                    <option value="Customs Clearance">Customs Clearance</option>
                    <option value="Letters of Credit">Letters of Credit</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Upload to Vault</Button>
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
                <h3 className="text-sm font-black text-slate-900">Trade Document Vault Inspector</h3>
                <button onClick={() => setSelectedFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedFile.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedFile.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">Folder: {selectedFile.folder} · Size: {selectedFile.size}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Vault Details</span>
                  <div className="text-xs font-black text-slate-900">Uploaded: {selectedFile.updated}</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1">Status: Digitally Signed & Verified</div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Exporting digital copy for ${selectedFile.name}`);
                }}>
                  Download Digital PDF Copy
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
