import axios from 'axios';
import { logger } from '../utils/logger.js';
import { registerHandler, type PlatformAccount } from './platform.js';

const WA_API_VERSION = 'v22.0';
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

/* ================================================================ */
/*  WHATSAPP CLOUD API                                                */
/*  Docs: https://developers.facebook.com/docs/whatsapp/cloud-api     */
/* ================================================================ */

function getConfig() {
  const token = process.env.WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error('WA_ACCESS_TOKEN and WA_PHONE_NUMBER_ID must be set in .env');
  }
  return { token, phoneNumberId };
}

export async function sendMessage(to: string, text: string) {
  const { token, phoneNumberId } = getConfig();

  const { data } = await axios.post(
    `${WA_BASE}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
}

export async function sendTemplate(to: string, templateName: string, lang = 'uz') {
  const { token, phoneNumberId } = getConfig();

  const { data } = await axios.post(
    `${WA_BASE}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: lang } },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
}

export async function getProfile() {
  const { token, phoneNumberId } = getConfig();

  const { data } = await axios.get(`${WA_BASE}/${phoneNumberId}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { fields: 'id,name,display_phone_number,verified_name' },
  });
  return data;
}

/* ================================================================ */
/*  PLATFORM HANDLER                                                   */
/* ================================================================ */

const handlerAvailable = !!(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);

registerHandler({
  platform: 'wa',
  label: 'WhatsApp',
  icon: 'message-circle',
  webhookSupported: true,
  dmSupported: true,
  postSupported: false,

  async sendMessage(_account: PlatformAccount, recipientId: string, text: string) {
    return sendMessage(recipientId, text);
  },

  async fetchConversations() {
    return [];
  },

  async fetchMessages() {
    return [];
  },

  async getProfile() {
    const profile = await getProfile();
    return { ...profile, platform: 'wa', handlerConfigured: handlerAvailable };
  },
});

if (!handlerAvailable) {
  logger.warn('WhatsApp handler: WA_ACCESS_TOKEN or WA_PHONE_NUMBER_ID not set — disabled');
}
