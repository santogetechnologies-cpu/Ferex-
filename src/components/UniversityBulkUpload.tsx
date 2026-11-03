import { useState, useRef } from 'react';
import {
  UploadCloud, Download, CheckCircle2, AlertCircle, X,
  Building2, Globe, RefreshCw, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { getAdminSupabaseClient } from '../lib/adminAuthClient';
import { createUniversity } from '../lib/api/universities';
import { createDestination } from '../lib/api/destinations';
import { countryKey, universityKey, parseUniversityImport, universityImportTemplate } from '../lib/universityImport';
import type { UniversityImportRow } from '../lib/universityImport';

interface UniversityBulkUploadProps {
  onComplete: () => Promise<unknown>;
  className?: string;
}

export function UniversityBulkUpload({ onComplete, className }: UniversityBulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UniversityImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setRows([]);
    setMessage('');
    setFileName(file.name);
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Maximum file size is 5 MB.');
      }
      const parsed = parseUniversityImport(await file.text());
      setRows(parsed);
      setMessageType('info');
      setMessage(`${parsed.length} universities parsed across ${new Set(parsed.map(r => countryKey(r.country))).size} destinations. Ready to import.`);
    } catch (error) {
      setMessageType('error');
      setMessage((error as Error).message);
    }
  };

  const importRows = async () => {
    setBusy(true);
    let imported = 0;
    let skipped = 0;
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

      const [universities, destinations] = await Promise.all([
        readAll('universities', 'id,name,country,city'),
        readAll('destinations', 'id,name')
      ]);

      const existing = new Set(universities.map(universityKey));
      const countries = new Map<string, string>(destinations.map(d => [countryKey(d.name), d.name]));

      for (const row of rows) {
        const key = countryKey(row.country);
        if (!countries.has(key)) {
          await createDestination({
            name: row.country,
            code: row.country.slice(0, 2).toUpperCase(),
            flag: '🌍',
            currency: 'Not configured',
            authority: 'Awaiting configuration',
            acronym: 'Pending',
            processing: 'Not configured',
            fee: 'Not configured',
            badge: 'Workflow setup required'
          });
          countries.set(key, row.country);
        }
        const payload = { ...row, country: countries.get(key)! };
        if (existing.has(universityKey(payload))) {
          skipped++;
        } else {
          await createUniversity(payload, false);
          existing.add(universityKey(payload));
          imported++;
        }
        setMessage(`${imported} imported, ${skipped} duplicates skipped of ${rows.length} rows…`);
      }
      setRows([]);
      setMessageType('success');
      setMessage(`Complete: ${imported} imported, ${skipped} duplicates skipped. All imported countries are available in Countries & Legalization and workflow setup.`);
    } catch (error) {
      setMessageType('error');
      setMessage(`Stopped after ${imported} imports and ${skipped} skips: ${error instanceof Error ? error.message : (error as { message?: string }).message || 'Import failed'}. Saved rows remain; retry skips duplicates.`);
    } finally {
      window.dispatchEvent(new Event('ferex_universities_change'));
      try {
        await onComplete();
      } finally {
        setBusy(false);
      }
    }
  };

  const uniqueCountriesCount = new Set(rows.map(r => countryKey(r.country))).size;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "flex items-center gap-1.5 h-9.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"}
      >
        <UploadCloud className="w-3.5 h-3.5 text-rose-300" />
        <span>Bulk Upload CSV</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Bulk upload universities"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#58051E]/10 text-[#58051E] rounded-xl border border-[#58051E]/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Bulk upload universities across countries
                    </h2>
                    <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2 py-0.5 rounded-full border border-[#58051E]/20">
                      CSV Import
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Batch ingest universities, degree programs, and automatic country onboarding.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                Upload a UTF-8 CSV with <strong className="text-slate-900">name</strong> and <strong className="text-slate-900">country</strong>.
                Optional columns: <span className="font-mono text-slate-700">city</span>, <span className="font-mono text-slate-700">tuition_range</span>, <span className="font-mono text-slate-700">tuition_fee_currency</span>, <span className="font-mono text-slate-700">tuition_pln</span>, <span className="font-mono text-slate-700">tuition_eur</span>, <span className="font-mono text-slate-700">banner_image_url</span>, <span className="font-mono text-slate-700">logo_url</span>, <span className="font-mono text-slate-700">vfs_fee</span>, <span className="font-mono text-slate-700">programs</span>, and <span className="font-mono text-slate-700">intakes</span> (pipe-separated <code className="bg-slate-200/80 px-1 rounded text-[11px]">|</code>). Existing universities are deduplicated; new destination countries register automatically.
              </p>

              {/* Template Download Card */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/40 border border-rose-100 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-[#58051E]" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">CSV Template Schema</p>
                    <p className="text-[11px] text-slate-500">Includes sample headers & international sample data</p>
                  </div>
                </div>
                <a
                  download="universities-template.csv"
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(universityImportTemplate)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-[#58051E] border border-[#58051E]/20 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV template</span>
                </a>
              </div>

              {/* File Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFileProcess(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#58051E] bg-[#58051E]/5'
                    : 'border-slate-200 hover:border-[#58051E]/40 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="w-8 h-8 text-[#58051E] mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-800">
                  {fileName ? `Selected: ${fileName}` : 'Click or drag & drop CSV file to upload'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  UTF-8 CSV format, up to 5 MB
                </p>
                <input
                  ref={fileInputRef}
                  aria-label="University CSV file"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) await handleFileProcess(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Preview Rows Table */}
              {rows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {rows.length} universities across {uniqueCountriesCount} {uniqueCountriesCount === 1 ? 'country' : 'countries'} ready to import
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {rows.length > 50 ? 'Showing first 50 rows' : `${rows.length} rows`}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">University</th>
                          <th className="py-2.5 px-3">Country / City</th>
                          <th className="py-2.5 px-3">Tuition / Fees</th>
                          <th className="py-2.5 px-3">Programs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.slice(0, 50).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {(r.banner_image_url || r.image_url || r.logo_url) ? (
                                  <img
                                    src={r.banner_image_url || r.image_url || r.logo_url}
                                    alt=""
                                    className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                                    onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-[#58051E]">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <span className="font-semibold text-slate-900 line-clamp-1">{r.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              <div className="flex items-center gap-1 font-medium">
                                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{r.country}</span>
                                {r.city && <span className="text-slate-400">· {r.city}</span>}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-800 block">
                                {r.tuition_pln ? `${r.tuition_pln.toLocaleString()} PLN / yr` : (r.tuition_range || (r.tuition_eur ? `€${r.tuition_eur.toLocaleString()} / yr` : '—'))}
                              </span>
                              {r.vfs_fee && (
                                <span className="text-[10px] text-slate-500 block">Direct/VFS: {r.vfs_fee}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {r.programs?.length || 0} {r.programs?.length === 1 ? 'course' : 'courses'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 50 && (
                    <p className="text-[11px] text-slate-400 italic">Preview shows the first 50 rows.</p>
                  )}
                </div>
              )}

              {/* Status Message */}
              {message && (
                <div
                  role="status"
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                    messageType === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : messageType === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {messageType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : messageType === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div className="whitespace-pre-wrap">{message}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="h-9.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white transition-all cursor-pointer disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={busy || !rows.length}
                onClick={importRows}
                className="h-9.5 px-5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#58051E]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing…</span>
                  </>
                ) : (
                  <>
                    <span>Import universities & countries</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
