import React, { useEffect, useState } from 'react';
import { X, Download, ExternalLink, FileText, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';
import { resolveDocumentUrl, previewKind } from '../lib/documentFiles';

export interface ViewerDoc { name: string; url: string; subtitle?: string }

// Opens any stored document in the page: PDFs and pictures show right away, everything else offers a download.
export const DocumentViewer: React.FC<{ doc: ViewerDoc | null; onClose: () => void; footer?: React.ReactNode }> = ({ doc, onClose, footer }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!doc) return;
    let live = true;
    setUrl(''); setError(''); setZoom(1); setLoading(true);
    resolveDocumentUrl(doc.url).then(u => live && setUrl(u)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { live = false; window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [doc, onClose]);

  if (!doc) return null;
  const kind = previewKind(doc.name || doc.url);
  const btn = 'h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors';
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Viewing ${doc.name}`}>
      <header className="flex items-center gap-3 px-4 py-3 text-white border-b border-white/10">
        <FileText className="w-5 h-5 text-white/70 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{doc.name}</p>
          {doc.subtitle && <p className="text-[11px] text-white/60 truncate">{doc.subtitle}</p>}
        </div>
        {kind === 'image' && url && (
          <div className="hidden sm:flex items-center gap-1">
            <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className={`${btn} bg-white/10 hover:bg-white/20 w-9 justify-center px-0`}><ZoomOut className="w-4 h-4" /></button>
            <span className="text-[11px] w-10 text-center text-white/70 tabular-nums">{Math.round(zoom * 100)}%</span>
            <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className={`${btn} bg-white/10 hover:bg-white/20 w-9 justify-center px-0`}><ZoomIn className="w-4 h-4" /></button>
          </div>
        )}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`${btn} bg-white/10 hover:bg-white/20 text-white`}><ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">New tab</span></a>}
        {url && <a href={url} download={doc.name} className={`${btn} bg-white text-slate-900 hover:bg-slate-100`}><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Download</span></a>}
        <button aria-label="Close" onClick={onClose} className={`${btn} bg-white/10 hover:bg-white/20 text-white w-9 justify-center px-0`}><X className="w-4 h-4" /></button>
      </header>
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-3 sm:p-6" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        {loading && <div className="text-white/80 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Opening document…</div>}
        {error && <div className="max-w-sm text-center text-white space-y-2"><AlertCircle className="w-8 h-8 mx-auto text-amber-300" /><p className="text-sm font-semibold">{error}</p></div>}
        {url && kind === 'pdf' && <iframe title={doc.name} src={url} className="w-full h-full max-w-5xl rounded-lg bg-white" />}
        {url && kind === 'image' && <img src={url} alt={doc.name} style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }} className="max-w-full max-h-full object-contain rounded-lg bg-white transition-transform" />}
        {url && kind === 'other' && (
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-900">This file type can't be previewed here</p>
            <p className="text-xs text-slate-500">Download it to open it on your device.</p>
            <a href={url} download={doc.name} className="inline-flex h-10 px-5 items-center rounded-xl bg-[#58051E] text-white text-xs font-bold">Download</a>
          </div>
        )}
      </div>
      {footer && <footer className="px-4 py-3 bg-white border-t border-slate-200">{footer}</footer>}
    </div>
  );
};
