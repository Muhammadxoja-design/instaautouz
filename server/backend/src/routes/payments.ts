import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

/* ============ User-facing payment endpoints ============ */

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const payments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.clientId, req.client!.clientId))
      .orderBy(desc(schema.payments.createdAt))
      .limit(50);
    return res.json({ payments });
  } catch (err) {
    logger.error(`Payments GET: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.id, Number(req.params.id)), eq(schema.payments.clientId, req.client!.clientId)))
      .limit(1);
    if (!payment) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }
    return res.json({ payment });
  } catch (err) {
    logger.error(`Payments GET /:id: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.get('/verify/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.id, Number(req.params.id)), eq(schema.payments.clientId, req.client!.clientId)))
      .limit(1);
    if (!payment) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }
    return res.json({ status: payment.status, paid: payment.status === 'paid', payment });
  } catch (err) {
    logger.error(`Payments verify: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { provider, amount } = req.body || {};
    if (!provider || !amount) {
      return res.status(400).json({ error: { message: 'provider and amount required' } });
    }
    const [payment] = await db
      .insert(schema.payments)
      .values({
        clientId: req.client!.clientId,
        provider,
        amount: Number(amount),
        status: 'pending',
      })
      .returning();
    return res.status(201).json({ payment });
  } catch (err) {
    logger.error(`Payments POST: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.get('/:id/invoice', authenticate, async (req: Request, res: Response) => {
  try {
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.id, Number(req.params.id)), eq(schema.payments.clientId, req.client!.clientId)))
      .limit(1);
    if (!payment) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }
    const [client] = await db
      .select({ name: schema.clients.name, email: schema.clients.email })
      .from(schema.clients)
      .where(eq(schema.clients.id, payment.clientId))
      .limit(1);
    return res.json({
      invoice: {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        provider: payment.provider,
        status: payment.status,
        createdAt: payment.createdAt,
        clientName: client?.name || '',
        clientEmail: client?.email || '',
      },
    });
  } catch (err) {
    logger.error(`Payments invoice: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.id, Number(req.params.id)), eq(schema.payments.clientId, req.client!.clientId)))
      .limit(1);
    if (!payment) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }
    const { status, provider_data } = req.body || {};
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (status === 'paid') updates.paidAt = new Date();
    if (provider_data) {
      try {
        updates.metadata = typeof provider_data === 'string' ? JSON.parse(provider_data) : provider_data;
      } catch {
        return res.status(400).json({ error: { message: 'Invalid provider_data JSON' } });
      }
    }
    const [updated] = await db
      .update(schema.payments)
      .set(updates)
      .where(eq(schema.payments.id, payment.id))
      .returning();
    return res.json({ payment: updated });
  } catch (err) {
    logger.error(`Payments PUT: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.post('/provider-url', authenticate, async (req: Request, res: Response) => {
  try {
    const { provider, amount, transaction_id, return_url } = req.body || {};
    if (!provider || !amount) {
      return res.status(400).json({ error: { message: 'provider and amount required' } });
    }
    const clientId = req.client!.clientId;
    const [payment] = await db
      .insert(schema.payments)
      .values({
        clientId,
        provider,
        amount: Number(amount),
        status: 'pending',
        providerTransactionId: transaction_id || undefined,
      })
      .returning();
    let redirect_url = '';
    if (provider === 'click') {
      const params = new URLSearchParams({
        service_id: process.env.CLICK_SERVICE_ID || '',
        merchant_id: process.env.CLICK_MERCHANT_ID || '',
        amount: String(amount),
        transaction_param: String(payment.id),
        return_url: return_url || '',
      });
      redirect_url = `https://my.click.uz/services/pay?${params.toString()}`;
    } else if (provider === 'payme') {
      redirect_url = `https://checkout.payme.uz/${process.env.PAYME_MERCHANT_ID || ''}`;
    } else if (provider === 'uzum') {
      redirect_url = `https://app.uzumbank.uz/pay/${process.env.UZUM_SERVICE_ID || ''}`;
    } else if (provider === 'paynet') {
      redirect_url = `https://paynet.uz/pay/${payment.id}`;
    }
    return res.json({ payment, redirect_url });
  } catch (err) {
    logger.error(`Payments provider-url: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

const PLANS: Record<string, { maxRules: number; maxAccounts: number }> = {
  monthly_5: { maxRules: 5, maxAccounts: 1 },
  monthly_20: { maxRules: 20, maxAccounts: 3 },
  monthly_unlimited: { maxRules: 100, maxAccounts: 10 },
  yearly_5: { maxRules: 5, maxAccounts: 1 },
  yearly_20: { maxRules: 20, maxAccounts: 3 },
  yearly_unlimited: { maxRules: 100, maxAccounts: 10 },
};

async function activateSubscription(clientId: number) {
  const subs = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.clientId, clientId))
    .orderBy(desc(schema.subscriptions.createdAt))
    .limit(1);

  const sub = subs[0];

  if (sub && (sub.status === 'active' || sub.status === 'grace')) {
    await db
      .update(schema.subscriptions)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(schema.subscriptions.id, sub.id));
  } else {
    const plan = PLANS['monthly_5'];
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + 30);

    await db.insert(schema.subscriptions).values({
      clientId,
      planType: 'monthly_5',
      status: 'active',
      startsAt: now,
      endsAt,
      gracePeriodEndsAt: new Date(endsAt.getTime() + 3 * 24 * 60 * 60 * 1000),
      maxRules: plan.maxRules,
      maxAccounts: plan.maxAccounts,
    });
  }
}

/* ============ Payme (JSON-RPC 2.0) ============ */

router.post('/payme', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      return res.status(401).json({ error: { code: -32504, message: 'Auth required' } });
    }

    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const [login, password] = decoded.split(':');
    if (login !== process.env.PAYME_MERCHANT_ID || password !== process.env.PAYME_SECRET_KEY) {
      return res.status(401).json({ error: { code: -32504, message: 'Invalid auth' } });
    }

    const { id, method, params } = req.body;

    switch (method) {
      case 'CheckPerformTransaction':
        return handlePaymeCheck(id, params, res);
      case 'CreateTransaction':
        return handlePaymeCreate(id, params, res);
      case 'PerformTransaction':
        return handlePaymePerform(id, params, res);
      case 'CancelTransaction':
        return handlePaymeCancel(id, params, res);
      case 'CheckTransaction':
        return handlePaymeCheckTransaction(id, params, res);
      case 'GetStatement':
        return handlePaymeStatement(id, params, res);
      default:
        return res.json({ id, error: { code: -32601, message: 'Method not found' } });
    }
  } catch (err) {
    logger.error(`Payme: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { code: -32400, message: 'Internal error' } });
  }
});

async function handlePaymeCheck(id: number, params: any, res: Response) {
  const clientId = params.account?.client_id;
  if (!clientId) {
    return res.json({ id, error: { code: -31099, message: 'Client not found' } });
  }

  const client = await db.select().from(schema.clients).where(eq(schema.clients.id, Number(clientId))).limit(1);
  if (!client.length) {
    return res.json({ id, error: { code: -31099, message: 'Client not found' } });
  }

  const amountInSum = params.amount / 100;
  const allowedAmounts = [50000, 100000, 200000, 500000];
  if (!allowedAmounts.includes(amountInSum)) {
    return res.json({ id, error: { code: -31001, message: 'Invalid amount' } });
  }

  return res.json({ id, result: { allow: true } });
}

async function handlePaymeCreate(id: number, params: any, res: Response) {
  const { id: transId, time, amount, account } = params;

  const existing = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.idempotencyKey, transId.toString()))
    .limit(1);

  if (existing.length > 0) {
    return res.json({
      id,
      result: {
        create_time: existing[0].createdAt.getTime(),
        transaction: existing[0].id.toString(),
        state: existing[0].status === 'paid' ? 2 : 1,
      },
    });
  }

  const clientId = Number(account.client_id);
  if (isNaN(clientId)) {
    return res.json({ id, error: { code: -31099, message: 'Client not found' } });
  }
  const [payment] = await db
    .insert(schema.payments)
    .values({
      clientId,
      provider: 'payme',
      providerTransactionId: transId.toString(),
      amount,
      status: 'pending',
      idempotencyKey: transId.toString(),
      metadata: { payme_time: time },
    })
    .returning();

  return res.json({
    id,
    result: {
      create_time: payment.createdAt.getTime(),
      transaction: payment.id.toString(),
      state: 1,
    },
  });
}

async function handlePaymePerform(id: number, params: any, res: Response) {
  const payment = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.idempotencyKey, params.id.toString()))
    .limit(1);

  if (!payment.length) {
    return res.json({ id, error: { code: -31003, message: 'Transaction not found' } });
  }

  const [updated] = await db
    .update(schema.payments)
    .set({ status: 'paid', updatedAt: new Date() })
    .where(eq(schema.payments.id, payment[0].id))
    .returning();

  await activateSubscription(payment[0].clientId);

  return res.json({
    id,
    result: {
      transaction: updated.id.toString(),
      perform_time: updated.updatedAt.getTime(),
      state: 2,
    },
  });
}

async function handlePaymeCancel(id: number, params: any, res: Response) {
  const payment = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.idempotencyKey, params.id.toString()))
    .limit(1);

  if (!payment.length) {
    return res.json({ id, error: { code: -31003, message: 'Transaction not found' } });
  }

  const [updated] = await db
    .update(schema.payments)
    .set({
      status: params.reason === 1 ? 'cancelled' : 'refunded',
      updatedAt: new Date(),
      metadata: { ...(payment[0].metadata ?? {}), cancel_reason: params.reason },
    })
    .where(eq(schema.payments.id, payment[0].id))
    .returning();

  return res.json({
    id,
    result: {
      transaction: updated.id.toString(),
      cancel_time: updated.updatedAt.getTime(),
      state: -1,
    },
  });
}

async function handlePaymeCheckTransaction(id: number, params: any, res: Response) {
  const payment = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.idempotencyKey, params.id.toString()))
    .limit(1);

  if (!payment.length) {
    return res.json({ id, error: { code: -31003, message: 'Transaction not found' } });
  }

  const state = payment[0].status === 'paid' ? 2 : payment[0].status === 'cancelled' ? -1 : 1;
  return res.json({
    id,
    result: {
      create_time: payment[0].createdAt.getTime(),
      perform_time: payment[0].status === 'paid' ? payment[0].updatedAt.getTime() : 0,
      cancel_time: payment[0].status === 'cancelled' || payment[0].status === 'refunded' ? payment[0].updatedAt.getTime() : 0,
      transaction: payment[0].id.toString(),
      state,
      reason: state === -1 ? 1 : null,
    },
  });
}

async function handlePaymeStatement(id: number, params: any, res: Response) {
  const from = new Date(params.from);
  const to = new Date(params.to);

  const payments = await db
    .select()
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.provider, 'payme'),
        gte(schema.payments.createdAt, from),
        lte(schema.payments.createdAt, to),
      ),
    );

  const transactions = payments.map((p) => ({
    id: p.providerTransactionId,
    time: p.createdAt.getTime(),
    amount: p.amount,
    account: { client_id: p.clientId.toString() },
    create_time: p.createdAt.getTime(),
    perform_time: p.status === 'paid' ? p.updatedAt.getTime() : 0,
    cancel_time: p.status === 'cancelled' || p.status === 'refunded' ? p.updatedAt.getTime() : 0,
    transaction: p.id.toString(),
    state: p.status === 'paid' ? 2 : p.status === 'cancelled' || p.status === 'refunded' ? -1 : 1,
    reason: p.status === 'cancelled' || p.status === 'refunded' ? 1 : null,
  }));

  return res.json({ id, result: { transactions } });
}

/* ============ Click (Prepare / Complete) ============ */

router.post('/click', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const action = body.action;

    const signString = crypto
      .createHash('md5')
      .update(`${body.click_trans_id}${process.env.CLICK_SECRET_KEY}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`)
      .digest('hex');

    if (signString !== body.sign_string) {
      return res.json({ error: -1, error_note: 'Invalid sign string' });
    }

    if (action === 0) {
      return handleClickPrepare(body, res);
    } else if (action === 1) {
      return handleClickComplete(body, res);
    }

    return res.json({ error: -1, error_note: 'Invalid action' });
  } catch (err) {
    logger.error(`Click: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: -1, error_note: 'Internal error' });
  }
});

async function handleClickPrepare(body: any, res: Response) {
  const clientId = Number(body.merchant_trans_id);
  if (isNaN(clientId)) {
    return res.json({ error: -5, error_note: 'User not found' });
  }
  const client = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .limit(1);

  if (!client.length) {
    return res.json({ error: -5, error_note: 'User not found' });
  }

  const [payment] = await db
    .insert(schema.payments)
    .values({
      clientId,
      provider: 'click',
      providerTransactionId: body.click_trans_id.toString(),
      amount: body.amount,
      status: 'pending',
      idempotencyKey: `click:${body.click_trans_id}`,
    })
    .returning();

  return res.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_confirm_id: payment.id,
    error: 0,
    error_note: 'Success',
  });
}

async function handleClickComplete(body: any, res: Response) {
  const payment = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, body.merchant_prepare_id))
    .limit(1);

  if (!payment.length) {
    return res.json({ error: -6, error_note: 'Transaction not found' });
  }

  if (body.error === -9) {
    await db
      .update(schema.payments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(schema.payments.id, payment[0].id));
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error: 0,
      error_note: 'Cancelled',
    });
  }

  await db
    .update(schema.payments)
    .set({ status: 'paid', updatedAt: new Date() })
    .where(eq(schema.payments.id, payment[0].id));

  await activateSubscription(payment[0].clientId);

  return res.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    error: 0,
    error_note: 'Success',
  });
}

/* ============ Uzum Merchant API (webhook contract) ============
 *
 * Uzum Bank -> Partner server:
 *   POST /api/payments/uzum/check
 *   POST /api/payments/uzum/create
 *   POST /api/payments/uzum/confirm
 *   POST /api/payments/uzum/reverse
 *   POST /api/payments/uzum/status
 *
 * Auth: Basic (login:password)
 * Amount: tiyin (1 so'm = 100 tiyin)
 * Status values: OK | CREATED | CONFIRMED | REVERSED | FAILED
 */

const UZUM_SERVICE_ID = Number(process.env.UZUM_SERVICE_ID) || 0;

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function validateUzumAuth(req: Request): boolean {
  const loginEnv = process.env.UZUM_MERCHANT_LOGIN;
  const passwordEnv = process.env.UZUM_MERCHANT_PASSWORD;
  if (!loginEnv || !passwordEnv) return false;

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  const parts = decoded.split(':');
  if (parts.length !== 2) return false;
  const [login, password] = parts;

  return safeCompare(login, loginEnv) && safeCompare(password, passwordEnv);
}

function validateUzumTimestamp(timestamp: any): boolean {
  if (typeof timestamp !== 'number' || isNaN(timestamp)) return false;
  const now = Date.now();
  const skew = Math.abs(now - timestamp);
  // Allow up to 5 minutes clock skew/delay
  return skew < 300_000;
}

function makeUzumError(errorCode: string, overrides: Record<string, unknown> = {}) {
  return { status: 'FAILED', errorCode, ...overrides };
}

/* ---- /check ---- */

router.post('/uzum/check', async (req: Request, res: Response) => {
  try {
    if (!validateUzumAuth(req)) {
      return res.json(makeUzumError('AUTH_ERROR', { serviceId: UZUM_SERVICE_ID }));
    }

    const { serviceId, timestamp, params } = req.body;

    if (serviceId !== UZUM_SERVICE_ID) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }
    if (!validateUzumTimestamp(timestamp)) {
      return res.json(makeUzumError('TIMEOUT', { serviceId }));
    }
    if (!params || !params.account) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const clientId = Number(params.account);
    if (isNaN(clientId)) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }

    return res.json({
      serviceId,
      timestamp: Date.now(),
      status: 'OK',
      data: {
        type: { value: 'Client' },
        id: { value: String(clientId) },
        email: { value: client.email },
      },
    });
  } catch (err) {
    logger.error(`Uzum check: ${err instanceof Error ? err.message : err}`);
    return res.json(makeUzumError('INTERNAL_ERROR', { serviceId: req.body?.serviceId || UZUM_SERVICE_ID }));
  }
});

/* ---- /create ---- */

router.post('/uzum/create', async (req: Request, res: Response) => {
  try {
    if (!validateUzumAuth(req)) {
      return res.json(makeUzumError('AUTH_ERROR'));
    }

    const { serviceId, timestamp, transId, params, amount } = req.body;

    if (serviceId !== UZUM_SERVICE_ID) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }
    if (!validateUzumTimestamp(timestamp)) {
      return res.json(makeUzumError('TIMEOUT', { serviceId }));
    }
    if (!transId || !amount || amount <= 0) {
      return res.json(makeUzumError('INVALID_AMOUNT', { serviceId }));
    }
    if (!params || !params.account) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const clientId = Number(params.account);
    if (isNaN(clientId)) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const existing = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, `uzum:${transId}`))
      .limit(1);

    if (existing.length > 0) {
      const p = existing[0];
      if (p.status === 'paid' || p.status === 'pending') {
        return res.json({
          serviceId,
          transId,
          status: p.status === 'paid' ? 'CONFIRMED' : 'CREATED',
          transTime: p.createdAt.getTime(),
          confirmTime: p.status === 'paid' ? p.updatedAt.getTime() : undefined,
          amount: p.amount,
        });
      }
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }

    const amountInSum = amount / 100;
    const allowedAmounts = [50_000, 100_000, 200_000, 500_000];
    if (!allowedAmounts.includes(amountInSum)) {
      return res.json(makeUzumError('INVALID_AMOUNT', { serviceId }));
    }

    const [payment] = await db
      .insert(schema.payments)
      .values({
        clientId,
        provider: 'uzum',
        providerTransactionId: transId,
        amount,
        status: 'pending',
        idempotencyKey: `uzum:${transId}`,
        metadata: { serviceId, timestamp, params },
      })
      .returning();

    return res.json({
      serviceId,
      transId,
      status: 'CREATED',
      transTime: payment.createdAt.getTime(),
      amount: payment.amount,
    });
  } catch (err) {
    logger.error(`Uzum create: ${err instanceof Error ? err.message : err}`);
    return res.json(makeUzumError('INTERNAL_ERROR', { serviceId: req.body?.serviceId || UZUM_SERVICE_ID }));
  }
});

/* ---- /confirm ---- */

router.post('/uzum/confirm', async (req: Request, res: Response) => {
  try {
    if (!validateUzumAuth(req)) {
      return res.json(makeUzumError('AUTH_ERROR'));
    }

    const { serviceId, timestamp, transId } = req.body;

    if (serviceId !== UZUM_SERVICE_ID) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }
    if (!validateUzumTimestamp(timestamp)) {
      return res.json(makeUzumError('TIMEOUT', { serviceId }));
    }
    if (!transId) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, `uzum:${transId}`))
      .limit(1);

    if (!payment) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }

    if (payment.status === 'paid') {
      return res.json({
        serviceId,
        transId,
        status: 'CONFIRMED',
        confirmTime: payment.updatedAt.getTime(),
        amount: payment.amount,
      });
    }

    if (payment.status === 'cancelled' || payment.status === 'refunded') {
      return res.json(makeUzumError('ALREADY_REVERSED', { serviceId }));
    }

    const [updated] = await db
      .update(schema.payments)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id))
      .returning();

    await activateSubscription(payment.clientId);

    return res.json({
      serviceId,
      transId,
      status: 'CONFIRMED',
      confirmTime: updated.updatedAt.getTime(),
      amount: payment.amount,
    });
  } catch (err) {
    logger.error(`Uzum confirm: ${err instanceof Error ? err.message : err}`);
    return res.json(makeUzumError('INTERNAL_ERROR', { serviceId: req.body?.serviceId || UZUM_SERVICE_ID }));
  }
});

/* ---- /reverse ---- */

router.post('/uzum/reverse', async (req: Request, res: Response) => {
  try {
    if (!validateUzumAuth(req)) {
      return res.json(makeUzumError('AUTH_ERROR'));
    }

    const { serviceId, timestamp, transId } = req.body;

    if (serviceId !== UZUM_SERVICE_ID) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }
    if (!validateUzumTimestamp(timestamp)) {
      return res.json(makeUzumError('TIMEOUT', { serviceId }));
    }
    if (!transId) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, `uzum:${transId}`))
      .limit(1);

    if (!payment) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }

    if (payment.status === 'cancelled' || payment.status === 'refunded') {
      return res.json({
        serviceId,
        transId,
        status: 'REVERSED',
        reverseTime: payment.updatedAt.getTime(),
        amount: payment.amount,
      });
    }

    let updatedPayment;
    if (payment.status === 'pending') {
      [updatedPayment] = await db
        .update(schema.payments)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(schema.payments.id, payment.id))
        .returning();
    } else {
      [updatedPayment] = await db
        .update(schema.payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(schema.payments.id, payment.id))
        .returning();
    }

    return res.json({
      serviceId,
      transId,
      status: 'REVERSED',
      reverseTime: updatedPayment.updatedAt.getTime(),
      amount: payment.amount,
    });
  } catch (err) {
    logger.error(`Uzum reverse: ${err instanceof Error ? err.message : err}`);
    return res.json(makeUzumError('INTERNAL_ERROR', { serviceId: req.body?.serviceId || UZUM_SERVICE_ID }));
  }
});

/* ---- /status ---- */

router.post('/uzum/status', async (req: Request, res: Response) => {
  try {
    if (!validateUzumAuth(req)) {
      return res.json(makeUzumError('AUTH_ERROR'));
    }

    const { serviceId, timestamp, transId } = req.body;

    if (serviceId !== UZUM_SERVICE_ID) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }
    if (!validateUzumTimestamp(timestamp)) {
      return res.json(makeUzumError('TIMEOUT', { serviceId }));
    }
    if (!transId) {
      return res.json(makeUzumError('INVALID_PARAMS', { serviceId }));
    }

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, `uzum:${transId}`))
      .limit(1);

    if (!payment) {
      return res.json(makeUzumError('NOT_FOUND', { serviceId }));
    }

    const statusMap: Record<string, 'CREATED' | 'CONFIRMED' | 'REVERSED' | 'FAILED'> = {
      pending: 'CREATED',
      paid: 'CONFIRMED',
      cancelled: 'REVERSED',
      refunded: 'REVERSED',
      failed: 'FAILED',
    };

    return res.json({
      serviceId,
      transId,
      status: statusMap[payment.status] || 'CREATED',
      transTime: payment.createdAt.getTime(),
      confirmTime: payment.status === 'paid' ? payment.updatedAt.getTime() : null,
      reverseTime:
        payment.status === 'cancelled' || payment.status === 'refunded'
          ? payment.updatedAt.getTime()
          : null,
      amount: payment.amount,
    });
  } catch (err) {
    logger.error(`Uzum status: ${err instanceof Error ? err.message : err}`);
    return res.json(makeUzumError('INTERNAL_ERROR', { serviceId: req.body?.serviceId || UZUM_SERVICE_ID }));
  }
});

/* ============ Paynet ============ */

router.post('/paynet', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.transaction_id || !body.client_id || !body.amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const clientId = Number(body.client_id);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }

    const signString = crypto
      .createHash('md5')
      .update(`${body.transaction_id}${process.env.PAYNET_SECRET_KEY}${body.amount}`)
      .digest('hex');

    if (body.sign_string && signString !== body.sign_string) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const existing = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, `paynet:${body.transaction_id}`))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ status: 'ok' });
    }

    const status = body.status === 'success' ? 'paid' : 'pending';
    await db.insert(schema.payments).values({
      clientId,
      provider: 'paynet',
      providerTransactionId: body.transaction_id,
      amount: body.amount,
      status,
      idempotencyKey: `paynet:${body.transaction_id}`,
      metadata: body,
    });

    if (status === 'paid') {
      await activateSubscription(clientId);
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    logger.error(`Paynet: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export { router as paymentRouter };
