// Sending functions. Both return the WhatsApp message ID (messages[0].id) and record the message in the store.
import { config } from './config.js';
import { createGraphClient } from './graph.js';
import { normalizePhone } from './phone.js';
import { WhatsAppError } from './errors.js';
import { log, mask } from './logger.js';

/**
 * Builds the JSON body for a template message.
 * Variables fill {{1}}, {{2}}, ... of the template BODY in order. Pass `opts.components` to add header/button components yourself.
 */
export function buildTemplatePayload(to, templateName, languageCode, variables = [], opts = {}) {
  if (!templateName) throw new Error('templateName is required.');
  if (!languageCode) throw new Error('languageCode is required (for example en_US or en).');
  const template = { name: templateName, language: { code: languageCode } };
  const components = [...(opts.components || [])];
  if (variables.length) {
    components.unshift({ type: 'body', parameters: variables.map(v => ({ type: 'text', text: String(v) })) });
  }
  if (components.length) template.components = components;
  return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'template', template };
}

export function createMessenger({ graph = createGraphClient(), store = null, phoneNumberId = config.phoneNumberId } = {}) {
  const path = `${phoneNumberId}/messages`;

  async function send(payload, meta) {
    try {
      const res = await graph.post(path, payload);
      const id = res?.messages?.[0]?.id;
      if (!id) throw new WhatsAppError({ message: 'Meta accepted the request but returned no message ID.', kind: 'unknown' });
      store?.recordOutbound({ waMessageId: id, to: payload.to, type: payload.type, template: meta.template, body: meta.body });
      log.info('message accepted', { to: mask(payload.to), type: payload.type, template: meta.template, id });
      return id;
    } catch (err) {
      if (err instanceof WhatsAppError) {
        store?.recordFailedOutbound({ to: payload.to, type: payload.type, template: meta.template, body: meta.body, code: err.code, message: err.message });
        log.error('send failed', { to: mask(payload.to), error: err.toLogString() });
      }
      throw err;
    }
  }

  /** Send an approved template. Works any time (this is how you start a conversation). */
  async function sendTemplateMessage(to, templateName, languageCode, variables = [], opts = {}) {
    const number = normalizePhone(to);
    return send(buildTemplatePayload(number, templateName, languageCode, variables, opts), { template: templateName });
  }

  /** Free text. Meta only delivers it within 24 h of the customer's last message; otherwise error 131047. */
  async function sendTextMessage(to, text) {
    const number = normalizePhone(to);
    const body = String(text ?? '');
    if (!body.trim()) throw new Error('Text message is empty.');
    if (body.length > 4096) throw new Error('Text message is longer than the 4096 character limit.');
    try {
      return await send({ messaging_product: 'whatsapp', recipient_type: 'individual', to: number, type: 'text', text: { preview_url: false, body } }, { body });
    } catch (err) {
      if (err instanceof WhatsAppError && err.code === 131047) {
        err.message = 'Outside the 24-hour customer-service window: free text cannot be sent. Use sendTemplateMessage with an approved template.';
      }
      throw err;
    }
  }

  return { sendTemplateMessage, sendTextMessage };
}
