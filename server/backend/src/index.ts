import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createApp } from './app.js';
import { createBot, getBot } from './services/telegram.js';
import db from './db/index.js';
import { startCronJobs } from './cron.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  try {
    await db.execute(sql`SELECT 1`);
    logger.success('Database connected');
  } catch (err) {
    logger.error(`Database connection failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  startCronJobs();
  createBot();

  /* Auto-set Telegram webhook on startup */
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const publicUrl = process.env.PUBLIC_URL || '';
  if (botToken && publicUrl) {
    try {
      const webhookUrl = `${publicUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
      await getBot().api.setWebhook(webhookUrl, {
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
        drop_pending_updates: true,
      });
      logger.success(`Telegram webhook → ${webhookUrl}`);
    } catch (err) {
      logger.warn(`Telegram webhook set failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const app = createApp();

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
