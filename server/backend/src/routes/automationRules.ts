import { Router, type Request, type Response } from 'express';
import db, { schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { requireSubscription, checkRuleLimit } from '../middleware/subscription.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const rules = await db
      .select({
        id: schema.automationRules.id,
        igAccountId: schema.automationRules.igAccountId,
        keywords: schema.automationRules.keywords,
        replyTemplate: schema.automationRules.replyTemplate,
        isActive: schema.automationRules.isActive,
        createdAt: schema.automationRules.createdAt,
        updatedAt: schema.automationRules.updatedAt,
        igUsername: schema.igAccounts.igUsername,
      })
      .from(schema.automationRules)
      .innerJoin(
        schema.igAccounts,
        eq(schema.automationRules.igAccountId, schema.igAccounts.id),
      )
      .where(eq(schema.igAccounts.clientId, req.client!.clientId))
      .orderBy(schema.automationRules.createdAt);

    return res.json({ rules });
  } catch (err) {
    logger.error(`automationRules.list: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/', requireSubscription, checkRuleLimit, async (req: Request, res: Response) => {
  try {
    const { igAccountId, keywords, replyTemplate } = req.body;

    if (!igAccountId || !keywords?.length) {
      return res.status(400).json({ error: { message: 'igAccountId and keywords required' } });
    }

    const [account] = await db
      .select()
      .from(schema.igAccounts)
      .where(
        and(
          eq(schema.igAccounts.id, igAccountId),
          eq(schema.igAccounts.clientId, req.client!.clientId),
        ),
      )
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: { message: 'IG account not found' } });
    }

    const [rule] = await db
      .insert(schema.automationRules)
      .values({
        igAccountId,
        keywords,
        replyTemplate: replyTemplate || null,
      })
      .returning();

    return res.status(201).json({ rule });
  } catch (err) {
    logger.error(`automationRules.create: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { keywords, replyTemplate, isActive } = req.body;

    const [existing] = await db
      .select()
      .from(schema.automationRules)
      .innerJoin(
        schema.igAccounts,
        eq(schema.automationRules.igAccountId, schema.igAccounts.id),
      )
      .where(
        and(
          eq(schema.automationRules.id, Number(req.params.id)),
          eq(schema.igAccounts.clientId, req.client!.clientId),
        ),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: { message: 'Rule not found' } });
    }

    const [updated] = await db
      .update(schema.automationRules)
      .set({
        ...(keywords !== undefined && { keywords }),
        ...(replyTemplate !== undefined && { replyTemplate }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(schema.automationRules.id, existing.automation_rules.id))
      .returning();

    return res.json({ rule: updated });
  } catch (err) {
    logger.error(`automationRules.update: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [existing] = await db
      .select()
      .from(schema.automationRules)
      .innerJoin(
        schema.igAccounts,
        eq(schema.automationRules.igAccountId, schema.igAccounts.id),
      )
      .where(
        and(
          eq(schema.automationRules.id, Number(req.params.id)),
          eq(schema.igAccounts.clientId, req.client!.clientId),
        ),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: { message: 'Rule not found' } });
    }

    await db.delete(schema.automationRules).where(eq(schema.automationRules.id, existing.automation_rules.id));

    return res.json({ message: 'Rule deleted' });
  } catch (err) {
    logger.error(`automationRules.delete: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

export { router as automationRuleRouter };
