import cron from 'node-cron';
import { db, schema } from './db/index.js';
import { eq, lt, and, gte } from 'drizzle-orm';
import { refreshToken, fetchInsights } from './services/meta.js';
import { decrypt, encrypt } from './utils/crypto.js';
import { setCache } from './services/analytics.js';
import { monitorAndReply } from './services/tiktok.js';
import { publishDuePosts } from './services/content.js';
import { logger } from './utils/logger.js';

export function startCronJobs() {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Cron: Checking expired subscriptions...');
    const now = new Date();

    const expired = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.status, 'active'),
          lt(schema.subscriptions.endsAt, now),
          gte(schema.subscriptions.gracePeriodEndsAt, now),
        ),
      );

    for (const sub of expired) {
      await db
        .update(schema.subscriptions)
        .set({ status: 'grace', updatedAt: now })
        .where(eq(schema.subscriptions.id, sub.id));
      logger.warn(`Cron: Subscription ${sub.id} → grace (client ${sub.clientId})`);
    }

    const fullyExpired = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.status, 'grace'),
          lt(schema.subscriptions.gracePeriodEndsAt, now),
        ),
      );

    for (const sub of fullyExpired) {
      await db
        .update(schema.subscriptions)
        .set({ status: 'expired', updatedAt: now })
        .where(eq(schema.subscriptions.id, sub.id));
      logger.warn(`Cron: Subscription ${sub.id} → expired (client ${sub.clientId})`);
    }
  });

  cron.schedule('0 */6 * * *', async () => {
    logger.info('Cron: Refreshing expiring IG tokens...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringAccounts = await db
      .select()
      .from(schema.igAccounts)
      .where(
        and(
          eq(schema.igAccounts.isActive, true),
          lt(schema.igAccounts.tokenExpiresAt, threeDaysFromNow),
        ),
      );

    for (const account of expiringAccounts) {
      try {
        const token = decrypt(account.accessToken);
        const data = await refreshToken(token);
        const tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

        await db
          .update(schema.igAccounts)
          .set({
            accessToken: encrypt(data.access_token),
            tokenExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(schema.igAccounts.id, account.id));

        logger.success(`Cron: Token refreshed for ${account.igUsername} (${account.igUserId})`);
      } catch (err) {
        logger.error(`Cron: Token refresh failed for ${account.igUsername}: ${err instanceof Error ? err.message : err}`);
      }
    }
  });

  cron.schedule('0 */4 * * *', async () => {
    logger.info('Cron: Refreshing analytics cache...');

    const accounts = await db
      .select()
      .from(schema.igAccounts)
      .where(eq(schema.igAccounts.isActive, true));

    for (const acc of accounts) {
      try {
        const token = decrypt(acc.accessToken);
        const insights = await fetchInsights(acc.igUserId, token);

        const metrics: Record<string, number> = {};
        for (const item of insights) {
          if (item.values?.[0]?.value) {
            metrics[item.name] = Number(item.values[0].value);
          }
        }

        await setCache(acc.clientId, 'ig_insights', metrics, 'day', 4);
        logger.success(`Cron: Cached IG insights for ${acc.igUsername}`);
      } catch (err) {
        logger.error(`Cron: Analytics cache failed for ${acc.igUsername}: ${err instanceof Error ? err.message : err}`);
      }
    }
  });

  cron.schedule('*/10 * * * *', async () => {
    logger.info('Cron: TikTok comment monitoring...');
    try {
      await monitorAndReply();
    } catch (err) {
      logger.error(`Cron TikTok: ${err instanceof Error ? err.message : err}`);
    }
  });

  cron.schedule('* * * * *', async () => {
    const count = await publishDuePosts();
    if (count > 0) logger.info(`Cron: Published ${count} scheduled posts`);
  });

  logger.info('Cron jobs registered');
}
