import type { RimiPaymentRecord, RimiSalesOrderRecord } from './api/rimi';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** What the order's money looks like right now, used on receipts and in the Collections table. */
export function orderPaymentLabel(order?: RimiSalesOrderRecord | null): 'Paid in full' | 'Partially paid' | 'Unpaid' | 'On account' {
  if (!order) return 'On account';
  if (order.order_status === 'Cancelled') return 'Unpaid';
  if (Number(order.balance_amount) <= 0 && Number(order.total_amount) > 0) return 'Paid in full';
  return Number(order.paid_amount) > 0 ? 'Partially paid' : 'Unpaid';
}

const CSS = `body{font:13px/1.45 system-ui,Segoe UI,Arial,sans-serif;color:#141414;margin:0;padding:24px}
.r{max-width:720px;margin:0 auto 28px;border:2px solid #262626;border-radius:14px;padding:22px;page-break-after:always}.r:last-child{page-break-after:auto}
.h{display:flex;justify-content:space-between;border-bottom:2px solid #262626;padding-bottom:12px;margin-bottom:14px}h1{margin:0;font-size:22px;color:#5A0122}
.m{color:#525252;font-size:11px}.badge{display:inline-block;padding:3px 10px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:6px;font-weight:800;font-size:11px;text-transform:uppercase}
.g{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:10px;padding:12px;margin-bottom:14px}.l{font-size:10px;text-transform:uppercase;font-weight:700;color:#737373}
table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #D4D4D4;padding:6px 8px;text-align:left}th{background:#f1f5f9;font-size:11px;text-transform:uppercase}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.t td{font-weight:800;background:#FAFAFA}.sig{display:flex;justify-content:space-between;margin-top:30px;padding-top:10px;font-size:11px}.sig div{border-top:1px solid #A3A3A3;padding-top:4px;min-width:170px}
@media print{body{padding:0}.r{border-radius:0;margin:0 auto}}`;

function receiptBlock(p: RimiPaymentRecord, order?: RimiSalesOrderRecord | null): string {
  const items = order?.items || [];
  const lines = items.length
    ? `<table><thead><tr><th>#</th><th>Product</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>${items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.product_name)}${i.batch_no ? ` <span class="m">(batch ${esc(i.batch_no)})</span>` : ''}</td><td class="n">${Number(i.quantity).toLocaleString('en-IN')} ${esc(i.unit || '')}</td><td class="n">${inr(i.unit_price)}</td><td class="n">${inr(i.total_price)}</td></tr>`).join('')}
<tr class="t"><td colspan="4" class="n">Order total (grand total)</td><td class="n">${inr(order!.total_amount)}</td></tr></tbody></table>`
    : '';
  return `<section class="r">
<div class="h"><div><h1>Collections</h1><div class="m">Cold Chain Distribution &amp; Logistics</div></div>
<div style="text-align:right"><span class="badge">Official remittance</span><div style="font-family:monospace;font-weight:700;margin-top:6px">Voucher # ${esc(p.payment_no)}</div><div class="m">Date: ${esc(p.payment_date)}</div></div></div>
<div class="g"><div><div class="l">Received from</div><b style="font-size:15px">${esc(p.customer_name)}</b><div class="m">Method: <b>${esc(p.payment_method)}</b></div><div class="m">Reference: <b>${esc(p.reference_no || 'Direct settlement')}</b></div></div>
<div style="text-align:right"><div class="l">Amount received</div><b style="font-size:26px;color:#047857">${inr(p.amount)}</b>${order ? `<div class="m">Against order <b>${esc(order.order_no)}</b></div>` : '<div class="m">On account</div>'}</div></div>
${lines}
${order ? `<table><tbody><tr><td>Order total</td><td class="n">${inr(order.total_amount)}</td><td>Paid so far</td><td class="n">${inr(order.paid_amount)}</td><td>Balance due</td><td class="n">${inr(order.balance_amount)}</td></tr></tbody></table><div class="m">Order payment status: <b>${esc(orderPaymentLabel(order))}</b></div>` : ''}
${p.notes ? `<p class="m"><b>Narration:</b> ${esc(p.notes)}</p>` : ''}
<div class="sig"><div>Collected by: ${esc(p.collected_by_name || 'Finance Team')}</div><div style="text-align:right">Customer acknowledgment</div></div>
</section>`;
}

export function receiptsHtml(payments: RimiPaymentRecord[], orders: RimiSalesOrderRecord[], title = 'Receipts'): string {
  const byId = new Map(orders.map(o => [o.id, o]));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${payments.map(p => receiptBlock(p, p.order_id ? byId.get(p.order_id) : null)).join('')}</body></html>`;
}

/** Opens the receipts in a print window (the browser's print dialog also saves as PDF). */
export function printReceipts(payments: RimiPaymentRecord[], orders: RimiSalesOrderRecord[]): boolean {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  w.document.open(); w.document.write(receiptsHtml(payments, orders, payments.length === 1 ? `Receipt ${payments[0].payment_no}` : `${payments.length} receipts`)); w.document.close();
  w.focus(); setTimeout(() => w.print(), 300);
  return true;
}

function save(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One downloadable file holding every selected receipt, one per page. */
export function downloadReceipts(payments: RimiPaymentRecord[], orders: RimiSalesOrderRecord[]) {
  save(payments.length === 1 ? `receipt-${payments[0].payment_no}.html` : `receipts-${new Date().toISOString().slice(0, 10)}.html`, 'text/html', receiptsHtml(payments, orders));
}

export function exportCollectionsCsv(payments: RimiPaymentRecord[], orders: RimiSalesOrderRecord[]) {
  const byId = new Map(orders.map(o => [o.id, o]));
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Payment No', 'Date', 'Customer', 'Order No', 'Amount', 'Method', 'Reference', 'Order payment status', 'Order total', 'Order balance', 'Products', 'Collected by', 'Notes'];
  const rows = payments.map(p => { const o = p.order_id ? byId.get(p.order_id) : undefined;
    return [p.payment_no, p.payment_date, p.customer_name, p.order_no || '', Number(p.amount).toFixed(2), p.payment_method, p.reference_no || '', orderPaymentLabel(o), o ? o.total_amount : '', o ? o.balance_amount : '',
      (o?.items || []).map(i => `${i.product_name} x${i.quantity} @${i.unit_price}`).join('; '), p.collected_by_name || '', p.notes || ''].map(q).join(','); });
  save(`collections-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv', '﻿' + [head.map(q).join(','), ...rows].join('\n'));
}
