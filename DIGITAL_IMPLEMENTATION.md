# Digital operations and international billing — implementation and rollout

Implemented locally on 1 November 2026. The database migrations and both Edge Functions were subsequently deployed to Supabase project `ouvezsfvdkecpugzuhuk`; see `DIGITAL_DEPLOYMENT.md` for verified deployment state and remaining rollout work. The frontend has not been published in this session, and actual email delivery has not been tested.

## Module coverage

| Module | Changes |
|---|---|
| Clients | Database-backed directory and writes; country, currency, tax ID, website and commercial metadata persist in their own fields; removed fabricated client defaults and cache merging. |
| Attendance & timesheets | Server clock timestamps, duplicate clock-in protection, persisted clock-out and work summary, explicit errors, scoped reads, verification and Central locking guards. Leave submissions use real user identity; self-approval is rejected. |
| Projects | Exact assignment IDs, persisted stage history, international client currency, date/amount validation, archive instead of deleting financial history. Billing configuration lives in Centralised Billing. |
| Deliverables | Persisted, atomic attachment/removal, URL validation, admin approve/reopen controls, server approval guard. |
| Task assignment | Registered user IDs, PM-to-team delegation, Central project selector, transactional Central projection, status updates back to Central, recipient notifications, protected task provenance. |
| Leads & pipeline | Persisted records and atomic conversion; retries reuse the converted project. |
| Meetings | Persisted CRUD and status changes, valid schedule/link checks; selected local time converted to an absolute timestamp. |
| Centralised billing | Persisted contract per project, ISO country/currency codes, per-service tax rules, arbitrary instalment counts and percentages, service links per term, due dates and version checks. |
| Invoices | Unique document numbers, immutable snapshots, per-term invoices and printable documents. Tax values are allocated across linked services for the invoiced amount. |
| Payments ledger | Atomic partial/full instalment collection, exact term balance checks, duplicate reference rejection, idempotent retries, automatic invoice/receipt generation and email queue. Refunds generate credit notes and restore the term balance. |
| Expenses | Persisted expense/assets CRUD, explicit failures and currency-aware expense amounts/totals. Asset monthly costs remain explicitly denominated in INR. |
| Performance BI | Recorded project/task results and net collections after refunds, separated by currency. Removed invented fallback appraisal/financial numbers from the routed BI experience. |
| Notifications | Persisted notices, recipient-scoped task alerts and individual user read state. |
| Email delivery logs | Persisted document outbox with queued/sending/sent/failed status, attempts, error and provider reference. Sent means provider acceptance, not confirmed delivery. |
| Account profile | Real account data, persisted edits/avatar, password update errors propagated; no plaintext credential cache update. |
| Agency settings | Legal identity, tax registration, payment instructions, tax rates by country, service catalogue and reusable term templates with service mappings. |
| Sign Out | Calls Supabase sign-out, clears cached identity and application data, returns to the Digital login. Browser-only identity cannot authenticate a user. |

Also removed browser-side administrator login credentials, email-derived role escalation, demo login bypasses, build-time private provider-key substitutions and automatic client seeding/deletion during navigation. Client access now uses a persisted account mapping and scoped project/contract/document reads. New Digital staff provisioning uses a server invitation rather than creating an orphan profile or storing a password in browser storage.

## International commercial workflow

1. In Agency Settings, configure legal details, payment instructions, service names, tax labels/rates/country codes and reusable payment templates. There is no automatic assumption that every project has 18% tax.
2. Create a client with a country and currency, then create and assign a project.
3. Open Centralised Billing, select the project, confirm the billing email/country/currency, and add the agreed services and their tax rules.
4. Apply a template or add custom terms. Each term has a label, percentage, due date and linked services. Percentages must total 100, and every service needs a term.
5. Save and generate/email the proposal or an invoice for a selected term.
6. Record any positive received amount up to that term's remaining balance. The server creates the term invoice once and a receipt per collection. Each generated document is queued for delivery.
7. For additional work, use Add scope amendment. Existing term amounts, receipts and invoices remain intact; new scope receives new terms and an audit record.
8. Record a refund only after money is returned. The server caps it at the unrefunded collection amount, adjusts the term balance and issues a credit note.

Currency totals are never added across different currencies. No exchange rate or international tax liability is inferred by the app. Collection/refund recording is an accounting action; it does not itself charge a card or transfer money through a bank.

## Required rollout steps

1. **Preserve legacy data before users sign out of the new build.** Use Agency Settings → Export legacy records on every device that used the old browser-only billing flow. Reconcile those exports with actual receipts/bank records and import approved opening records. The new ledger does not silently import unaudited historical browser data. Sign-out clears legacy application caches.
2. Back up the database and apply all eight `20261101...` migrations, in filename order, to staging first. They replace permissive Digital policies, add server-side validation, introduce the new commerce tables/RPCs and tighten shared-table access. Check existing schema differences and user assignments before production application.
3. Deploy the `send-digital-document` and `provision-digital-user` Supabase Edge Functions with JWT verification enabled. Configure server secrets `RESEND_API_KEY`, `DIGITAL_FROM_EMAIL` and `APP_URL`; use a verified sender address. Supabase supplies the server URL/anon/service-role environment variables. Never expose the service-role key through a Vite variable.
4. Rotate the administrator password previously embedded in frontend code and revoke its existing sessions. Rotate any private email/AI provider keys previously supplied via public Vite variables. These account-level rotations were not performed by this local change.
5. Test an actual Central administrator, Digital administrator, PM, second PM and client in separate browser profiles. Verify legacy assignments use real Auth user UUIDs. Imported orphan/demonstration profiles cannot be treated as authenticated staff.
6. Verify one proposal, term invoice, partial receipt and refund credit note using the real email provider. The UI dispatches queued documents after the action; failed jobs remain visible for retry. Background retry scheduling and delivery/bounce webhook processing require deployment configuration and are not represented as completed delivery.
7. Verify shared Education, Rimi and Trade administration after the authentication hardening. Privileged provisioning now requires the trusted server endpoint; the former browser administrator fallback has been removed.

The migrations and app must roll out together. The new commerce screens report an error if their tables/functions have not been installed; they do not pretend that a local write succeeded.

## Verification

Results in this session: 19 domain/security validation checks passed; all eight new migrations applied and 28 database integration checks passed; TypeScript and Vite production builds passed. All 17 module browser smoke checks passed, together with commercial-form submission, sign-out, browser-only identity rejection and profile-error handling (21 browser checks; the profile-error test was rerun separately after correcting its mocked CORS/error response). The international billing form screenshot is saved at `reports/digital-international-billing.png`.

- `node scripts/verify-digital.mjs`: domain validation tests, TypeScript build gate, then Vite production build. Later stages only run if earlier checks pass.
- `node scripts/test-digital-db.mjs`: migrations and integration checks in isolated PostgreSQL using PGlite. The test accepts `FEREX_PGLITE_PATH`; this session installed the runtime in `%TEMP%/ferex-audit-runtime`. To reproduce, install `@electric-sql/pglite` into that isolated directory or set the variable to its `dist/index.js`.
- `node node_modules/@playwright/test/cli.js test --config playwright.digital.config.ts`: browser tests against the production preview with mocked Supabase responses. This verifies rendering/actions independently of external services; it does not establish live authorization or email delivery.

The repository's standard npm launcher was broken in this environment. Verification uses the installed Node and local tool entrypoints directly. The production build still reports a large application JavaScript chunk; route-level code splitting is a separate performance improvement.

This is a substantial repair of the reviewed flows, with representative automated coverage. It is not a proof that every possible business scenario, historical schema variation or deployed security configuration is correct. Live deployment, legacy-data reconciliation, actual email delivery, payment-gateway integration, recurring billing, chargebacks and jurisdiction-specific invoice requirements require their own checks before claiming full operational readiness.
