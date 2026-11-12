import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, Trash2 } from 'lucide-react';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { loadStudentFeeProfile } from '../hooks/useStudentFeeProfile';
import { studentFees, money, type StudentFeeProfile } from '../lib/educationBilling';
import { saveStudentFeeOverride, deleteStudentFeeOverride } from '../lib/api/payments';

/**
 * Admin control to give one student a percentage discount on a Ferex-collected fee.
 * The discounted amount flows to the student's billing screen and is enforced by the payment guard.
 */
export function StudentDiscountEditor({ studentId, country, onChanged }: { studentId: string; country?: string; onChanged?: (message: string) => void }) {
  const { config } = useFeeConfig();
  const [profile, setProfile] = useState<StudentFeeProfile>({});
  const [feeId, setFeeId] = useState('');
  const [percent, setPercent] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = () => loadStudentFeeProfile(studentId).then(setProfile).catch(() => {});
  useEffect(() => { setFeeId(''); setPercent(''); setReason(''); setError(''); reload(); }, [studentId]);

  // Base amounts (before this student's discounts) for fees Ferex collects.
  const baseFees = useMemo(
    () => studentFees(config, country, { pkg: profile.pkg }).filter(f => f.recipient === 'ferex'),
    [config, country, profile.pkg]
  );
  const selected = baseFees.find(f => f.id === feeId);
  const pct = Number(percent);
  const preview = selected && pct > 0 && pct <= 100 ? Math.round(selected.amount * (100 - pct)) / 100 : null;
  const existing = Object.entries(profile.overrides || {}).filter(([, o]) => (o.discount_percent ?? 0) > 0 || o.discount_amount > 0);

  const apply = async () => {
    if (!selected) return setError('Choose a fee.');
    if (!(pct > 0 && pct <= 100)) return setError('Enter a discount between 0.01 and 100 percent.');
    setBusy(true); setError('');
    try {
      await saveStudentFeeOverride({
        student_id: studentId, fee_id: selected.id, currency: selected.currency,
        custom_amount: preview ?? selected.amount, discount_amount: Math.round((selected.amount - (preview ?? selected.amount)) * 100) / 100,
        discount_percent: pct, discount_reason: reason.trim() || 'Admin discount',
      });
      setPercent(''); setReason('');
      await reload();
      onChanged?.(`${pct}% discount applied to ${selected.title}.`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true); setError('');
    try { await deleteStudentFeeOverride(studentId, id); await reload(); onChanged?.('Discount removed.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const field = 'h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20';
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
        <BadgePercent className="w-3.5 h-3.5 text-[#58051E]" /> Student Discount (%)
      </span>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Fee to discount" className={`${field} col-span-2`} value={feeId} onChange={e => setFeeId(e.target.value)}>
          <option value="">Select fee…</option>
          {baseFees.map(f => <option key={f.id} value={f.id}>{f.title} — {money(f.amount, f.currency)}</option>)}
        </select>
        <input aria-label="Discount percent" type="number" min="0" max="100" step="0.01" placeholder="Discount %" className={field} value={percent} onChange={e => setPercent(e.target.value)} />
        <input aria-label="Discount reason" placeholder="Reason (optional)" className={field} value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      {selected && preview !== null && (
        <p className="text-[11px] font-bold text-emerald-700">Student will pay {money(preview, selected.currency)} instead of {money(selected.amount, selected.currency)}.</p>
      )}
      {error && <p role="alert" className="text-[11px] font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={busy} onClick={apply} className="w-full h-9 rounded-xl text-xs font-bold bg-[#58051E] text-white hover:bg-[#430316] disabled:opacity-50 cursor-pointer">
        Apply discount
      </button>
      {existing.length > 0 && (
        <ul className="space-y-1.5 pt-2 border-t border-slate-100">
          {existing.map(([id, o]) => (
            <li key={id} className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>{id.startsWith('pkg:') ? 'Package installment' : id} — {o.discount_percent ? `${o.discount_percent}%` : money(o.discount_amount)} off{o.discount_reason ? ` (${o.discount_reason})` : ''}</span>
              <button type="button" aria-label={`Remove discount on ${id}`} disabled={busy} onClick={() => remove(id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
