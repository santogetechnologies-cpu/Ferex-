import { escapeHtml, money } from './digitalCommerce';

/** A printable proposal, invoice, receipt or credit note. Shared by the admin billing screens and the client portal. */
export function documentHtml(doc: any): string {
  const b = doc.body || {};
  const cur = /^[A-Z]{3}$/.test(b.currency || '') ? b.currency : 'INR';
  const fmt = (n: unknown) => escapeHtml(money(Number(n || 0), cur));
  const lines = (b.document_lines || b.lines || []) as any[];
  const issued = doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const amountLabel = doc.kind === 'Receipt' ? 'Amount received' : doc.kind === 'Credit Note' ? 'Amount credited' : doc.kind === 'Proposal' ? 'Proposal value' : 'Amount due';
  const totals = b.document_subtotal !== undefined
    ? `<tr><td>Subtotal</td><td colspan="2" style="text-align:right">${fmt(b.document_subtotal)}</td></tr><tr><td>Tax</td><td colspan="2" style="text-align:right">${fmt(b.document_tax)}</td></tr>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.number)}</title><style>
body{font:14px system-ui,sans-serif;padding:40px;max-width:900px;margin:auto;color:#172033}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:10px 12px;border-bottom:1px solid #ddd;text-align:left}
h1{color:#5A0122;margin:0}.top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}.muted{color:#687286}.pill{display:inline-block;padding:2px 10px;border-radius:99px;background:#f4e8ec;color:#5A0122;font-weight:700}
@media print{button{display:none}}</style></head><body>
<div class="top"><div><h1>${escapeHtml(b.agency_name || 'Ferex Digital')}</h1><p class="muted">${escapeHtml(b.agency_address || '').replace(/\n/g, '<br>')}<br>${b.agency_tax_number ? 'Tax no. ' + escapeHtml(b.agency_tax_number) : ''}</p></div>
<div style="text-align:right"><span class="pill">${escapeHtml(doc.kind)}</span><h2 style="margin:8px 0 0">${escapeHtml(doc.number)}</h2><p class="muted">Date ${escapeHtml(issued)}</p></div></div>
<p><strong>Billed to</strong><br>${escapeHtml(b.client_name)}<br>${escapeHtml(b.client_email)} · ${escapeHtml(b.country)}<br><span class="muted">Project: ${escapeHtml(b.project_title)}</span></p>
<table><tr><th>Service</th><th>Net</th><th>Tax</th></tr>${lines.map(l => `<tr><td>${escapeHtml(l.title)}</td><td>${fmt(l.amount)}</td><td>${escapeHtml(l.tax_label)} ${escapeHtml(l.tax_rate)}% · ${fmt(l.tax_amount)}</td></tr>`).join('')}${totals}</table>
<h3>${escapeHtml(b.part?.label || 'Payment schedule')}${b.part?.due_date ? ` <span class="muted">· due ${escapeHtml(b.part.due_date)}</span>` : ''}</h3>
<p>${amountLabel}: <strong>${fmt(b.amount)}</strong>${b.method ? ` <span class="muted">· ${escapeHtml(b.method)}${b.reference ? ' · ref ' + escapeHtml(b.reference) : ''}</span>` : ''}</p>
${b.balance !== undefined ? `<p>Balance remaining on this milestone: <strong>${fmt(b.balance)}</strong></p>` : ''}
<p class="muted">Contract value (tax included): ${fmt(b.total)}</p>
${b.notes ? `<p>${escapeHtml(b.notes)}</p>` : ''}${b.payment_instructions ? `<p><strong>Payment instructions</strong><br>${escapeHtml(b.payment_instructions).replace(/\n/g, '<br>')}</p>` : ''}
<button onclick="window.print()">Print / Save PDF</button></body></html>`;
}

/** Shows the document in a window the caller opened on the click, so pop-up blockers stay out of the way. Returns false if it could not be shown. */
export function openDocument(doc: any, opened?: Window | null): boolean {
  const w = opened ?? window.open('', '_blank');
  if (!w) return false;
  w.document.write(documentHtml(doc));
  w.document.close();
  return true;
}
