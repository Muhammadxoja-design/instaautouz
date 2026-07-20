import axios from 'axios';
import { eq, and, sql, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { registerHandler, type PlatformAccount } from './platform.js';
import { generateSmartReply } from './ai.js';
import { getTemplates, renderTemplate } from './templates.js';
import { sendNotification } from './telegram.js';
import { logger } from '../utils/logger.js';

const TIKTOK_BASE = 'https://open-api.tiktok.com';
const TIKTOK_BUSINESS_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

/* ================================================================ */
/*  AUTH                                                              */
/* ================================================================ */

async function getAccessToken(): Promise<string> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) throw new Error('TIKTOK_ACCESS_TOKEN not set in .env');
  return token;
}

/* ================================================================ */
/*  PROFILE                                                           */
/* ================================================================ */

export async function getProfile(accessToken: string) {
  const { data } = await axios.get(`${TIKTOK_BASE}/oauth/userinfo/`, {
    params: { access_token: accessToken },
  });
  return data;
}

/* ================================================================ */
/*  VIDEOS — list user's videos                                       */
/* ================================================================ */

export async function listUserVideos(accessToken: string, openId: string, maxCount = 20) {
  try {
    const { data } = await axios.post(
      `${TIKTOK_BASE}/video/list/`,
      {
        max_count: maxCount,
        fields: ['id', 'title', 'create_time', 'cover_image_url', 'share_url', 'video_description'],
      },
      { params: { access_token: accessToken, open_id: openId } },
    );
    return data?.data?.videos || [];
  } catch (err) {
    logger.error(`TikTok listUserVideos: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/* ================================================================ */
/*  COMMENTS — fetch + reply                                          */
/* ================================================================ */

export async function fetchComments(videoId: string, accessToken: string) {
  try {
    const { data } = await axios.get(`${TIKTOK_BASE}/video/comment/list/`, {
      params: {
        access_token: accessToken,
        video_id: videoId,
        fields: 'id,text,create_time,user',
      },
    });
    return data?.data?.list || [];
  } catch (err) {
    logger.error(`TikTok fetchComments: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

export async function replyToComment(videoId: string, commentId: string, text: string, accessToken: string) {
  const { data } = await axios.post(
    `${TIKTOK_BASE}/video/comment/reply/`,
    { video_id: videoId, comment_id: commentId, text },
    { params: { access_token: accessToken } },
  );
  return data;
}

/* ================================================================ */
/*  MONITOR — scan comments on linked accounts, auto-reply            */
/* ================================================================ */

export async function monitorAndReply() {
  const accounts = await db
    .select()
    .from(schema.socialAccounts)
    .where(and(eq(schema.socialAccounts.platform, 'tiktok'), eq(schema.socialAccounts.isActive, true)));

  for (const acc of accounts) {
    try {
      const token = await getAccessToken();
      const openId = acc.platformUserId;
      const videos = await listUserVideos(token, openId, 5);

      for (const video of videos) {
        const comments = await fetchComments(video.id, token);

        for (const comment of comments) {
          const existing = await db
            .select()
            .from(schema.triggeredEvents)
            .where(eq(schema.triggeredEvents.eventId, `tiktok:${comment.id}`))
            .limit(1);

          if (existing.length > 0) continue;

          const eventId = `tiktok:${comment.id}`;

          await db
            .insert(schema.triggeredEvents)
            .values({
              eventId,
              clientId: acc.clientId,
              eventType: 'tiktok_comment',
              status: 'queued',
              payload: { comment, video, accountId: acc.id },
            })
            .onConflictDoNothing()
            .then(async () => {
              await processComment(acc.clientId, video.id, comment, token);
            });
        }
      }
    } catch (err) {
      logger.error(`TikTok monitor error for ${acc.platformUsername}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function processComment(clientId: number, videoId: string, comment: any, token: string) {
  const text = comment.text || '';
  if (!text) return;

  let replied = false;

  /* Keyword template match */
  const templates = await getTemplates(clientId, 'tiktok');
  for (const tmpl of templates) {
    if (tmpl.keywords?.length) {
      const match = tmpl.keywords.find((kw: string) =>
        text.toLowerCase().includes(kw.toLowerCase()),
      );
      if (match) {
        const reply = renderTemplate(tmpl.content, {
          keyword: match,
          username: comment.user?.username || '',
        });
        await replyToComment(videoId, comment.id, reply, token);
        logger.success(`TikTok: Template replied to ${comment.id} with "${tmpl.name}"`);
        replied = true;
        break;
      }
    }
  }

  /* AI fallback */
  if (!replied) {
    const aiReply = await generateSmartReply(clientId, text, comment.user?.username || '');
    if (aiReply) {
      await replyToComment(videoId, comment.id, aiReply, token);
      await sendNotification(clientId, `🤖 AI TikTok javob berdi:\n\n${aiReply}`).catch(() => {});
      logger.success(`TikTok: AI replied to ${comment.id}`);
    }
  }
}

/* ================================================================ */
/*  PLATFORM HANDLER                                                   */
/* ================================================================ */

const handlerAvailable = !!process.env.TIKTOK_ACCESS_TOKEN;

registerHandler({
  platform: 'tiktok',
  label: 'TikTok',
  icon: 'music',
  webhookSupported: false,
  dmSupported: false,
  postSupported: true,

  async sendMessage() {
    throw new Error('TikTok DM not supported');
  },

  async fetchConversations() {
    return [];
  },

  async fetchMessages() {
    return [];
  },

  async getProfile(account: PlatformAccount) {
    const token = await getAccessToken();
    return {
      platform: 'tiktok',
      username: account.platformUsername,
      userId: account.platformUserId,
      handlerConfigured: handlerAvailable,
    };
  },
});

if (!handlerAvailable) {
  logger.warn('TikTok handler: TIKTOK_ACCESS_TOKEN not set — disabled');
}
