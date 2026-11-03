// Small text-only PDF writer. Offsets and stream lengths are computed from the
// final bytes so downloaded receipts remain valid for arbitrary reference lengths.
export function accountingPdf(title: string, lines: string[]): Blob {
  const literal = (value: string) => value.normalize('NFKD').replace(/[^\x20-\x7e]/g, ' ').replace(/[\\()]/g, c => `\\${c}`);
  const stream = `BT\n/F1 18 Tf\n50 750 Td\n(${literal(title)}) Tj\n/F1 11 Tf\n${lines.map(line => `0 -23 Td\n(${literal(line)}) Tj`).join('\n')}\nET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(document.length); document += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = document.length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([document], { type: 'application/pdf' });
}

export function formatAccountingTotals(rows: { amount: number; currency?: string }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency || 'INR', (totals.get(row.currency || 'INR') || 0) + Math.round(Number(row.amount) * 100));
  return [...totals].map(([currency, cents]) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(cents / 100)).join(' · ') || '—';
}
