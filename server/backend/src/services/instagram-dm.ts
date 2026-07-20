import axios from 'axios';
import { eq, and, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { registerHandler, type PlatformAccount } from './platform.js';
import { decrypt } from '../utils/crypto.js';

const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function getToken(account: PlatformAccount): Promise<string> {
  if (account.accessToken) return decrypt(account.accessToken);

  const [igAcc] = await db
    .select()
    .from(schema.igAccounts)
    .where(eq(schema.igAccounts.igUserId, account.platformUserId))
    .limit(1);

  if (igAcc) return decrypt(igAcc.accessToken);
  throw new Error('No token found for Instagram account');
}

/* ================================================================ */
/*  IG DM SERVICE                                                      */
/* ================================================================ */

export async function sendMessage(igUserId: string, recipientId: string, text: string, accessToken: string) {
  const { data } = await axios.post(
    `${BASE}/${igUserId}/messages`,
    {
      recipient: { id: recipientId },
      message: { text },
    },
    { params: { access_token: accessToken } },
  );
  return data;
}

export async function fetchConversations(igUserId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${igUserId}/conversations`, {
    params: {
      platform: 'instagram',
      fields: 'id,participants{username},unread_count,last_message',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function fetchMessages(igUserId: string, conversationId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${conversationId}/messages`, {
    params: {
      fields: 'id,message,from,created_time',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getProfile(igUserId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${igUserId}`, {
    params: {
      fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
      access_token: accessToken,
    },
  });
  return data;
}

/* ================================================================ */
/*  DB PERSISTENCE — sync IG conversations to our DB                  */
/* ================================================================ */

export async function syncConversations(clientId: number, igUserId: string, accessToken: string) {
  try {
    const conversations = await fetchConversations(igUserId, accessToken);

    for (const conv of conversations) {
      const participant = conv.participants?.[0];
      if (!participant) continue;

      const existing = await db
        .select()
        .from(schema.dmConversations)
        .where(eq(schema.dmConversations.platformConversationId, conv.id))
        .limit(1);

      const data = {
        clientId,
        platform: 'ig' as const,
        platformConversationId: conv.id,
        participantId: participant.username || conv.id,
        participantName: participant.username,
        lastMessage: conv.last_message?.message || null,
        lastMessageAt: conv.last_message?.created_time ? new Date(conv.last_message.created_time) : new Date(),
        unreadCount: conv.unread_count || 0,
      };

      if (existing.length > 0) {
        await db
          .update(schema.dmConversations)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(schema.dmConversations.id, existing[0].id));
      } else {
        await db.insert(schema.dmConversations).values(data);
      }
    }

    logger.info(`Synced ${conversations.length} IG conversations for client ${clientId}`);
  } catch (err) {
    logger.error(`Sync IG conversations error: ${err instanceof Error ? err.message : err}`);
  }
}

export async function syncMessages(
  clientId: number,
  conversationId: number,
  platformConvId: string,
  igUserId: string,
  accessToken: string,
) {
  try {
    const messages = await fetchMessages(igUserId, platformConvId, accessToken);

    for (const msg of messages) {
      const existing = await db
        .select()
        .from(schema.dmMessages)
        .where(eq(schema.dmMessages.platformMessageId, msg.id))
        .limit(1);

      if (existing.length > 0) continue;

      await db.insert(schema.dmMessages).values({
        conversationId,
        clientId,
        platform: 'ig',
        platformMessageId: msg.id,
        direction: msg.from?.id === igUserId ? 'outgoing' : 'incoming',
        content: msg.message || '(media)',
        createdAt: msg.created_time ? new Date(msg.created_time) : new Date(),
      });
    }

    logger.info(`Synced ${messages.length} IG messages for conversation ${conversationId}`);
  } catch (err) {
    logger.error(`Sync IG messages error: ${err instanceof Error ? err.message : err}`);
  }
}

/* ================================================================ */
/*  PLATFORM HANDLER — register IG handler in the registry            */
/* ================================================================ */

registerHandler({
  platform: 'ig',
  label: 'Instagram',
  icon: 'instagram',
  webhookSupported: true,
  dmSupported: true,
  postSupported: true,

  async sendMessage(account: PlatformAccount, recipientId: string, text: string) {
    const token = await getToken(account);
    return sendMessage(account.platformUserId, recipientId, text, token);
  },

  async fetchConversations(account: PlatformAccount) {
    const token = await getToken(account);
    const convs = await fetchConversations(account.platformUserId, token);
    return convs.map((c: any) => ({
      id: c.id,
      name: c.participants?.[0]?.username || 'Unknown',
      lastMessage: c.last_message?.message,
    }));
  },

  async fetchMessages(account: PlatformAccount, conversationId: string) {
    const token = await getToken(account);
    const msgs = await fetchMessages(account.platformUserId, conversationId, token);
    return msgs.map((m: any) => ({
      id: m.id,
      text: m.message || '',
      from: m.from?.id || '',
      timestamp: new Date(m.created_time || Date.now()),
    }));
  },

  async getProfile(account: PlatformAccount) {
    const token = await getToken(account);
    return getProfile(account.platformUserId, token);
  },
});
