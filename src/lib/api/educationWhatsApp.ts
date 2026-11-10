import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  sendLeadWhatsAppWelcome,
  DEFAULT_WHATSAPP_CONFIG,
  type WhatsAppConfig,
  type EducationLead
} from './educationLeads';

export {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  sendLeadWhatsAppWelcome,
  DEFAULT_WHATSAPP_CONFIG,
  type WhatsAppConfig
};

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  recipientName?: string
): Promise<{ success: boolean; provider?: string; error?: string }> {
  const dummyLead: EducationLead = {
    id: 'msg-' + Date.now(),
    phone,
    name: recipientName || 'Student',
    status: 'Contacted',
    tags: [],
    source: 'Direct Message',
    whatsapp_sent: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return sendLeadWhatsAppWelcome(dummyLead, message);
}

