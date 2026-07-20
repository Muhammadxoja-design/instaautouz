import { eq, and } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { logger } from '../utils/logger.js';

export type PlatformType = 'ig' | 'tiktok' | 'wa';

export interface PlatformAccount {
  id: number;
  clientId: number;
  platform: PlatformType;
  platformUserId: string;
  platformUsername: string | null;
  accessToken: string | null;
  isActive: boolean;
  metadata: unknown;
}

/* ================================================================ */
/*  PLATFORM ACCOUNT CRUD                                             */
/* ================================================================ */

export async function linkAccount(
  clientId: number,
  platform: PlatformType,
  platformUserId: string,
  data: {
    platformUsername?: string;
    accessToken?: string;
    tokenExpiresAt?: Date;
    metadata?: unknown;
  },
) {
  const existing = await db
    .select()
    .from(schema.socialAccounts)
    .where(
      and(
        eq(schema.socialAccounts.clientId, clientId),
        eq(schema.socialAccounts.platform, platform),
        eq(schema.socialAccounts.platformUserId, platformUserId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(schema.socialAccounts)
      .set({
        platformUsername: data.platformUsername,
        accessToken: data.accessToken,
        tokenExpiresAt: data.tokenExpiresAt,
        metadata: data.metadata as any,
        updatedAt: new Date(),
      })
      .where(eq(schema.socialAccounts.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(schema.socialAccounts)
    .values({
      clientId,
      platform,
      platformUserId,
      platformUsername: data.platformUsername,
      accessToken: data.accessToken,
      tokenExpiresAt: data.tokenExpiresAt,
      metadata: data.metadata as any,
    })
    .returning();
  return created;
}

export async function getAccounts(clientId: number, platform?: PlatformType) {
  const conditions = [eq(schema.socialAccounts.clientId, clientId), eq(schema.socialAccounts.isActive, true)];
  if (platform) conditions.push(eq(schema.socialAccounts.platform, platform));

  return db
    .select()
    .from(schema.socialAccounts)
    .where(and(...conditions))
    .orderBy(schema.socialAccounts.createdAt);
}

export async function getAccount(id: number, clientId: number) {
  const [account] = await db
    .select()
    .from(schema.socialAccounts)
    .where(and(eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.clientId, clientId)))
    .limit(1);
  return account || null;
}

export async function unlinkAccount(id: number, clientId: number) {
  const [updated] = await db
    .update(schema.socialAccounts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.clientId, clientId)))
    .returning();
  return updated || null;
}

export async function getClientForAccount(accountId: number): Promise<number | null> {
  const [account] = await db
    .select()
    .from(schema.socialAccounts)
    .where(eq(schema.socialAccounts.id, accountId))
    .limit(1);
  return account?.clientId ?? null;
}

/* ================================================================ */
/*  PLATFORM HANDLER REGISTRY — dispatches to platform-specific code   */
/* ================================================================ */

export interface PlatformHandler {
  platform: PlatformType;
  label: string;
  icon: string;
  webhookSupported: boolean;
  dmSupported: boolean;
  postSupported: boolean;

  sendMessage(account: PlatformAccount, recipientId: string, text: string): Promise<unknown>;
  fetchConversations(account: PlatformAccount): Promise<Array<{ id: string; name: string; lastMessage?: string }>>;
  fetchMessages(account: PlatformAccount, conversationId: string): Promise<Array<{ id: string; text: string; from: string; timestamp: Date }>>;
  getProfile(account: PlatformAccount): Promise<Record<string, unknown>>;
}

const handlerRegistry = new Map<PlatformType, PlatformHandler>();

export function registerHandler(handler: PlatformHandler) {
  handlerRegistry.set(handler.platform, handler);
  logger.success(`Platform handler registered: ${handler.platform}`);
}

export function getHandler(platform: PlatformType): PlatformHandler | undefined {
  return handlerRegistry.get(platform);
}

export async function sendViaPlatform(
  platform: PlatformType,
  accountId: number,
  recipientId: string,
  text: string,
) {
  const handler = getHandler(platform);
  if (!handler) throw new Error(`No handler for platform: ${platform}`);

  const [account] = await db
    .select()
    .from(schema.socialAccounts)
    .where(eq(schema.socialAccounts.id, accountId))
    .limit(1);

  if (!account || !account.isActive) throw new Error('Account not found or inactive');

  return handler.sendMessage(account as PlatformAccount, recipientId, text);
}
