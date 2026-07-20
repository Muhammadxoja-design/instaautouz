import { eq, and, desc, lt, gte, sql } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { sendMessage as igSendDm } from './instagram-dm.js';
import { createInstagramMediaContainer, publishInstagramMedia } from './meta.js';
import { logger } from '../utils/logger.js';

/* ================================================================ */
/*  CRUD                                                              */
/* ================================================================ */

export async function listPosts(clientId: number, status?: string, platform?: string) {
  const conditions = [eq(schema.contentCalendar.clientId, clientId)];
  if (status) conditions.push(eq(schema.contentCalendar.status, status as any));
  if (platform) conditions.push(eq(schema.contentCalendar.platform, platform as any));

  return db
    .select()
    .from(schema.contentCalendar)
    .where(and(...conditions))
    .orderBy(desc(schema.contentCalendar.scheduledAt));
}

export async function getPost(id: number, clientId: number) {
  const [post] = await db
    .select()
    .from(schema.contentCalendar)
    .where(and(eq(schema.contentCalendar.id, id), eq(schema.contentCalendar.clientId, clientId)))
    .limit(1);
  return post || null;
}

export async function createPost(clientId: number, data: {
  socialAccountId?: number;
  platform: string;
  contentType?: string;
  caption?: string;
  mediaUrls?: string[];
  hashtags?: string[];
  scheduledAt: string | Date;
  metadata?: unknown;
}) {
  const [post] = await db
    .insert(schema.contentCalendar)
    .values({
      clientId,
      socialAccountId: data.socialAccountId,
      platform: data.platform,
      contentType: data.contentType || 'post',
      caption: data.caption,
      mediaUrls: data.mediaUrls || [],
      hashtags: data.hashtags || [],
      scheduledAt: new Date(data.scheduledAt),
      status: 'scheduled',
      metadata: data.metadata as any,
    })
    .returning();
  return post;
}

export async function updatePost(id: number, clientId: number, data: Partial<{
  caption: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt: string | Date;
  status: string;
  metadata: unknown;
}>) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.caption !== undefined) updateData.caption = data.caption;
  if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls;
  if (data.hashtags !== undefined) updateData.hashtags = data.hashtags;
  if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  const [post] = await db
    .update(schema.contentCalendar)
    .set(updateData)
    .where(and(eq(schema.contentCalendar.id, id), eq(schema.contentCalendar.clientId, clientId)))
    .returning();
  return post || null;
}

export async function deletePost(id: number, clientId: number) {
  const [post] = await db
    .delete(schema.contentCalendar)
    .where(and(eq(schema.contentCalendar.id, id), eq(schema.contentCalendar.clientId, clientId)))
    .returning();
  return post || null;
}

/* ================================================================ */
/*  UPCOMING — posts due soon for dashboard widget                    */
/* ================================================================ */

export async function getUpcomingPosts(clientId: number, limit = 5) {
  return db
    .select()
    .from(schema.contentCalendar)
    .where(
      and(
        eq(schema.contentCalendar.clientId, clientId),
        eq(schema.contentCalendar.status, 'scheduled'),
        gte(schema.contentCalendar.scheduledAt, new Date()),
      ),
    )
    .orderBy(schema.contentCalendar.scheduledAt)
    .limit(limit);
}

/* ================================================================ */
/*  PUBLISH — called by cron, publishes due posts                     */
/* ================================================================ */

export async function publishDuePosts() {
  const duePosts = await db
    .select()
    .from(schema.contentCalendar)
    .where(
      and(
        eq(schema.contentCalendar.status, 'scheduled'),
        lt(schema.contentCalendar.scheduledAt, new Date()),
      ),
    );

  for (const post of duePosts) {
    try {
      const caption = [post.caption, ...(post.hashtags || [])].filter(Boolean).join('\n\n');

      if ((post.platform === 'ig' || post.platform === 'Instagram') && post.socialAccountId) {
        const [socialAcc] = await db
          .select()
          .from(schema.socialAccounts)
          .where(eq(schema.socialAccounts.id, post.socialAccountId))
          .limit(1);

        if (socialAcc && socialAcc.accessToken) {
          const token = decrypt(socialAcc.accessToken);
          const igUserId = socialAcc.platformUserId;

          if (post.mediaUrls && post.mediaUrls.length > 0) {
            const { id: creationId } = await createInstagramMediaContainer(
              igUserId,
              post.mediaUrls[0],
              caption,
              token,
              post.contentType === 'video' ? 'VIDEO' : 'IMAGE',
            );

            await publishInstagramMedia(igUserId, creationId, token);
            logger.success(`Content: Published IG post ${post.id} via Media Container API`);
          } else {
            logger.info(`Content: Post ${post.id} has no media, skipping IG publish`);
          }
        } else {
          logger.warn(`Content: No social account or token for post ${post.id}`);
        }
      }

      await db
        .update(schema.contentCalendar)
        .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.contentCalendar.id, post.id));

      logger.success(`Content: Published post ${post.id} on ${post.platform}`);
    } catch (err) {
      logger.error(`Content: Publish failed for post ${post.id}: ${err instanceof Error ? err.message : err}`);
      await db
        .update(schema.contentCalendar)
        .set({ status: 'failed', metadata: { error: String(err) }, updatedAt: new Date() })
        .where(eq(schema.contentCalendar.id, post.id));
    }
  }

  return duePosts.length;
}
