// Bulk template sending from a CSV: one template, one row per recipient.
//   phone,var1,var2,...      (header row required; any column named var1, var2, ... fills {{1}}, {{2}}, ...)
// Safe by default: invalid and duplicate numbers are skipped, opted-out contacts are never messaged, the number of unique
// recipients per rolling 24 hours is capped (Meta's limit before business verification), and sending is paced.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse } from 'csv-parse/sync';
import { config } from './config.js';
import { normalizePhone } from './phone.js';
import { WhatsAppError } from './errors.js';
import { log, mask } from './logger.js';

const realSleep = ms => new Promise(r => setTimeout(r, ms));

/** Reads and validates the CSV. Returns rows [{ line, phone, variables }] and rows that were rejected up front. */
export function readRecipients(csvText, defaultCountryCode = config.defaultCountryCode) {
  const records = parse(csvText, { columns: h => h.map(x => String(x).trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
  if (!records.length) return { rows: [], rejected: [] };
  if (!('phone' in records[0])) throw new Error('The CSV needs a "phone" column in its header row.');
  const varKeys = Object.keys(records[0]).filter(k => /^var\d+$/.test(k)).sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
  const rows = [], rejected = [], seen = new Set();
  records.forEach((r, i) => {
    const line = i + 2;
    try {
      const phone = normalizePhone(r.phone, defaultCountryCode);
      if (seen.has(phone)) { rejected.push({ line, phone: r.phone, reason: 'duplicate number in this file' }); return; }
      seen.add(phone);
      rows.push({ line, phone, variables: varKeys.map(k => r[k] ?? '') });
    } catch (e) { rejected.push({ line, phone: r.phone, reason: e.message }); }
  });
  return { rows, rejected };
}

/**
 * Sends the template to every row. `messenger` and `store` are injected. Returns a per-row result list.
 * options: { template, language, dryRun, ratePerSecond, dailyUniqueLimit, sleep }
 */
export async function runBulk(rows, { messenger, store }, { template, language, dryRun = false, ratePerSecond = config.ratePerSecond, dailyUniqueLimit = config.dailyUniqueLimit, sleep = realSleep } = {}) {
  if (!template || !language) throw new Error('Both a template name and a language code are required.');
  const results = [];
  const gap = Math.ceil(1000 / Math.min(10, Math.max(1, ratePerSecond)));
  let budget = dailyUniqueLimit - store.uniqueRecipientsLast24h();
  let stopAll = null;
  for (const row of rows) {
    const base = { line: row.line, phone: row.phone };
    if (stopAll) { results.push({ ...base, status: 'not_sent', detail: stopAll }); continue; }
    if (store.isOptedOut(row.phone)) { results.push({ ...base, status: 'skipped', detail: 'opted out' }); continue; }
    const alreadyCounted = store.wasMessagedLast24h(row.phone);
    if (!alreadyCounted && budget <= 0) { results.push({ ...base, status: 'skipped', detail: `daily limit of ${dailyUniqueLimit} unique recipients reached` }); continue; }
    if (dryRun) { results.push({ ...base, status: 'dry_run', detail: 'would send' }); if (!alreadyCounted) budget--; continue; }
    try {
      const id = await messenger.sendTemplateMessage(row.phone, template, language, row.variables);
      if (!alreadyCounted) budget--;
      results.push({ ...base, status: 'sent', detail: id });
    } catch (err) {
      const kind = err instanceof WhatsAppError ? err.kind : 'error';
      results.push({ ...base, status: 'failed', detail: `${kind}: ${err.message}` });
      // Problems that will hit every remaining row: stop instead of failing them one by one.
      if (['invalid_token', 'template_not_found', 'template_params', 'payment_issue', 'number_not_registered', 'spam_limit'].includes(kind)) stopAll = `stopped after ${kind}: fix it and run again`;
    }
    await sleep(gap);
  }
  return results;
}

const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function writeReport(results, rejected, file) {
  mkdirSync(dirname(file), { recursive: true });
  const lines = ['line,phone,status,detail', ...[
    ...rejected.map(r => ({ line: r.line, phone: r.phone, status: 'rejected', detail: r.reason })),
    ...results.map(r => ({ ...r, phone: mask(r.phone) })),
  ].map(r => [r.line, r.phone, r.status, r.detail].map(csvCell).join(','))];
  writeFileSync(file, lines.join('\n') + '\n');
}

export function loadCsv(path) { return readFileSync(path, 'utf8'); }
