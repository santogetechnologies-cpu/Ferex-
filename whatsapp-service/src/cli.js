#!/usr/bin/env node
// Command line:
//   node src/cli.js send-template <phone> <template> <language> [variable ...]
//   node src/cli.js send-text <phone> "<text>"
//   node src/cli.js bulk <file.csv> --template <name> --language <code> [--dry-run]
import { config, requireConfig } from './config.js';
import { openStore } from './store.js';
import { createMessenger } from './messages.js';
import { readRecipients, runBulk, writeReport, loadCsv } from './bulk.js';
import { log } from './logger.js';

const [, , cmd, ...args] = process.argv;
const flag = name => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1]; };
const has = name => args.includes(`--${name}`);

async function main() {
  const store = openStore(config.dbPath);
  try {
    if (cmd === 'send-template') {
      requireConfig('token', 'phoneNumberId');
      const [to, template, language, ...vars] = args;
      if (!to || !template || !language) throw new Error('Usage: send-template <phone> <template> <language> [variable ...]');
      const id = await createMessenger({ store }).sendTemplateMessage(to, template, language, vars);
      console.log(`Accepted by WhatsApp. Message ID: ${id}`);
    } else if (cmd === 'send-text') {
      requireConfig('token', 'phoneNumberId');
      const [to, ...words] = args;
      if (!to || !words.length) throw new Error('Usage: send-text <phone> "<text>"');
      const id = await createMessenger({ store }).sendTextMessage(to, words.join(' '));
      console.log(`Accepted by WhatsApp. Message ID: ${id}`);
    } else if (cmd === 'bulk') {
      const file = args.find(a => !a.startsWith('--') && a.endsWith('.csv'));
      const template = flag('template'), language = flag('language'), dryRun = has('dry-run');
      if (!file || !template || !language) throw new Error('Usage: bulk <file.csv> --template <name> --language <code> [--dry-run]');
      if (!dryRun) requireConfig('token', 'phoneNumberId');
      const { rows, rejected } = readRecipients(loadCsv(file));
      console.log(`${rows.length} valid recipients, ${rejected.length} rejected.${dryRun ? ' (dry run: nothing is sent)' : ''}`);
      const results = await runBulk(rows, { messenger: dryRun ? null : createMessenger({ store }), store }, { template, language, dryRun });
      const report = `./out/bulk-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      writeReport(results, rejected, report);
      const count = s => results.filter(r => r.status === s).length;
      console.log(`sent ${count('sent')}, failed ${count('failed')}, skipped ${count('skipped')}, not sent ${count('not_sent')}${dryRun ? `, would send ${count('dry_run')}` : ''}. Report: ${report}`);
      if (count('failed') || count('not_sent')) process.exitCode = 1;
    } else {
      console.log('Commands: send-template | send-text | bulk');
      process.exitCode = cmd ? 1 : 0;
    }
  } finally { store.close(); }
}
main().catch(e => { log.error('command failed', { error: e.message, hint: e.hint }); console.error(`Error: ${e.message}${e.hint ? `\n${e.hint}` : ''}`); process.exit(1); });
