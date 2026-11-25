// SQLite storage: every outbound message with its latest status, every inbound message, and opt-in state.
// Webhook status events can arrive BEFORE our own insert finishes, so everything is upserted by WhatsApp message ID.
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// A status only moves forward; "failed" is final.
const RANK = { accepted: 1, sent: 2, delivered: 3, read: 4, failed: 5 };
const nowIso = () => new Date().toISOString();

export function openStore(dbPath = ':memory:') {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_message_id TEXT UNIQUE,
      to_number TEXT, type TEXT, template TEXT, body TEXT,
      status TEXT NOT NULL DEFAULT 'accepted',
      error_code INTEGER, error_message TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_to_idx ON messages (to_number, created_at);
    CREATE TABLE IF NOT EXISTS inbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_message_id TEXT UNIQUE, from_number TEXT, type TEXT, body TEXT, media_id TEXT, raw TEXT, received_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contacts (
      number TEXT PRIMARY KEY, opted_in INTEGER NOT NULL DEFAULT 0, opted_out_at TEXT, last_inbound_at TEXT, updated_at TEXT NOT NULL
    );
  `);

  const q = {
    getByWa: db.prepare('SELECT * FROM messages WHERE wa_message_id = ?'),
    insertMsg: db.prepare(`INSERT INTO messages (wa_message_id, to_number, type, template, body, status, error_code, error_message, created_at, updated_at)
                           VALUES (@wa, @to, @type, @template, @body, @status, @code, @msg, @now, @now)`),
    fillMsg: db.prepare('UPDATE messages SET to_number = COALESCE(to_number, @to), type = COALESCE(type, @type), template = COALESCE(template, @template), body = COALESCE(body, @body), updated_at = @now WHERE wa_message_id = @wa'),
    setStatus: db.prepare('UPDATE messages SET status = @status, error_code = COALESCE(@code, error_code), error_message = COALESCE(@msg, error_message), updated_at = @now WHERE wa_message_id = @wa'),
    insertIn: db.prepare('INSERT OR IGNORE INTO inbound (wa_message_id, from_number, type, body, media_id, raw, received_at) VALUES (@wa, @from, @type, @body, @media, @raw, @now)'),
    upsertContact: db.prepare(`INSERT INTO contacts (number, opted_in, opted_out_at, last_inbound_at, updated_at) VALUES (@number, @opted_in, @out, @last, @now)
                               ON CONFLICT(number) DO UPDATE SET opted_in = excluded.opted_in, opted_out_at = excluded.opted_out_at, last_inbound_at = COALESCE(excluded.last_inbound_at, last_inbound_at), updated_at = excluded.updated_at`),
    contact: db.prepare('SELECT * FROM contacts WHERE number = ?'),
    touchInbound: db.prepare(`INSERT INTO contacts (number, opted_in, last_inbound_at, updated_at) VALUES (@number, 0, @now, @now)
                              ON CONFLICT(number) DO UPDATE SET last_inbound_at = @now, updated_at = @now`),
    uniqueSince: db.prepare(`SELECT COUNT(DISTINCT to_number) AS n FROM messages WHERE type = 'template' AND created_at >= ? AND status != 'failed'`),
    sentToSince: db.prepare(`SELECT 1 FROM messages WHERE to_number = ? AND type = 'template' AND created_at >= ? AND status != 'failed' LIMIT 1`),
  };

  return {
    db,
    /** Record an accepted outbound message (or fill in the placeholder a faster status webhook already created). */
    recordOutbound({ waMessageId, to, type, template = null, body = null }) {
      const now = nowIso();
      if (q.getByWa.get(waMessageId)) q.fillMsg.run({ wa: waMessageId, to, type, template, body, now });
      else q.insertMsg.run({ wa: waMessageId, to, type, template, body, status: 'accepted', code: null, msg: null, now });
    },
    /** A send that Meta rejected: kept for the audit trail, without a WhatsApp ID. */
    recordFailedOutbound({ to, type, template = null, body = null, code = null, message = null }) {
      const now = nowIso();
      q.insertMsg.run({ wa: null, to, type, template, body, status: 'failed', code, msg: message, now });
    },
    /** Apply a webhook status event. Returns the resulting status, or null when an older event is ignored. */
    applyStatus(waMessageId, status, { code = null, message = null } = {}) {
      const now = nowIso();
      const row = q.getByWa.get(waMessageId);
      if (!row) { q.insertMsg.run({ wa: waMessageId, to: null, type: null, template: null, body: null, status, code, msg: message, now }); return status; }
      if ((RANK[status] || 0) <= (RANK[row.status] || 0) && status !== 'failed') return null;
      q.setStatus.run({ wa: waMessageId, status, code, msg: message, now });
      return status;
    },
    getMessage: id => q.getByWa.get(id),
    recordInbound({ waMessageId, from, type, body = null, mediaId = null, raw = null }) {
      const now = nowIso();
      const res = q.insertIn.run({ wa: waMessageId, from, type, body, media: mediaId, raw: raw ? JSON.stringify(raw) : null, now });
      q.touchInbound.run({ number: from, now });
      return res.changes === 1; // false = duplicate webhook delivery
    },
    inboundCount: () => db.prepare('SELECT COUNT(*) AS n FROM inbound').get().n,
    setOptIn(number, optedIn) {
      const prev = q.contact.get(number);
      q.upsertContact.run({ number, opted_in: optedIn ? 1 : 0, out: optedIn ? null : nowIso(), last: prev?.last_inbound_at || null, now: nowIso() });
    },
    isOptedIn: number => Boolean(q.contact.get(number)?.opted_in),
    isOptedOut: number => Boolean(q.contact.get(number)?.opted_out_at) && !q.contact.get(number)?.opted_in,
    /** Unique recipients of template messages in the last 24 h (Meta's limit before business verification is about 250). */
    uniqueRecipientsLast24h: () => q.uniqueSince.get(new Date(Date.now() - 864e5).toISOString()).n,
    wasMessagedLast24h: number => Boolean(q.sentToSince.get(number, new Date(Date.now() - 864e5).toISOString())),
    close: () => db.close(),
  };
}
