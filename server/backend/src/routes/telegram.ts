import { Router, type Request, type Response } from 'express';
import { InlineKeyboard } from 'grammy';
import { eq } from 'drizzle-orm';
import { getWebhookCallback, getBot, sendNotification } from '../services/telegram.js';
import { authenticate } from '../middleware/auth.js';
import db, { schema } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const callback = getWebhookCallback();

  if (!callback) {
    return res.status(503).json({ error: { message: 'Bot not configured' } });
  }

  try {
    await callback(req, res);
  } catch (err) {
    logger.error(`Webhook error: ${err instanceof Error ? err.message : err}`);
    if (!res.headersSent) res.sendStatus(200);
  }
});

router.get('/me', authenticate, async (_req: Request, res: Response) => {
  try {
    const bot = getBot();
    const me = await bot.api.getMe();
    const commands = await bot.api.getMyCommands();
    const webhookInfo = await bot.api.getWebhookInfo();
    res.json({
      bot: {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
        supportsInlineQueries: me.supports_inline_queries,
        supportsGuestQueries: (me as any).supports_guest_queries,
      },
      commands,
      webhook: webhookInfo,
    });
  } catch (err) {
    logger.error(`Telegram /me: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get bot info' } });
  }
});

router.post('/notify', authenticate, async (req: Request, res: Response) => {
  try {
    const { clientId, message, parseMode } = req.body;

    if (!clientId || !message) {
      return res.status(400).json({ error: { message: 'clientId and message required' } });
    }

    await sendNotification(clientId, message, parseMode);
    res.json({ ok: true });
  } catch (err) {
    logger.error(`Telegram /notify: ${err}`);
    res.status(500).json({ error: { message: 'Failed to send notification' } });
  }
});

router.post('/broadcast', authenticate, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: { message: 'message required' } });
    }

    const bot = getBot();
    const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || '';

    const users = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.isActive, true));

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await bot.api.sendMessage(user.chatId, message, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', webAppUrl),
        });
        sent++;
      } catch {
        failed++;
      }
    }

    res.json({ ok: true, sent, failed });
  } catch (err) {
    logger.error(`Telegram /broadcast: ${err}`);
    res.status(500).json({ error: { message: 'Broadcast failed' } });
  }
});

router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.clientId, req.client!.clientId))
      .limit(1);

    const settingKey = `tg_prefs_${req.client!.clientId}`;
    const prefsRow = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, settingKey))
      .limit(1);
    const prefs = prefsRow.length > 0 ? (prefsRow[0].value as Record<string, boolean>) : {};

    if (rows.length === 0) {
      return res.json({ connected: false, ...prefs });
    }

    res.json({
      connected: true,
      ...prefs,
      user: {
        telegramId: rows[0].telegramId,
        telegramUsername: rows[0].telegramUsername,
        chatId: rows[0].chatId,
        isActive: rows[0].isActive,
        createdAt: rows[0].createdAt,
      },
    });
  } catch (err) {
    logger.error(`Telegram /status: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get status' } });
  }
});

router.post('/unlink', authenticate, async (req: Request, res: Response) => {
  try {
    const existing = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.clientId, req.client!.clientId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Not linked' } });
    }

    await db
      .delete(schema.telegramUsers)
      .where(eq(schema.telegramUsers.clientId, req.client!.clientId));

    res.json({ ok: true, message: 'Telegram unlinked' });
  } catch (err) {
    logger.error(`Telegram /unlink: ${err}`);
    res.status(500).json({ error: { message: 'Failed to unlink' } });
  }
});

router.post('/toggle', authenticate, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || typeof value !== 'boolean') {
      return res.status(400).json({ error: { message: 'key and boolean value required' } });
    }

    const settingKey = `tg_prefs_${req.client!.clientId}`;
    const existing = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, settingKey))
      .limit(1);

    const prefs = existing.length > 0 ? (existing[0].value as Record<string, boolean>) : {};

    if (existing.length > 0) {
      await db
        .update(schema.systemSettings)
        .set({ value: { ...prefs, [key]: value }, updatedAt: new Date() })
        .where(eq(schema.systemSettings.key, settingKey));
    } else {
      await db.insert(schema.systemSettings).values({
        key: settingKey,
        value: { [key]: value },
        description: 'Telegram notification preferences',
      });
    }

    res.json({ ok: true, [key]: value });
  } catch (err) {
    logger.error(`Telegram /toggle: ${err}`);
    res.status(500).json({ error: { message: 'Failed to toggle setting' } });
  }
});

router.post('/link', authenticate, async (req: Request, res: Response) => {
  try {
    const { clientId, telegramId, telegramUsername, chatId } = req.body;

    if (!clientId || !telegramId || !chatId) {
      return res.status(400).json({ error: { message: 'clientId, telegramId, chatId required' } });
    }

    const existing = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, telegramId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.telegramUsers)
        .set({ clientId, chatId, telegramUsername, updatedAt: new Date() })
        .where(eq(schema.telegramUsers.telegramId, telegramId));

      return res.json({ ok: true, linked: false, message: 'Telegram account re-linked' });
    }

    await db.insert(schema.telegramUsers).values({
      clientId,
      telegramId,
      telegramUsername,
      chatId,
      isActive: true,
    });

    res.json({ ok: true, linked: true, message: 'Telegram account linked' });
  } catch (err) {
    logger.error(`Telegram /link: ${err}`);
    res.status(500).json({ error: { message: 'Failed to link account' } });
  }
});

export { router as telegramRouter };
