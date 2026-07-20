import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { linkAccount, getAccounts, getAccount, unlinkAccount, getHandler } from '../services/platform.js';
import { syncConversations } from '../services/instagram-dm.js';
import { decrypt } from '../utils/crypto.js';
import db, { schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string | undefined;
    const accounts = await getAccounts(req.client!.clientId, platform as any);
    res.json({ accounts });
  } catch (err) {
    logger.error(`Platforms GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch accounts' } });
  }
});

router.post('/link', async (req: Request, res: Response) => {
  try {
    const { platform, platformUserId, platformUsername, accessToken } = req.body;
    if (!platform || !platformUserId) {
      return res.status(400).json({ error: { message: 'platform and platformUserId required' } });
    }

    const account = await linkAccount(req.client!.clientId, platform, platformUserId, {
      platformUsername,
      accessToken,
    });
    res.status(201).json({ account });
  } catch (err) {
    logger.error(`Platforms POST /link: ${err}`);
    res.status(500).json({ error: { message: 'Failed to link account' } });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await unlinkAccount(Number(req.params.id), req.client!.clientId);
    if (!result) return res.status(404).json({ error: { message: 'Account not found' } });
    res.json({ message: 'Account unlinked' });
  } catch (err) {
    logger.error(`Platforms DELETE: ${err}`);
    res.status(500).json({ error: { message: 'Failed to unlink account' } });
  }
});

router.get('/:id/conversations', async (req: Request, res: Response) => {
  try {
    const account = await getAccount(Number(req.params.id), req.client!.clientId);
    if (!account) return res.status(404).json({ error: { message: 'Account not found' } });

    const handler = getHandler(account.platform as any);
    if (!handler || !handler.dmSupported) {
      return res.status(400).json({ error: { message: `${account.platform} does not support DM` } });
    }

    const conversations = await handler.fetchConversations(account as any);
    res.json({ conversations });
  } catch (err) {
    logger.error(`Platforms conversations GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch conversations' } });
  }
});

router.get('/:id/sync', async (req: Request, res: Response) => {
  try {
    const account = await getAccount(Number(req.params.id), req.client!.clientId);
    if (!account) return res.status(404).json({ error: { message: 'Account not found' } });

    if (account.platform === 'ig') {
      const [igAcc] = await db
        .select()
        .from(schema.igAccounts)
        .where(eq(schema.igAccounts.igUserId, account.platformUserId))
        .limit(1);

      if (igAcc) {
        const token = decrypt(igAcc.accessToken);
        await syncConversations(req.client!.clientId, account.platformUserId, token);
        res.json({ ok: true, message: 'Conversations synced' });
      } else {
        res.json({ ok: false, message: 'No IG account found with token' });
      }
    } else {
      res.json({ ok: false, message: 'Sync not supported for this platform' });
    }
  } catch (err) {
    logger.error(`Platforms sync GET: ${err}`);
    res.status(500).json({ error: { message: 'Sync failed' } });
  }
});

router.get('/handlers', async (_req: Request, res: Response) => {
  const platforms = [
    { id: 'ig', label: 'Instagram', apiType: 'Meta Graph API', configured: true },
    { id: 'tg', label: 'Telegram', apiType: 'Telegram Bot API', configured: !!process.env.TELEGRAM_BOT_TOKEN },
    { id: 'tiktok', label: 'TikTok', apiType: 'TikTok Business API', configured: !!process.env.TIKTOK_ACCESS_TOKEN },
    { id: 'wa', label: 'WhatsApp', apiType: 'WhatsApp Cloud API', configured: !!(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID) },
  ];
  res.json({ platforms });
});

export { router as platformRouter };
