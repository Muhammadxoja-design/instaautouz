import { Router, type Request, type Response } from 'express';
import db, { schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { requireSubscription, checkAccountLimit } from '../middleware/subscription.js';
import { encrypt } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const accounts = await db
      .select()
      .from(schema.igAccounts)
      .where(eq(schema.igAccounts.clientId, req.client!.clientId));

    const result = accounts.map((a) => ({
      id: a.id,
      igUserId: a.igUserId,
      igUsername: a.igUsername,
      tokenExpiresAt: a.tokenExpiresAt,
      isActive: a.isActive,
      createdAt: a.createdAt,
    }));

    return res.json({ accounts: result });
  } catch (err) {
    logger.error(`igAccounts.list: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/', requireSubscription, checkAccountLimit, async (req: Request, res: Response) => {
  try {
    const { igUserId, igUsername, accessToken, tokenExpiresAt } = req.body;

    if (!igUserId || !accessToken) {
      return res.status(400).json({ error: { message: 'igUserId and accessToken required' } });
    }

    const existing = await db
      .select()
      .from(schema.igAccounts)
      .where(
        and(
          eq(schema.igAccounts.clientId, req.client!.clientId),
          eq(schema.igAccounts.igUserId, igUserId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(schema.igAccounts)
        .set({
          accessToken: encrypt(accessToken),
          igUsername: igUsername || existing[0].igUsername,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.igAccounts.id, existing[0].id))
        .returning();

      return res.json({ account: updated });
    }

    const [account] = await db
      .insert(schema.igAccounts)
      .values({
        clientId: req.client!.clientId,
        igUserId,
        igUsername,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
      })
      .returning();

    return res.status(201).json({ account });
  } catch (err) {
    logger.error(`igAccounts.create: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [account] = await db
      .select()
      .from(schema.igAccounts)
      .where(
        and(
          eq(schema.igAccounts.id, Number(req.params.id)),
          eq(schema.igAccounts.clientId, req.client!.clientId),
        ),
      )
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: { message: 'Account not found' } });
    }

    await db
      .update(schema.igAccounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.igAccounts.id, account.id));

    return res.json({ message: 'Account disconnected' });
  } catch (err) {
    logger.error(`igAccounts.delete: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

export { router as igAccountRouter };
