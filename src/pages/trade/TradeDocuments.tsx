import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderArchive, Search, Upload, Eye, Trash2, X, CheckCircle2,
  FileText, Download, FileUp, Paperclip, FolderPlus, Folder,
  Image as ImageIcon, Layers, Sparkles, Building2, Truck, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeDocuments,
  uploadTradeDocumentRecord,
  deleteTradeDocumentRecord,
  getTradeShipments,
  getTradeInvoices,
  getTradeCRMContacts,
  TRADE_MASTER_DOC_TYPES
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

const DEFAULT_FOLDERS = [
  'Commercial Invoices',
  'Bills of Lading',
  'Certificates of Origin',
  'Letters of Credit',
  'Packing Lists',
  'Customs Clearance & Inspection',
  'Marine Cargo Insurance Policies',
  'Phytosanitary & Health Certificates',
];

export const TradeDocuments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom folder state persisted in localStorage
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_trade_custom_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newDocName, setNewDocName] = useState('');
  const [newDocFolder, setNewDocFolder] = useState('Commercial Invoices');
  const [newDocType, setNewDocType] = useState('Commercial Invoice');
  const [newDocShipment, setNewDocShipment] = useState('');
  const [newDocInvoice, setNewDocInvoice] = useState('');
  const [newDocPartner, setNewDocPartner] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('1.8 MB');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, shipData, invData, partners] = await Promise.all([
        getTradeDocuments(),
        getTradeShipments().catch(() => []),
        getTradeInvoices().catch(() => []),
        getTradeCRMContacts().catch(() => [])
      ]);

      if (Array.isArray(shipData)) setShipments(shipData);
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(partners)) setCrmPartners(partners);

      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.id ? `DOC-${d.id.slice(0, 4).toUpperCase()}` : 'DOC-101',
          rawId: d.id,
          name: d.document_name || d.name,
          folder: d.folder || 'Commercial Invoices',
          docType: d.doc_type || 'Commercial Invoice',
          shipment_no: d.shipment_no || '',
          invoice_no: d.invoice_no || '',
          partner: d.partner_name || 'FEREX Global Trade Operations',
          size: d.file_size || '1.8 MB',
          uploadedBy: d.uploaded_by || 'Trade Operator',
          updated: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently',
          url: d.document_url || '',
          isVerified: d.is_verified ?? true,
          verificationStatus: d.verification_status || (d.is_verified ? 'Verified' : 'Pending Review'),
          type: (d.document_name || d.name || '').split('.').pop()?.toUpperCase() || 'PDF'
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
      .channel('realtime_trade_docs_page')
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

  const allFolders = React.useMemo(() => {
    const set = new Set<string>(['All', ...DEFAULT_FOLDERS, ...customFolders]);
    files.forEach((f) => {
      if (f.folder) set.add(f.folder);
    });
    return Array.from(set);
  }, [files, customFolders]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewDocName(file.name);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileSizeStr(`${sizeMB} MB`);

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setFileDataUrl(loadEvt.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setNewDocName(file.name);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileSizeStr(`${sizeMB} MB`);

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setFileDataUrl(loadEvt.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;

    await uploadTradeDocumentRecord({
      document_name: newDocName,
      folder: newDocFolder,
      file_size: fileSizeStr,
      doc_type: newDocType,
      shipment_no: newDocShipment,
      invoice_no: newDocInvoice,
      partner_name: newDocPartner || 'FEREX Global Trade Operations',
      document_url: fileDataUrl,
      is_verified: true,
    });

    setShowUploadModal(false);
    setNewDocName('');
    setFileDataUrl('');
    showToastMsg(`Document ${newDocName} uploaded to vault.`);
    await loadData();
  };

  const handleDeleteDoc = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete document ${id}?`)) return;
    setFiles(prev => prev.filter(f => f.id !== id && f.rawId !== rawId));
    showToastMsg('Document removed from vault');
    await deleteTradeDocumentRecord(rawId || id);
    await loadData();
  };

  const downloadFileRecord = (file: any) => {
    if (file.url && file.url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Fallback CSV download with metadata
      const rows = [
        ['FEREX GLOBAL TRADE VAULT DOCUMENT'],
        ['Document Ref', file.id],
        ['Document Name', file.name],
        ['Category / Folder', file.folder],
        ['Document Type', file.docType],
        ['Linked Shipment', file.shipment_no || 'N/A'],
        ['Linked Invoice', file.invoice_no || 'N/A'],
        ['Trade Partner', file.partner],
        ['Verification Status', file.verificationStatus],
        ['Uploaded Date', file.updated],
      ];
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.folder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.partner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.shipment_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolder === 'All' || f.folder === activeFolder;
    return matchesSearch && matchesFolder;
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
            <FolderArchive className="w-5 h-5 text-[#58051E]" />
            Trade Document Vault & Compliance Archives
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Secure digital repository for Bills of Lading, Commercial Invoices, Certificates of Origin, LCs, and customs dossiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Folder Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {allFolders.map((folder) => {
          const isActive = activeFolder === folder;
          const count = folder === 'All' ? files.length : files.filter(f => f.folder === folder).length;
          return (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                isActive
                  ? 'bg-[#58051E] text-white border-[#58051E] shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>{folder}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Box */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by document name, folder, partner, shipment..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
      </Card>

      {/* Grid of Documents */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading document vault...</div>
      ) : filteredFiles.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No documents in this vault category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No documents match your search.' : 'Upload authentic digital trade documents and link them to shipments and partners.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="p-4 border border-slate-200/80 shadow-xs hover:border-[#58051E]/30 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> {file.verificationStatus}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-black text-slate-900 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="text-[10.5px] font-bold text-[#58051E] mt-0.5">{file.folder}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 space-y-1">
                  <div className="truncate"><span className="text-slate-400">Partner:</span> {file.partner}</div>
                  {file.shipment_no && <div className="truncate"><span className="text-slate-400">Shipment:</span> <strong className="font-mono text-slate-800">{file.shipment_no}</strong></div>}
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>{file.size}</span>
                    <span>{file.updated}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setSelectedFile(file)}
                  className="font-extrabold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => downloadFileRecord(file)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(file.id, file.rawId)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL 1: UPLOAD DOCUMENT ── */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#58051E]" /> Upload Trade Document to Vault
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5">
                {/* Drag and drop box */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                    isDragging ? 'border-[#58051E] bg-[#58051E]/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  <FileUp className="w-8 h-8 text-[#58051E] mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-800 block">
                    {newDocName ? newDocName : 'Click to browse or drag file here'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Supports PDF, PNG, JPG, DOCX, CSV (Max 25MB)</span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Document Display Title *</label>
                  <input
                    type="text"
                    required
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="e.g. Clean_Ocean_Bill_of_Lading_SHP-9821.pdf"
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Vault Folder</label>
                    <select
                      value={newDocFolder}
                      onChange={(e) => setNewDocFolder(e.target.value)}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {DEFAULT_FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Document Type</label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Link to Shipment (Optional)</label>
                    <select
                      value={newDocShipment}
                      onChange={(e) => setNewDocShipment(e.target.value)}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">No linked shipment</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.id} ({s.cargo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Partner Entity</label>
                    <input
                      type="text"
                      list="doc-partner-list"
                      value={newDocPartner}
                      onChange={(e) => setNewDocPartner(e.target.value)}
                      placeholder="e.g. Baltic Grain Sp. z o.o."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="doc-partner-list">
                      {crmPartners.map(p => <option key={p.id} value={p.company_name || p.name}>{p.company_name || p.name}</option>)}
                    </datalist>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Upload to Vault</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: PREVIEW / INSPECT DOCUMENT ── */}
      <AnimatePresence>
        {selectedFile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedFile(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="min-w-0 pr-3">
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {selectedFile.id}
                  </span>
                  <h2 className="text-sm font-black text-slate-900 mt-1 truncate">{selectedFile.name}</h2>
                  <p className="text-[11px] text-slate-500">{selectedFile.folder} • {selectedFile.size}</p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                {selectedFile.url && selectedFile.url.startsWith('data:image') ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-60 flex items-center justify-center bg-slate-100">
                    <img src={selectedFile.url} alt={selectedFile.name} className="object-contain max-h-60 w-full" />
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <FileText className="w-12 h-12 text-[#58051E] mx-auto mb-2 opacity-80" />
                    <span className="font-bold text-slate-800 block text-xs">{selectedFile.docType}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Authenticated Maritime PDF Archive Record</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div><span className="text-slate-400">Trade Partner:</span> <strong>{selectedFile.partner}</strong></div>
                  <div><span className="text-slate-400">Linked Shipment:</span> <strong className="font-mono">{selectedFile.shipment_no || 'Direct Vault Archive'}</strong></div>
                  <div><span className="text-slate-400">Uploaded By:</span> <strong>{selectedFile.uploadedBy}</strong></div>
                  <div><span className="text-slate-400">Uploaded Date:</span> <strong>{selectedFile.updated}</strong></div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => downloadFileRecord(selectedFile)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedFile(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
