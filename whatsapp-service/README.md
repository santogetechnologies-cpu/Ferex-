# Ferex WhatsApp service

Sends WhatsApp messages through the Meta WhatsApp Business Cloud API and receives delivery statuses and replies.

| Setting | Value |
|---|---|
| Business | Ferex Ventures |
| Meta App ID | 2236884753556721 |
| WhatsApp Business Account ID | 4083659841942268 |
| Phone Number ID (sender) | 1387273184478526 |
| Sender number | +91 91433 82792 |
| Graph API | `https://graph.facebook.com/v21.0` |
| Send endpoint | `POST /1387273184478526/messages` |

## Secrets (environment variables only)
Copy `.env.example` to `.env` (git-ignored) or set real environment variables.

- `WA_TOKEN`: the permanent System User token. Read only in `src/config.js`, sent only in the `Authorization` header by `src/graph.js`, redacted from every log, never returned by any endpoint.
- `WA_APP_SECRET`: App settings > Basic > App secret. Used to verify `X-Hub-Signature-256` on webhooks.
- `WA_VERIFY_TOKEN`: any long random text; paste the same text into Meta's webhook form.

## Use
```bash
npm install
npm test
node src/cli.js send-template 9143382792 hello_world en_US
node src/cli.js send-template 9143382792 payment_reminder en "Asha" "4,999"
node src/cli.js send-text 9143382792 "Thanks, we received your documents."   # only inside the 24 h window
node src/cli.js bulk data/recipients.csv --template payment_reminder --language en --dry-run
node src/cli.js bulk data/recipients.csv --template payment_reminder --language en
npm start        # webhook server on PORT (default 3000)
```
Bulk CSV: header `phone,var1,var2,...`. A report goes to `out/`.

## Webhook
Callback URL `https://<your-public-host>/webhook`, verify token = `WA_VERIFY_TOKEN`, subscribe to the `messages` field. Meta needs a public HTTPS URL (use a tunnel while developing).

## Rules the code enforces
- Business-started messages must use an **approved template**; free text works only within 24 h of the customer's last message (error 131047 is explained in the message).
- Invalid and duplicate numbers are skipped; opted-out contacts (they replied STOP) are never messaged.
- Until the business is verified Meta allows about 250 unique business-initiated recipients per 24 h: `WA_DAILY_UNIQUE_LIMIT`.
- Sending is paced (`WA_RATE_PER_SECOND`, hard cap 10) and temporary errors (429, 5xx, network) are retried with backoff.
- A problem that hits every row (bad token, unknown template, payment issue) stops a bulk run instead of failing each row.
