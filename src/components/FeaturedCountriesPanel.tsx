import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { setFeaturedDestinations, type DestinationItem } from '../lib/api/destinations';

/** Admin control: pick up to three countries to show first to students and on the landing page. */
export function FeaturedCountriesPanel({ destinations, onMessage }: { destinations: DestinationItem[]; onMessage?: (message: string) => void }) {
  const current = [...destinations].filter(d => d.featured_rank).sort((a, b) => (a.featured_rank! - b.featured_rank!)).map(d => d.id);
  const [slots, setSlots] = useState<string[]>(['', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signature = current.join(',');
  useEffect(() => { setSlots([current[0] || '', current[1] || '', current[2] || '']); }, [signature]);

  const chosen = slots.filter(Boolean);
  const dirty = chosen.join(',') !== signature;
  const save = async () => {
    setBusy(true); setError('');
    try {
      await setFeaturedDestinations(chosen);
      onMessage?.(chosen.length ? 'Featured countries updated. They now appear first for students and on the landing page.' : 'Featured countries cleared.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const field = 'h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20';
  return (
    <section className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3 text-left">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Featured countries (priority)</h3>
      </div>
      <p className="text-[11px] font-medium text-slate-500">Choose up to three. They are listed first, in this order, in student university selection and on the landing page.</p>
      <div className="grid sm:grid-cols-3 gap-2">
        {slots.map((value, i) => (
          <label key={i} className="block">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Priority {i + 1}</span>
            <select
              aria-label={`Featured country ${i + 1}`}
              className={`${field} w-full`}
              value={value}
              onChange={e => setSlots(slots.map((v, n) => n === i ? e.target.value : v))}
            >
              <option value="">— None —</option>
              {destinations.filter(d => d.is_active !== false).map(d => (
                <option key={d.id} value={d.id} disabled={slots.includes(d.id) && value !== d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-[11px] font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={busy || !dirty} onClick={save} className="h-9 px-4 rounded-xl text-xs font-bold bg-[#58051E] text-white hover:bg-[#430316] disabled:opacity-40 cursor-pointer">
        Save featured countries
      </button>
    </section>
  );
}
