import { useState } from 'react';
import { getAdminSupabaseClient } from '../lib/adminAuthClient';
import { createUniversity } from '../lib/api/universities';
import { createDestination } from '../lib/api/destinations';
import { countryKey, universityKey, parseUniversityImport, universityImportTemplate } from '../lib/universityImport';
import type { UniversityImportRow } from '../lib/universityImport';

export function UniversityBulkUpload({ onComplete }: { onComplete: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UniversityImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const importRows = async () => {
    setBusy(true);
    let imported = 0, skipped = 0;
    try {
      const client = await getAdminSupabaseClient();
      // Read every page; never use an offline cache to decide whether to insert.
      const readAll = async (table: string, columns: string) => {
        const result: any[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await client.from(table).select(columns).order('id').range(offset, offset + 999);
          if (error) throw error;
          result.push(...(data || []));
          if (!data || data.length < 1000) return result;
        }
      };
      const [universities, destinations] = await Promise.all([readAll('universities', 'id,name,country,city'), readAll('destinations', 'id,name')]);
      const existing = new Set(universities.map(universityKey));
      const countries = new Map<string, string>(destinations.map(d => [countryKey(d.name), d.name]));
      for (const row of rows) {
        const key = countryKey(row.country);
        if (!countries.has(key)) {
          await createDestination({ name: row.country, code: row.country.slice(0, 2), flag: '🌍', currency: 'Not configured', authority: 'Awaiting configuration', acronym: 'Pending', processing: 'Not configured', fee: 'Not configured', badge: 'Workflow setup required' });
          countries.set(key, row.country);
        }
        const payload = { ...row, country: countries.get(key)! };
        if (existing.has(universityKey(payload))) skipped++;
        else { await createUniversity(payload, false); existing.add(universityKey(payload)); imported++; }
        setMessage(`${imported} imported, ${skipped} duplicates skipped of ${rows.length} rows…`);
      }
      setRows([]);
      setMessage(`Complete: ${imported} imported, ${skipped} duplicates skipped. All imported countries are available in Countries & Legalization and workflow setup.`);
    } catch (error) {
      setMessage(`Stopped after ${imported} imports and ${skipped} skips: ${error instanceof Error ? error.message : (error as { message?: string }).message || 'Import failed'}. Saved rows remain; retry skips duplicates.`);
    } finally {
      window.dispatchEvent(new Event('ferex_universities_change'));
      try { await onComplete(); } finally { setBusy(false); }
    }
  };
  return <>
    <button onClick={() => setOpen(true)} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold">Bulk Upload CSV</button>
    {open && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-label="Bulk upload universities" className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-auto">
        <h2 className="font-bold text-lg">Bulk upload universities across countries</h2>
        <p className="text-sm text-slate-600">Upload a UTF-8 CSV with name and country. Optional columns: city, tuition_range, programs and intakes. Separate programs and intakes with |. Existing universities with the same name, country and city are skipped. New countries are registered automatically for workflow configuration.</p>
        <a className="text-sm underline" download="universities-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(universityImportTemplate)}`}>Download CSV template</a>
        <input aria-label="University CSV file" type="file" accept=".csv,text/csv" disabled={busy} className="block w-full text-sm" onChange={async e => {
          const file = e.target.files?.[0]; setRows([]); setMessage('');
          if (!file) return;
          try {
            if (file.size > 5 * 1024 * 1024) throw new Error('Maximum file size is 5 MB.');
            setRows(parseUniversityImport(await file.text()));
          } catch (error) { setMessage((error as Error).message); }
          e.target.value = '';
        }} />
        {!!rows.length && <><p className="text-sm font-bold">{rows.length} universities across {new Set(rows.map(r => countryKey(r.country))).size} countries ready to import</p>
          <div className="max-h-48 overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>University</th><th>Country</th><th>City</th></tr></thead><tbody>{rows.slice(0, 50).map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.country}</td><td>{r.city}</td></tr>)}</tbody></table></div>
          {rows.length > 50 && <p className="text-xs">Preview shows the first 50 rows.</p>}</>}
        <p role="status" className="text-sm whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3"><button disabled={busy} onClick={() => setOpen(false)}>Close</button><button disabled={busy || !rows.length} onClick={importRows} className="bg-[#58051E] text-white rounded-xl px-4 py-2 disabled:opacity-50">{busy ? 'Importing…' : 'Import universities & countries'}</button></div>
      </section>
    </div>}
  </>;
}
