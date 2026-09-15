import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderArchive,
  Search,
  Upload,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  FileText,
  Download,
  FileUp,
  Paperclip,
  FolderPlus,
  Folder,
  Image as ImageIcon,
  Layers,
  Sparkles
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeDocuments, uploadTradeDocumentRecord, deleteTradeDocumentRecord } from '../../lib/api/trade';
import { downloadGenericVaultDocument } from '../../utils/fileDownloader';
import { supabase } from '../../lib/supabase';

const DEFAULT_FOLDERS = [
  'Customs Clearance',
  'Proforma Invoice',
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading / Airway Bill',
  'Certificate of Origin',
  'Letter of Credit',
  'Inspection Certificate'
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

  const [newFileName, setNewFileName] = useState('');
  const [newFileFolder, setNewFileFolder] = useState('Customs Clearance');
  const [isCustomFolderSelected, setIsCustomFolderSelected] = useState(false);
  const [customFolderUploadName, setCustomFolderUploadName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Derive all unique folders dynamically from default, custom, and documents
  const allFolders = React.useMemo(() => {
    const set = new Set<string>(['All', ...DEFAULT_FOLDERS, ...customFolders]);
    files.forEach((f) => {
      if (f.folder) set.add(f.folder);
    });
    return Array.from(set);
  }, [customFolders, files]);

  const handleCreateNewFolder = (folderName: string) => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (!customFolders.includes(trimmed) && !DEFAULT_FOLDERS.includes(trimmed)) {
      const updated = [...customFolders, trimmed];
      setCustomFolders(updated);
      try {
        localStorage.setItem('ferex_trade_custom_folders', JSON.stringify(updated));
      } catch {}
    }
    setActiveFolder(trimmed);
    setShowNewFolderModal(false);
    setNewFolderNameInput('');
    showToastMsg(`Created folder: ${trimmed}`);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    if (!newFileName || newFileName.trim() === '') {
      setNewFileName(file.name);
    }
    // Auto-detect folder by file name keywords
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('bill') || lowerName.includes('bl') || lowerName.includes('lading')) {
      setNewFileFolder('Bill of Lading / Airway Bill');
      setIsCustomFolderSelected(false);
    } else if (lowerName.includes('invoice') || lowerName.includes('inv')) {
      setNewFileFolder('Commercial Invoice');
      setIsCustomFolderSelected(false);
    } else if (lowerName.includes('packing') || lowerName.includes('pl')) {
      setNewFileFolder('Packing List');
      setIsCustomFolderSelected(false);
    } else if (lowerName.includes('origin') || lowerName.includes('coo')) {
      setNewFileFolder('Certificate of Origin');
      setIsCustomFolderSelected(false);
    } else if (lowerName.includes('credit') || lowerName.includes('lc')) {
      setNewFileFolder('Letter of Credit');
      setIsCustomFolderSelected(false);
    } else if (lowerName.includes('inspect')) {
      setNewFileFolder('Inspection Certificate');
      setIsCustomFolderSelected(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const docTitle = newFileName.trim() || uploadedFile?.name || 'Trade_Document.pdf';

    let resolvedFolder = newFileFolder;
    if (isCustomFolderSelected) {
      resolvedFolder = customFolderUploadName.trim() || 'General Vault';
      if (!customFolders.includes(resolvedFolder) && !DEFAULT_FOLDERS.includes(resolvedFolder)) {
        const updated = [...customFolders, resolvedFolder];
        setCustomFolders(updated);
        try {
          localStorage.setItem('ferex_trade_custom_folders', JSON.stringify(updated));
        } catch {}
      }
    }

    let formattedSize = '1.5 MB';
    if (uploadedFile) {
      const mb = uploadedFile.size / (1024 * 1024);
      formattedSize = mb < 1 ? `${Math.round(uploadedFile.size / 1024)} KB` : `${mb.toFixed(1)} MB`;
    }

    await uploadTradeDocumentRecord({
      document_name: docTitle,
      folder: resolvedFolder,
      file_size: formattedSize,
      doc_type: resolvedFolder
    });

    // Auto-dispatch notification email if possible
    try {
      const { sendTradeStageEmail } = await import('../../lib/api/automatedEmails');
      await sendTradeStageEmail({
        clientEmail: 'procurement@globalbuyer.eu',
        clientName: 'Commercial Trade Partner',
        shipmentNo: 'SHP-EU-8840',
        stage: 'Document Ready',
        documentTitle: `${docTitle} (${resolvedFolder})`
      });
    } catch {}

    await loadData();
    setActiveFolder(resolvedFolder);
    setShowUploadModal(false);
    showToastMsg(`Uploaded ${docTitle} to folder "${resolvedFolder}"!`);
    setNewFileName('');
    setUploadedFile(null);
    setIsCustomFolderSelected(false);
    setCustomFolderUploadName('');
  };

  const handleDeleteFile = async (id: string, rawId?: string) => {
    try {
      await deleteTradeDocumentRecord(rawId || id);
      setFiles((prev) => prev.filter((f) => f.id !== id && f.rawId !== rawId));
      showToastMsg(`Deleted document ${id}`);
    } catch (err: any) {
      showToastMsg(`Error deleting document: ${err.message || 'Unknown error'}`);
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolder === 'All' || f.folder === activeFolder;
    return matchesSearch && matchesFolder;
  });

  const getFolderCount = (folderName: string) => {
    if (folderName === 'All') return files.length;
    return files.filter((f) => f.folder === folderName).length;
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-[#58051E]" /> Global Trade Document Vault & Folders
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Repository for Bill of Lading, Commercial Invoices, Packing Lists, Certificates of Origin & custom category folders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-bold border-slate-200 hover:border-[#58051E] cursor-pointer"
            onClick={() => {
              setNewFolderNameInput('');
              setShowNewFolderModal(true);
            }}
          >
            <FolderPlus className="w-4 h-4 mr-1.5 text-[#58051E]" /> + New Folder
          </Button>
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
            onClick={() => {
              setNewFileName('');
              setUploadedFile(null);
              setIsCustomFolderSelected(false);
              setCustomFolderUploadName('');
              setShowUploadModal(true);
            }}
          >
            <Upload className="w-4 h-4 mr-1.5" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Search & Dynamic Folder Navigation Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document by name..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>
          <span className="text-xs font-bold text-slate-400 shrink-0">
            Showing {filteredFiles.length} of {files.length} documents
          </span>
        </div>

        {/* Dynamic Folder Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
          {allFolders.map((folder) => {
            const count = getFolderCount(folder);
            const isCustom = !DEFAULT_FOLDERS.includes(folder) && folder !== 'All';
            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeFolder === folder
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {folder === 'All' ? (
                  <Layers className="w-3.5 h-3.5" />
                ) : isCustom ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Folder className="w-3.5 h-3.5 opacity-70" />
                )}
                <span>{folder}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeFolder === folder ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading document vault...</div>
      ) : filteredFiles.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">
            {activeFolder === 'All' ? 'No documents found' : `No documents in "${activeFolder}"`}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No documents match your query.'
              : `Upload a document to store it inside the "${activeFolder === 'All' ? 'Vault' : activeFolder}" directory.`}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
            onClick={() => {
              setNewFileName('');
              setUploadedFile(null);
              if (activeFolder !== 'All' && DEFAULT_FOLDERS.includes(activeFolder)) {
                setNewFileFolder(activeFolder);
                setIsCustomFolderSelected(false);
              } else if (activeFolder !== 'All') {
                setIsCustomFolderSelected(true);
                setCustomFolderUploadName(activeFolder);
              }
              setShowUploadModal(true);
            }}
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Document to {activeFolder === 'All' ? 'Vault' : activeFolder}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="p-4 border border-slate-200/70 shadow-xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold text-xs">
                    {file.type === 'PNG' || file.type === 'JPG' || file.type === 'JPEG' ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                    {file.size}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Folder className="w-3 h-3 text-slate-400" />
                    <span className="text-[10.5px] font-semibold text-slate-600 truncate">{file.folder}</span>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 pt-1">
                  Updated: {file.updated}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedFile(file)}
                  className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      downloadGenericVaultDocument(file);
                      showToastMsg(`Downloaded ${file.name}`);
                    }}
                    className="p-1 text-slate-400 hover:text-[#58051E] rounded cursor-pointer"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id, file.rawId)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Inspect Document Modal */}
      <AnimatePresence>
        {selectedFile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setSelectedFile(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#58051E]" /> Document Inspection
                </h3>
                <button onClick={() => setSelectedFile(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Vault Reference</span>
                    <span className="text-[10px] font-extrabold text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                      {selectedFile.id}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">{selectedFile.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Folder</span>
                      <span className="font-bold text-slate-800">{selectedFile.folder}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">File Size</span>
                      <span className="font-bold text-slate-800">{selectedFile.size}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Format</span>
                      <span className="font-bold text-slate-800">{selectedFile.type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Upload Date</span>
                      <span className="font-bold text-slate-800">{selectedFile.updated}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
                    onClick={() => {
                      downloadGenericVaultDocument(selectedFile);
                      showToastMsg(`Downloaded ${selectedFile.name}`);
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Document
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold cursor-pointer"
                    onClick={() => setSelectedFile(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setShowNewFolderModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#58051E]" /> Create New Vault Folder
                </h3>
                <button onClick={() => setShowNewFolderModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateNewFolder(newFolderNameInput);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Folder Name</label>
                  <input
                    type="text"
                    required
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    placeholder="e.g. EU Phytosanitary Certificates or Warsaw Port Logs"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold cursor-pointer"
                    onClick={() => setShowNewFolderModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] cursor-pointer"
                  >
                    Create Folder
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upload Modal with File Picker & Dynamic Folder Option */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-[#58051E]" /> Upload Trade Document to Vault
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload Dropzone */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Select Document File / Open Gallery
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.tiff"
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#58051E] bg-[#58051E]/5'
                        : uploadedFile
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {uploadedFile ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{uploadedFile.name}</p>
                            <p className="text-[10px] font-semibold text-slate-500">
                              {uploadedFile.size / (1024 * 1024) < 1
                                ? `${Math.round(uploadedFile.size / 1024)} KB`
                                : `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`}{' '}
                              • Click to replace
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Click to browse gallery / choose file, or drag & drop
                          </p>
                          <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                            PDF, Word, Excel, CSV, PNG, JPG (up to 25 MB)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-[#58051E]" /> Browse Files
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Document Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. MSC_Oscar_Ocean_Bill_Of_Lading.pdf"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Target Vault Folder / Category
                  </label>
                  <select
                    value={isCustomFolderSelected ? '__custom__' : newFileFolder}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomFolderSelected(true);
                      } else {
                        setIsCustomFolderSelected(false);
                        setNewFileFolder(e.target.value);
                      }
                    }}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    {DEFAULT_FOLDERS.map((df) => (
                      <option key={df} value={df}>
                        {df}
                      </option>
                    ))}
                    {customFolders.length > 0 && (
                      <optgroup label="Custom User Folders">
                        {customFolders.map((cf) => (
                          <option key={cf} value={cf}>
                            📁 {cf}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__custom__">+ Create New Custom Folder...</option>
                  </select>
                </div>

                {/* If user selected "+ Create New Custom Folder..." */}
                {isCustomFolderSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5"
                  >
                    <label className="block text-[10px] font-extrabold text-amber-900 uppercase">
                      New Folder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customFolderUploadName}
                      onChange={(e) => setCustomFolderUploadName(e.target.value)}
                      placeholder="e.g. Rotterdam Customs Clearance 2026"
                      className="w-full h-9 px-3 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                    />
                    <p className="text-[10px] text-amber-700 font-semibold">
                      This will automatically create the folder tab and file this document into it.
                    </p>
                  </motion.div>
                )}

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold cursor-pointer"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] cursor-pointer"
                  >
                    Upload to Vault
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
