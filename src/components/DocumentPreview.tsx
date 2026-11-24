import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';

/**
 * Shows a bill or invoice first. Nothing prints until the person presses Print, and the preview (with its Print button)
 * stays open when the print dialog is cancelled. "Save as PDF" is the print dialog's own destination.
 */
export const DocumentPreview: React.FC<{ html: string; title: string; onClose: () => void }> = ({ html, title, onClose }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const print = () => { const w = frame.current?.contentWindow; if (w) { w.focus(); w.print(); } };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-black text-slate-900 truncate">{title}</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={print} className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-[#5A0122] hover:bg-[#68092A] text-white text-xs font-bold cursor-pointer"><Printer className="w-3.5 h-3.5" />Print / Save as PDF</button>
            <button type="button" aria-label="Close preview" onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <iframe ref={frame} title={title} srcDoc={html} className="flex-1 w-full bg-white" />
      </div>
    </div>
  );
};
