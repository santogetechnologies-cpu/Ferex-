import { numberToWordsINR } from '../components/InvoiceModal';
import ferexLogoImg from '../assets/ferex-logo.png';

export interface ReceiptPrintData {
  receipt_no: string;
  student_name: string;
  student_email?: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  description?: string;
  issued_at?: string;
  tax_rate_percent?: number;
  reference?: string;
  invoice_settings?: { company_gstin?: string; company_pan?: string; company_address?: string; sac_code?: string; tax_rate_percent?: number } | null;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** The branded FEREX payment receipt (same look as the tax invoice), ready to print or save as PDF. */
export function receiptHtml(r: ReceiptPrintData): string {
  const cur = r.currency || 'INR';
  const sym = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : '₹';
  const total = Number(r.amount) || 0;
  const rate = Number(r.tax_rate_percent ?? r.invoice_settings?.tax_rate_percent ?? 0) || 0;
  const taxable = rate > 0 ? Number((total / (1 + rate / 100)).toFixed(2)) : total;
  const cgst = rate > 0 ? Number(((total - taxable) / 2).toFixed(2)) : 0;
  const sgst = rate > 0 ? Number((total - taxable - cgst).toFixed(2)) : 0;
  const money = (n: number) => `${sym}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const words = cur === 'INR' ? numberToWordsINR(total) : `${cur} ${total.toFixed(2)}`;
  const s = r.invoice_settings || {};
  const gstin = s.company_gstin && s.company_gstin !== '32AABCF1234F1Z8' ? s.company_gstin : '32AAGCF8602A1Z8';
  const pan = s.company_pan && s.company_pan !== 'AABCF1234F' ? s.company_pan : 'AAGCF8602A';
  const address = s.company_address && !s.company_address.includes('Infopark') ? s.company_address : '12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691';
  const when = r.issued_at && !Number.isNaN(new Date(r.issued_at).getTime()) ? new Date(r.issued_at) : new Date();
  const date = when.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const logo = typeof window !== 'undefined' ? new URL(ferexLogoImg, window.location.origin).href : '';
  const method = r.payment_method || 'UPI';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PAYMENT_RECEIPT_${esc(r.receipt_no)}</title>
<style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;color:#141414;line-height:1.4;font-size:11.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.card{max-width:190mm;margin:0 auto;position:relative}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid #5A0122}
.brand{display:flex;align-items:center;gap:10px}.brand img{width:54px;height:54px;object-fit:contain}
.brand-title{font-size:24px;font-weight:900;color:#5A0122;letter-spacing:.5px;margin:0}
.brand-sub{font-size:10.5px;font-weight:700;color:#525252;text-transform:uppercase;letter-spacing:.8px}
.company{text-align:right;font-size:10.5px;color:#404040}.company p{margin:1.5px 0}
.banner{text-align:center;margin:14px 0 10px}.title{font-size:20px;font-weight:900;letter-spacing:2px;margin:0}
.tag{font-size:11px;font-weight:800;color:#5A0122;margin-top:3px}
.grid{display:flex;justify-content:space-between;gap:16px;margin:12px 0;padding:10px 14px;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:8px}
.col h4{margin:0 0 3px;font-size:9.5px;font-weight:800;text-transform:uppercase;color:#737373;letter-spacing:.5px}.col p{margin:1.5px 0;font-size:11.5px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th{background:#5A0122!important;color:#fff!important;font-size:10.5px;font-weight:800;text-transform:uppercase;padding:8px 10px;text-align:left}
td{padding:10px;font-size:11px;border-bottom:1px solid #E5E5E5}.r{text-align:right}.c{text-align:center}
.tax{margin-top:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.words{flex:1;font-size:11px;padding:10px 12px;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:8px}
.sum{width:270px;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:8px;padding:10px 12px;font-size:11px}
.row{display:flex;justify-content:space-between;margin-bottom:4px;color:#525252}
.row.total{border-top:1.5px solid #D4D4D4;padding-top:6px;margin-top:6px;font-size:13px;font-weight:900;color:#5A0122}
.paid{margin-top:12px;padding:9px 12px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;display:flex;align-items:center;gap:10px}.paid strong{color:#166534;font-size:11.5px}
.sign{display:flex;justify-content:space-between;margin-top:34px;font-size:10.5px;color:#525252}.sign div{border-top:1px solid #A3A3A3;padding-top:4px;min-width:160px}
.note{text-align:center;font-size:9.5px;color:#737373;margin-top:16px;line-height:1.35}
.bar{height:4px;background:linear-gradient(90deg,#5A0122,#68092A);margin-top:8px;border-radius:2px}
</style></head><body><div class="card">
<div class="header"><div class="brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="brand-title">FEREX</div><div class="brand-sub">European Admissions &amp; Global Operations</div></div></div>
<div class="company"><p><strong>Tel:</strong> +91 95448 85077, +44 78678 67779</p><p><strong>Email:</strong> ferexventuresoffice@gmail.com</p><p>${esc(address)}</p><p><strong>GSTIN:</strong> ${esc(gstin)} | <strong>PAN:</strong> ${esc(pan)}</p></div></div>
<div class="banner"><h1 class="title">PAYMENT RECEIPT</h1><div class="tag">Official acknowledgement of payment received &nbsp;<span style="display:inline-block;border:1.5px solid #16a34a;color:#16a34a;border-radius:6px;padding:1px 9px;letter-spacing:1.5px">PAID</span></div></div>
<div class="grid"><div class="col"><h4>Received From (Student)</h4><p><strong>${esc(r.student_name || 'Student')}</strong></p>${r.student_email ? `<p>${esc(r.student_email)}</p>` : ''}<p>Ferex European Higher Education</p></div>
<div class="col" style="text-align:right"><h4>Receipt Details</h4><p><strong>Receipt No:</strong> ${esc(r.receipt_no)}</p><p><strong>Date:</strong> ${esc(date)}, ${esc(time)}</p><p><strong>Method:</strong> ${esc(method)}</p>${r.reference ? `<p><strong>Reference:</strong> ${esc(r.reference)}</p>` : ''}</div></div>
<table><thead><tr><th class="c" style="width:35px">#</th><th>Description</th><th>Method</th><th class="r">Amount</th></tr></thead>
<tbody><tr><td class="c">1</td><td><strong>${esc(r.description || 'Education payment')}</strong></td><td>${esc(method)}</td><td class="r"><strong>${money(total)}</strong></td></tr></tbody></table>
<div class="tax"><div class="words"><strong>Amount in words:</strong><br>${esc(words)}</div>
<div class="sum">${rate > 0 ? `<div class="row"><span>Taxable value</span><span>${money(taxable)}</span></div><div class="row"><span>CGST (${rate / 2}%)</span><span>${money(cgst)}</span></div><div class="row"><span>SGST (${rate / 2}%)</span><span>${money(sgst)}</span></div>` : ''}<div class="row total"><span>Amount received</span><span>${money(total)}</span></div></div></div>
<div class="paid"><strong>✔ Payment received in full</strong><span style="color:#166534">Thank you. This receipt confirms your payment to FEREX.</span></div>
<div class="sign"><div>Authorised signatory</div><div style="text-align:right">Student acknowledgment</div></div>
<div class="note">This is a computer-generated receipt and is valid without a signature. Payments are governed by the FEREX Admission Terms.</div><div class="bar"></div>
</div></body></html>`;
}

/** Opens the receipt in a print window (the browser print dialog also saves it as a PDF). Returns false if pop-ups are blocked. */
export function openReceiptWindow(r: ReceiptPrintData): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(receiptHtml(r)); w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
  return true;
}
