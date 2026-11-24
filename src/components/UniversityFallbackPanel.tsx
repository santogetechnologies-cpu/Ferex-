import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { uploadFileToBucket } from '../lib/storage';
import { saveUniversityFallbackImage } from '../lib/api/universityFallback';
import { useUniversityFallback } from '../hooks/useUniversityFallback';
import { UniversityFallback } from './UniversityImage';
import { CapLoader } from './CapLoader';

// Admin control: the default picture used for every university that has no picture of its own.
export const UniversityFallbackPanel: React.FC<{ onMessage?: (m: string) => void }> = ({ onMessage }) => {
  const current = useUniversityFallback();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) { setError('Choose an image file (JPG, PNG or WebP).'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('The image must be under 10 MB.'); return; }
    setBusy(true);
    try {
      const res = await uploadFileToBucket('digital-assets', file, 'university_default');
      if (!res.url) throw new Error(res.error || 'The upload did not complete.');
      await saveUniversityFallbackImage(res.url);
      onMessage?.('Default university picture saved. It now shows on every university without its own picture.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const remove = async () => {
    setBusy(true); setError('');
    try { await saveUniversityFallbackImage(''); onMessage?.('Default picture removed.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <section className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-5 text-left">
      <div className="w-full sm:w-56 h-32 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
        {current ? <img src={current} alt="Default university" className="w-full h-full object-cover" /> : <UniversityFallback name="Your University" country="Preview" />}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <h3 className="text-sm font-bold text-slate-900">Default university picture</h3>
        <p className="text-xs text-slate-500 leading-relaxed">Shown for any university that has no picture of its own, for students, staff and on the public site. {current ? '' : 'Until you upload one, a drawn campus illustration is used.'}</p>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="h-9 px-4 rounded-xl bg-[#5A0122] text-white text-xs font-bold hover:bg-[#68092A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer">
            {busy ? <CapLoader size="xs" tone="light" /> : <ImagePlus className="w-3.5 h-3.5" />}{busy ? 'Saving…' : current ? 'Replace picture' : 'Upload picture'}
          </button>
          {current && <button type="button" disabled={busy} onClick={remove} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />Remove</button>}
        </div>
        {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      </div>
    </section>
  );
};
