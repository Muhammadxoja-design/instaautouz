import { eq, and, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { logger } from '../utils/logger.js';

export type SourceType = 'text' | 'link' | 'file';

export async function addKnowledge(
  clientId: number,
  content: string,
  sourceType: SourceType = 'text',
  sourceName?: string,
) {
  const [entry] = await db
    .insert(schema.aiKnowledge)
    .values({ clientId, content, sourceType, sourceName })
    .returning();
  return entry;
}

export async function getKnowledge(clientId: number) {
  return db
    .select()
    .from(schema.aiKnowledge)
    .where(and(eq(schema.aiKnowledge.clientId, clientId), eq(schema.aiKnowledge.isActive, true)))
    .orderBy(desc(schema.aiKnowledge.createdAt));
}

export async function deleteKnowledge(id: number, clientId: number) {
  const [existing] = await db
    .select()
    .from(schema.aiKnowledge)
    .where(and(eq(schema.aiKnowledge.id, id), eq(schema.aiKnowledge.clientId, clientId)))
    .limit(1);

  if (!existing) return null;

  await db
    .update(schema.aiKnowledge)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.aiKnowledge.id, id));

  return existing;
}

export async function fetchLinkContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'InstaAutoUZ/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();

    const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || url;
    const body = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return `Sarlavha: ${title}\n\nMatn: ${body.slice(0, 3000)}`;
  } catch (err) {
    logger.error(`Fetch link error: ${err instanceof Error ? err.message : err}`);
    return `(Havolani o'qib bo'lmadi: ${url})`;
  }
}

export async function getOrCreateSettings(clientId: number) {
  const [existing] = await db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.clientId, clientId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(schema.aiSettings)
    .values({ clientId })
    .returning();

  return created;
}

export async function updateSettings(
  clientId: number,
  data: {
    provider?: string;
    smartReplyEnabled?: boolean;
    contextCount?: number;
    systemPrompt?: string;
  },
) {
  const [updated] = await db
    .update(schema.aiSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.aiSettings.clientId, clientId))
    .returning();

  return updated;
}
