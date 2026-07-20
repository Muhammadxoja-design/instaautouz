import { Router, type Request, type Response } from 'express';
import db, { schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

const PLAN_PRICES: Record<string, { amount: number; maxRules: number; maxAccounts: number }> = {
  monthly_5: { amount: 500_00, maxRules: 5, maxAccounts: 1 },
  monthly_20: { amount: 1000_00, maxRules: 20, maxAccounts: 3 },
  monthly_unlimited: { amount: 2000_00, maxRules: 100, maxAccounts: 10 },
  yearly_5: { amount: 5000_00, maxRules: 5, maxAccounts: 1 },
  yearly_20: { amount: 10000_00, maxRules: 20, maxAccounts: 3 },
  yearly_unlimited: { amount: 20000_00, maxRules: 100, maxAccounts: 10 },
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const subscription = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.clientId, req.client!.clientId),
          eq(schema.subscriptions.status, 'active'),
        ),
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    return res.json({
      subscription: subscription[0] || null,
      plans: Object.entries(PLAN_PRICES).map(([key, val]) => ({
        id: key,
        ...val,
      })),
    });
  } catch (err) {
    logger.error(`subscriptions.list: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/select', async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;
    if (!planId || !PLAN_PRICES[planId]) {
      return res.status(400).json({ error: { message: 'Invalid plan' } });
    }

    const existing = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(eq(schema.subscriptions.clientId, req.client!.clientId), eq(schema.subscriptions.status, 'active')),
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: { message: 'Already have an active subscription' } });
    }

    const plan = PLAN_PRICES[planId];
    const isYearly = planId.startsWith('yearly');
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + (isYearly ? 365 : 30));

    const [subscription] = await db
      .insert(schema.subscriptions)
      .values({
        clientId: req.client!.clientId,
        planType: planId,
        status: 'active',
        startsAt: now,
        endsAt,
        gracePeriodEndsAt: new Date(endsAt.getTime() + 3 * 24 * 60 * 60 * 1000),
        maxRules: plan.maxRules,
        maxAccounts: plan.maxAccounts,
      })
      .returning();

    return res.status(201).json({ subscription });
  } catch (err) {
    logger.error(`subscriptions.select: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { planType } = req.body;

    if (!planType || !PLAN_PRICES[planType]) {
      return res.status(400).json({ error: { message: 'Invalid plan type' } });
    }

    const plan = PLAN_PRICES[planType];
    const isYearly = planType.startsWith('yearly');
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + (isYearly ? 365 : 30));

    const [subscription] = await db
      .insert(schema.subscriptions)
      .values({
        clientId: req.client!.clientId,
        planType,
        status: 'active',
        startsAt: now,
        endsAt,
        gracePeriodEndsAt: new Date(endsAt.getTime() + 3 * 24 * 60 * 60 * 1000),
        maxRules: plan.maxRules,
        maxAccounts: plan.maxAccounts,
      })
      .returning();

    return res.status(201).json({ subscription });
  } catch (err) {
    logger.error(`subscriptions.create: ${err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

export { router as subscriptionRouter };
