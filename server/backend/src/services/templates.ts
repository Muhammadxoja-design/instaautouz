import { eq, and, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';

export async function createTemplate(
  clientId: number,
  data: {
    name: string;
    content: string;
    platform?: string;
    keywords?: string[];
  },
) {
  const [template] = await db
    .insert(schema.dmTemplates)
    .values({
      clientId,
      name: data.name,
      content: data.content,
      platform: (data.platform as any) || 'ig',
      keywords: data.keywords || [],
    })
    .returning();
  return template;
}

export async function getTemplates(clientId: number, platform?: string) {
  const conditions = [eq(schema.dmTemplates.clientId, clientId), eq(schema.dmTemplates.isActive, true)];
  if (platform) conditions.push(eq(schema.dmTemplates.platform, platform as any));

  return db
    .select()
    .from(schema.dmTemplates)
    .where(and(...conditions))
    .orderBy(desc(schema.dmTemplates.createdAt));
}

export async function getTemplate(id: number, clientId: number) {
  const [template] = await db
    .select()
    .from(schema.dmTemplates)
    .where(and(eq(schema.dmTemplates.id, id), eq(schema.dmTemplates.clientId, clientId)))
    .limit(1);
  return template || null;
}

export async function updateTemplate(
  id: number,
  clientId: number,
  data: { name?: string; content?: string; keywords?: string[]; isActive?: boolean },
) {
  const [updated] = await db
    .update(schema.dmTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.dmTemplates.id, id), eq(schema.dmTemplates.clientId, clientId)))
    .returning();
  return updated || null;
}

export async function deleteTemplate(id: number, clientId: number) {
  const [deleted] = await db
    .update(schema.dmTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(schema.dmTemplates.id, id), eq(schema.dmTemplates.clientId, clientId)))
    .returning();
  return deleted || null;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}
