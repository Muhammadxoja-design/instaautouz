import type { Request, Response, NextFunction } from 'express';
import db, { schema } from '../db/index.js';
import { and, eq, gte, desc, sql } from 'drizzle-orm';

export async function requireSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = req.client?.clientId;
    if (!clientId) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    const [sub] = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.clientId, clientId),
          eq(schema.subscriptions.status, 'active'),
          gte(schema.subscriptions.endsAt, new Date()),
        ),
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (!sub) {
      const [graceSub] = await db
        .select()
        .from(schema.subscriptions)
        .where(
          and(
            eq(schema.subscriptions.clientId, clientId),
            eq(schema.subscriptions.status, 'grace'),
            gte(schema.subscriptions.gracePeriodEndsAt, new Date()),
          ),
        )
        .orderBy(desc(schema.subscriptions.createdAt))
        .limit(1);

      if (!graceSub) {
        return res.status(403).json({ error: { message: 'Active subscription required' } });
      }

      req.subscription = graceSub;
      return next();
    }

    req.subscription = sub;
    next();
  } catch {
    return res.status(500).json({ error: { message: 'Subscription check failed' } });
  }
}

export async function checkAccountLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = req.client?.clientId;
    if (!clientId) return next();

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.igAccounts)
      .where(and(eq(schema.igAccounts.clientId, clientId), eq(schema.igAccounts.isActive, true)));

    const count = result?.count ?? 0;
    const maxAccounts = req.subscription?.maxAccounts ?? 1;
    if (count >= maxAccounts) {
      return res.status(403).json({ error: { message: `Account limit reached (${maxAccounts})` } });
    }

    next();
  } catch {
    return res.status(500).json({ error: { message: 'Account limit check failed' } });
  }
}

export async function checkRuleLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = req.client?.clientId;
    if (!clientId) return next();

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.automationRules)
      .innerJoin(schema.igAccounts, eq(schema.automationRules.igAccountId, schema.igAccounts.id))
      .where(eq(schema.igAccounts.clientId, clientId));

    const count = result?.count ?? 0;
    const maxRules = req.subscription?.maxRules ?? 5;
    if (count >= maxRules) {
      return res.status(403).json({ error: { message: `Rule limit reached (${maxRules})` } });
    }

    next();
  } catch {
    return res.status(500).json({ error: { message: 'Rule limit check failed' } });
  }
}

declare global {
  namespace Express {
    interface Request {
      subscription?: typeof schema.subscriptions.$inferSelect;
    }
  }
}
