import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { ACCEPT_ATTR, MAX_FILE_MB, checkFile, formatSize, uploadStudentFile } from '../lib/documentFiles';
import { CapLoader } from './CapLoader';

export interface UploadDone { path: string; size: string; fileName: string; title: string; note: string }

interface Props {
  open: boolean;
  studentId: string;
  /** Who is uploading for whom, shown so staff can see they are acting on a student's file. */
  forStudentName?: string;
  /** Fixed title when uploading a checklist item; when empty the person types the title. */
  fixedTitle?: string;
  hint?: string;
  askNote?: boolean;
  onClose: () => void;
  /** Save the database record. Throw to show an error and keep the dialog open. */
  onUploaded: (r: UploadDone) => Promise<void>;
}

// One upload experience for students, counselors and admins: pick or drop a file, watch the percentage, done.
export const DocumentUploadDialog: React.FC<Props> = ({ open, studentId, forStudentName, fixedTitle, hint, askNote, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [percent, setPercent] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => { setFile(null); setTitle(fixedTitle || ''); setNote(''); setPercent(0); setPhase('idle'); setError(''); }, [fixedTitle]);
  useEffect(() => { if (open) reset(); }, [open, reset]);

  const busy = phase === 'uploading' || phase === 'saving';
  const close = () => { if (phase === 'uploading') abort.current?.abort(); onClose(); };
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  });

  if (!open) return null;

  const pick = (f?: File | null) => {
    if (!f) return;
    const problem = checkFile(f);
    if (problem) { setFile(null); setError(problem); return; }
    setError(''); setFile(f);
    if (!fixedTitle && !title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Choose a file first.'); return; }
    const finalTitle = (fixedTitle || title).trim();
    if (!finalTitle) { setError('Give the document a name.'); return; }
    setError(''); setPercent(0); setPhase('uploading');
    abort.current = new AbortController();
    try {
      const up = await uploadStudentFile({ studentId, file, label: finalTitle, onProgress: setPercent, signal: abort.current.signal });
      setPhase('saving');
      await onUploaded({ path: up.path, size: up.size, fileName: `${finalTitle}.${file.name.split('.').pop()}`, title: finalTitle, note: note.trim() });
      setPhase('done');
      setTimeout(onClose, 900);
    } catch (err) {
      setPhase('idle'); setPercent(0);
      const msg = (err as Error).message;
      if (msg !== 'Upload cancelled.') setError(msg);
    }
  };

  const label = phase === 'saving' ? 'Saving…' : phase === 'done' ? 'Uploaded' : phase === 'uploading' ? `Uploading… ${percent}%` : 'Upload document';
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Upload document">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => !busy && close()} />
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{fixedTitle ? `Upload: ${fixedTitle}` : 'Upload a document'}</h3>
            {forStudentName && <p className="text-xs text-slate-500 mt-0.5">For {forStudentName}</p>}
            {hint && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{hint}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={close} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {!fixedTitle && (
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 mb-1">Document name</span>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={busy} placeholder="e.g. Passport, 12th marksheet" className="w-full h-10 px-3" />
          </label>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) pick(e.dataTransfer.files?.[0]); }}
          className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${drag ? 'border-[#5A0122] bg-[#5A0122]/[0.04]' : 'border-slate-300 bg-slate-50'}`}
        >
          <input ref={input} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={e => pick(e.target.files?.[0])} />
          {!file ? (
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="w-full cursor-pointer">
              <UploadCloud className="w-8 h-8 mx-auto text-[#5A0122]" />
              <p className="text-sm font-semibold text-slate-800 mt-2">Choose a file or drop it here</p>
              <p className="text-[11px] text-slate-500 mt-0.5">PDF, JPG, PNG, WebP or Word · up to {MAX_FILE_MB} MB</p>
            </button>
          ) : (
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-[#5A0122]" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                <p className="text-[11px] text-slate-500">{formatSize(file.size)}</p>
              </div>
              {!busy && phase !== 'done' && <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ''; }} className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">Change</button>}
            </div>
          )}
        </div>

        {phase !== 'idle' && (
          <div aria-live="polite" className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5">{phase === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <CapLoader size="xs" />}{phase === 'uploading' ? 'Uploading' : phase === 'saving' ? 'Saving' : 'Uploaded'}</span>
              <span className="tabular-nums">{phase === 'uploading' ? `${percent}%` : '100%'}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={phase === 'uploading' ? percent : 100} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full transition-[width] duration-150 ${phase === 'done' ? 'bg-emerald-500' : 'bg-[#5A0122]'}`} style={{ width: `${phase === 'uploading' ? percent : 100}%` }} />
            </div>
          </div>
        )}

        {askNote && (
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 mb-1">Note (optional)</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} disabled={busy} rows={2} className="w-full px-3 py-2" placeholder="Anything the reviewer should know" />
          </label>
        )}

        {error && <p role="alert" className="text-xs font-semibold text-rose-700 flex items-start gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={close} className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">{phase === 'uploading' ? 'Cancel upload' : 'Close'}</button>
          <button type="submit" disabled={busy || phase === 'done' || !file} className="h-10 px-5 rounded-xl bg-[#5A0122] text-white text-xs font-bold hover:bg-[#68092A] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">{label}</button>
        </div>
      </form>
    </div>
  );
};
