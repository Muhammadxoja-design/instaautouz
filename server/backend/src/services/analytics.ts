import { eq, and, desc, sql, gte } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { fetchInsights, fetchFollowerGrowth, fetchMediaInsights, getDecryptedToken } from './meta.js';
import { logger } from '../utils/logger.js';

/* ================================================================ */
/*  OVERVIEW — dashboard summary cards                                */
/* ================================================================ */

export async function getOverview(clientId: number) {
  const [igCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.igAccounts)
    .where(and(eq(schema.igAccounts.clientId, clientId), eq(schema.igAccounts.isActive, true)));

  const [ruleCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.automationRules)
    .innerJoin(schema.igAccounts, eq(schema.automationRules.igAccountId, schema.igAccounts.id))
    .where(and(eq(schema.igAccounts.clientId, clientId), eq(schema.automationRules.isActive, true)));

  const [eventCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.triggeredEvents)
    .where(eq(schema.triggeredEvents.clientId, clientId));

  const [aiReplies] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.clientId, clientId), eq(schema.aiConversations.contextType, 'auto_reply')));

  const [convCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.dmConversations)
    .where(eq(schema.dmConversations.clientId, clientId));

  const [msgCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.dmMessages)
    .where(eq(schema.dmMessages.clientId, clientId));

  const [unread] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.dmConversations)
    .where(and(eq(schema.dmConversations.clientId, clientId), sql`unread_count > 0`, eq(schema.dmConversations.isArchived, false)));

  return {
    instagramAccounts: Number(igCount.count),
    automationRules: Number(ruleCount.count),
    totalEvents: Number(eventCount.count),
    aiReplies: Number(aiReplies.count),
    dmConversations: Number(convCount.count),
    dmMessages: Number(msgCount.count),
    unreadConversations: Number(unread.count),
  };
}

/* ================================================================ */
/*  INSTAGRAM INSIGHTS — from Meta API                                */
/* ================================================================ */

export async function getInstagramInsights(clientId: number) {
  const accounts = await db
    .select()
    .from(schema.igAccounts)
    .where(and(eq(schema.igAccounts.clientId, clientId), eq(schema.igAccounts.isActive, true)));

  if (accounts.length === 0) {
    return { accounts: [], total: null };
  }

  const results = [];

  for (const acc of accounts) {
    try {
      const token = decrypt(acc.accessToken);
      const insights = await fetchInsights(acc.igUserId, token);
      const media = await fetchMediaInsights(acc.igUserId, token);

      const metrics: Record<string, number> = {};
      for (const item of insights) {
        if (item.values?.[0]?.value) {
          metrics[item.name] = Number(item.values[0].value);
        }
      }

      results.push({
        id: acc.id,
        username: acc.igUsername,
        userId: acc.igUserId,
        metrics,
        mediaStats: media,
      });
    } catch (err) {
      logger.error(`Analytics IG insights error for ${acc.igUsername}: ${err instanceof Error ? err.message : err}`);
      results.push({
        id: acc.id,
        username: acc.igUsername,
        userId: acc.igUserId,
        metrics: {},
        mediaStats: { totalPosts: 0, avgLikes: 0, avgComments: 0, totalLikes: 0, totalComments: 0, recentPosts: [] },
      });
    }
  }

  /* aggregate totals */
  if (results.length > 0) {
    const total: Record<string, number> = {};
    for (const r of results) {
      for (const [key, val] of Object.entries(r.metrics)) {
        total[key] = (total[key] || 0) + val;
      }
    }
    const totalMedia = results.reduce((s, r) => s + (r.mediaStats?.avgLikes || 0), 0);

    return {
      accounts: results,
      total: {
        ...total,
        avgLikes: results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.mediaStats?.avgLikes || 0), 0) / results.length) : 0,
        avgComments: results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.mediaStats?.avgComments || 0), 0) / results.length) : 0,
        totalPosts: results.reduce((s, r) => s + (r.mediaStats?.totalPosts || 0), 0),
      },
    };
  }

  return { accounts: [], total: null };
}

/* ================================================================ */
/*  AI ANALYTICS                                                       */
/* ================================================================ */

export async function getAiAnalytics(clientId: number) {
  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.clientId, clientId), eq(schema.aiConversations.contextType, 'auto_reply')));

  const [chatCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.clientId, clientId), eq(schema.aiConversations.contextType, 'chat'), eq(schema.aiConversations.role, 'assistant')));

  const recent = await db
    .select()
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.clientId, clientId), eq(schema.aiConversations.contextType, 'auto_reply')))
    .orderBy(desc(schema.aiConversations.createdAt))
    .limit(5);

  const daily = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date`,
      count: sql<number>`count(*)`,
    })
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.clientId, clientId), eq(schema.aiConversations.contextType, 'auto_reply'), gte(schema.aiConversations.createdAt, sql`now() - interval '30 days'`)))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  return {
    totalAutoReplies: Number(total.count),
    totalChatSessions: Number(chatCount.count),
    recentReplies: recent.map((r) => ({
      id: r.id,
      content: r.content.slice(0, 200),
      createdAt: r.createdAt,
    })),
    daily: daily.map((d) => ({
      date: d.date,
      count: Number(d.count),
    })),
  };
}

/* ================================================================ */
/*  DM ANALYTICS                                                       */
/* ================================================================ */

export async function getDmAnalytics(clientId: number) {
  const byPlatform = await db
    .select({
      platform: schema.dmConversations.platform,
      count: sql<number>`count(*)`,
      unread: sql<number>`sum(unread_count)`,
    })
    .from(schema.dmConversations)
    .where(and(eq(schema.dmConversations.clientId, clientId), eq(schema.dmConversations.isArchived, false)))
    .groupBy(schema.dmConversations.platform);

  const byDirection = await db
    .select({
      direction: schema.dmMessages.direction,
      count: sql<number>`count(*)`,
    })
    .from(schema.dmMessages)
    .where(eq(schema.dmMessages.clientId, clientId))
    .groupBy(schema.dmMessages.direction);

  const daily = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date`,
      count: sql<number>`count(*)`,
    })
    .from(schema.dmMessages)
    .where(and(eq(schema.dmMessages.clientId, clientId), gte(schema.dmMessages.createdAt, sql`now() - interval '30 days'`)))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  const incoming = byDirection.find((d) => d.direction === 'incoming');
  const outgoing = byDirection.find((d) => d.direction === 'outgoing');

  return {
    byPlatform: byPlatform.map((p) => ({
      platform: p.platform,
      count: Number(p.count),
      unread: Number(p.unread) || 0,
    })),
    totalIncoming: Number(incoming?.count || 0),
    totalOutgoing: Number(outgoing?.count || 0),
    daily: daily.map((d) => ({
      date: d.date,
      count: Number(d.count),
    })),
  };
}

/* ================================================================ */
/*  TIMELINE — time-series aggregation for charting                   */
/* ================================================================ */

export async function getTimeline(clientId: number, days = 30) {
  const events = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date`,
      type: schema.triggeredEvents.eventType,
      count: sql<number>`count(*)`,
    })
    .from(schema.triggeredEvents)
    .where(and(eq(schema.triggeredEvents.clientId, clientId), gte(schema.triggeredEvents.createdAt, sql`now() - interval '${sql.raw(String(days))} days'`)))
    .groupBy(sql`date_trunc('day', created_at), event_type`)
    .orderBy(sql`date_trunc('day', created_at)`);

  return events.map((e) => ({
    date: e.date,
    type: e.type,
    count: Number(e.count),
  }));
}

/* ================================================================ */
/*  CACHE MANAGEMENT — store/read from analytics_cache                 */
/* ================================================================ */

export async function getCached(clientId: number, metricType: string, period = 'day'): Promise<unknown | null> {
  const [row] = await db
    .select()
    .from(schema.analyticsCache)
    .where(
      and(
        eq(schema.analyticsCache.clientId, clientId),
        eq(schema.analyticsCache.metricType, metricType),
        eq(schema.analyticsCache.period, period),
        gte(schema.analyticsCache.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.analyticsCache.cachedAt))
    .limit(1);

  return row?.value ?? null;
}

export async function setCache(
  clientId: number,
  metricType: string,
  value: unknown,
  period = 'day',
  ttlHours = 6,
) {
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

  await db
    .insert(schema.analyticsCache)
    .values({
      clientId,
      platform: 'ig',
      metricType,
      period,
      value: value as any,
      expiresAt,
    })
    .onConflictDoNothing({ target: schema.analyticsCache.id });
}
