// Parsing of Meta's error responses into one readable error type.
//   { "error": { "message", "type", "code", "error_subcode", "error_data": { "details" }, "fbtrace_id" } }

/** What each common error code means and what to do about it. `retry` marks temporary problems worth retrying. */
export const ERROR_HINTS = {
  190: { kind: 'invalid_token', hint: 'The access token is invalid or expired. Generate a permanent System User token and update WA_TOKEN.' },
  132001: { kind: 'template_not_found', hint: 'Template name or language does not exist / is not approved. Check the exact name and language in WhatsApp Manager.' },
  132000: { kind: 'template_params', hint: 'The number of variables does not match the template.' },
  132005: { kind: 'template_params', hint: 'Translated text is too long for the template.' },
  132012: { kind: 'template_params', hint: 'A variable has the wrong format.' },
  131047: { kind: 'outside_window', hint: 'More than 24 hours since the customer last messaged you. Send an approved template message instead.' },
  131026: { kind: 'not_on_whatsapp', hint: 'The recipient is not on WhatsApp, has not accepted the terms, or the number is wrong.' },
  131030: { kind: 'not_allowed_recipient', hint: 'Recipient is not in the allowed list. While testing, add the number under API Setup -> "To".' },
  130429: { kind: 'rate_limit', retry: true, hint: 'Throughput limit reached. Slow down; the client retries automatically.' },
  131056: { kind: 'pair_rate_limit', retry: true, hint: 'Too many messages to this one number in a short time. Wait and retry.' },
  131048: { kind: 'spam_limit', hint: 'Meta rate-limited the sender because of spam reports. Reduce volume and review content.' },
  131049: { kind: 'ecosystem_limit', hint: 'Meta chose not to deliver this marketing message to keep the ecosystem healthy. Do not resend repeatedly.' },
  131042: { kind: 'payment_issue', hint: 'Payment method problem on the WhatsApp Business Account.' },
  131053: { kind: 'media_error', hint: 'Media could not be downloaded or uploaded.' },
  133010: { kind: 'number_not_registered', hint: 'The sender number is not registered.' },
  100: { kind: 'bad_request', hint: 'Invalid parameter. Check the payload and the Phone Number ID.' },
  4: { kind: 'app_rate_limit', retry: true, hint: 'App-level rate limit. Slow down.' },
  80007: { kind: 'waba_rate_limit', retry: true, hint: 'WhatsApp Business Account rate limit. Slow down.' },
  1: { kind: 'unknown_temporary', retry: true, hint: 'Temporary Meta error. Retrying.' },
  2: { kind: 'service_unavailable', retry: true, hint: 'Meta service temporarily unavailable. Retrying.' },
};

export class WhatsAppError extends Error {
  constructor({ message, code, subcode, httpStatus, details, fbtraceId, kind, hint, retryable }) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code ?? null; this.subcode = subcode ?? null; this.httpStatus = httpStatus ?? null;
    this.details = details ?? null; this.fbtraceId = fbtraceId ?? null;
    this.kind = kind || 'unknown'; this.hint = hint || ''; this.retryable = Boolean(retryable);
  }
  /** One line a human can read in a log. */
  toLogString() {
    return `${this.kind} (code ${this.code ?? 'n/a'}${this.httpStatus ? `, HTTP ${this.httpStatus}` : ''}): ${this.message}${this.details ? ` - ${this.details}` : ''}${this.hint ? ` | ${this.hint}` : ''}`;
  }
}

/** Builds a WhatsAppError from an HTTP status and the parsed JSON body (which may be empty or not JSON). */
export function parseGraphError(httpStatus, body) {
  const e = body?.error || {};
  const known = ERROR_HINTS[e.code] || {};
  const serverSide = httpStatus >= 500;
  return new WhatsAppError({
    message: e.message || `Graph API returned HTTP ${httpStatus}`,
    code: e.code, subcode: e.error_subcode, httpStatus,
    details: e.error_data?.details, fbtraceId: e.fbtrace_id,
    kind: known.kind || (httpStatus === 429 ? 'rate_limit' : serverSide ? 'server_error' : 'unknown'),
    hint: known.hint || '',
    retryable: Boolean(known.retry) || httpStatus === 429 || serverSide,
  });
}
