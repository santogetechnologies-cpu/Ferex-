Education billing release
=========================

This release includes university CSV imports, configurable education fees, student UPI submissions, admin split receipts, and central finance integration.

Deploy the database changes before promoting the frontend:

1. Apply `20261102120000_education_billing_integrity.sql`.
2. Apply `20261103100000_education_access_integrity.sql`.
3. Deploy `provision-user` with JWT verification enabled.
4. Deploy `verify-payment` with JWT verification disabled. Its body authenticates provider webhooks using HMAC signatures. Configure `STRIPE_WEBHOOK_SECRET` or `RAZORPAY_WEBHOOK_SECRET` only for a provider actually in use. Without a configured secret the webhook refuses settlement.
5. Promote the frontend after the database and function checks pass.

Existing signed agreements in system_config are copied into the agreement table. Payment and application history is retained. The new workflow table uses twelve education stages without reinterpreting the old four-step visa records.

In Education Admin → Payment & Billing Control Console → Configure fees, review amounts, enabled fees, recipients, tax included in totals, country overrides, and before/after stage timing. University application fees and tuition always remain direct student payments. Central admin manages the UPI payee in gateway settings. Student-entered UPI references remain pending until finance verifies them.

New admin/staff accounts are provisioned by the server without replacing the current session. Student accounts created without a password use the existing password-reset flow to establish a password. Passwords are never cached in browser storage.

Checks:

```
npm run build
npm run test:billing
npm run test:billing:e2e
```

The browser suite uses mocked service responses and never charges a payment or provisions a live account. The database suite runs the migrations against a local PostgreSQL runtime and checks access control, split atomicity, document creation, and country fee limits. A connected Supabase check is still required before production promotion.
