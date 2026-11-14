import React from 'react';

const PRESETS = [0, 5, 12, 18, 28];

// GST rate picker. The rate is included in the amount, and invoices and receipts split it into CGST and SGST halves.
export const GstField: React.FC<{ value?: number; onChange: (rate: number) => void; label?: string; disabled?: boolean }> = ({ value = 0, onChange, label = 'GST included in the amount', disabled }) => {
  const preset = PRESETS.includes(value);
  const half = Math.round((value / 2) * 100) / 100;
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <select aria-label={label} disabled={disabled} className="h-10 px-3 flex-1" value={preset ? String(value) : 'custom'}
          onChange={e => { if (e.target.value !== 'custom') onChange(Number(e.target.value)); else onChange(value || 1); }}>
          <option value="0">No GST</option>
          {PRESETS.filter(Boolean).map(r => <option key={r} value={r}>{r}% GST</option>)}
          <option value="custom">Other rate…</option>
        </select>
        {!preset && <input type="number" min="0" max="100" step="0.01" aria-label="Custom GST rate" disabled={disabled} className="h-10 px-3 w-24" value={value} onChange={e => onChange(Number(e.target.value))} />}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">{value > 0 ? `Shown on invoices as CGST ${half}% + SGST ${half}%` : 'No tax shown on invoices'}</p>
    </div>
  );
};
