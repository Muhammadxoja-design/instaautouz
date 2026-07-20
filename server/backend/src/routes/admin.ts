import { Router, type Request, type Response } from 'express';
import db, { schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate, requireAdmin);

// Secret keys — encrypt/decrypt qilinadi
const SECRET_KEYS = new Set([
  'META_APP_SECRET',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET',
  'GEMINI_API_KEY', 'CLAUDE_API_KEY', 'GROQ_API_KEY',
  'WA_ACCESS_TOKEN',
  'SMTP_PASS',
  'PAYME_SECRET_KEY', 'CLICK_SECRET_KEY',
  'UZUM_MERCHANT_PASSWORD',
  'PAYNET_SECRET_KEY',
  'TIKTOK_APP_SECRET', 'TIKTOK_ACCESS_TOKEN',
]);

/* ================================================================ */
/*  CLIENTS                                                           */
/* ================================================================ */

router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const clients = await db
      .select({ id: schema.clients.id, email: schema.clients.email, name: schema.clients.name, role: schema.clients.role, isActive: schema.clients.isActive, createdAt: schema.clients.createdAt })
      .from(schema.clients)
      .orderBy(schema.clients.createdAt);
    return res.json({ clients });
  } catch (err) {
    logger.error(`Admin clients: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.put('/clients/:id', async (req: Request, res: Response) => {
  try {
    const { role, isActive } = req.body || {};
    const clientId = Number(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: { message: 'Invalid client ID' } });
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: { message: 'Invalid role' } });
    }
    const [updated] = await db
      .update(schema.clients)
      .set({ ...(role !== undefined && { role }), ...(isActive !== undefined && { isActive }), updatedAt: new Date() })
      .where(eq(schema.clients.id, clientId))
      .returning({ id: schema.clients.id, email: schema.clients.email, name: schema.clients.name, role: schema.clients.role, isActive: schema.clients.isActive });
    if (!updated) return res.status(404).json({ error: { message: 'Client not found' } });
    return res.json({ client: updated });
  } catch (err) {
    logger.error(`Admin update client: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

/* ================================================================ */
/*  SYSTEM SETTINGS                                                   */
/* ================================================================ */

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.systemSettings);
    const result: Record<string, any> = {};

    for (const row of rows) {
      const val = row.value as any;
      if (SECRET_KEYS.has(row.key) && typeof val === 'string' && val.length > 0) {
        try { result[row.key] = decrypt(val).length > 0 ? '***SET***' : ''; }
        catch { result[row.key] = val.length > 0 ? '***SET***' : ''; }
      } else {
        result[row.key] = val;
      }
    }

    // .env fallback for non-secret keys
    const envDefaults: Record<string, string> = {
      META_APP_ID: process.env.META_APP_ID || '',
      META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || 'v22.0',
      PUBLIC_URL: process.env.PUBLIC_URL || '',
      TELEGRAM_WEBAPP_URL: process.env.TELEGRAM_WEBAPP_URL || '',
      SMTP_HOST: process.env.SMTP_HOST || '',
      SMTP_PORT: process.env.SMTP_PORT || '587',
      SMTP_USER: process.env.SMTP_USER || '',
      EMAIL_FROM: process.env.EMAIL_FROM || '',
      AI_DEFAULT_PROVIDER: process.env.AI_DEFAULT_PROVIDER || 'gemini',
      AI_ENABLED: process.env.AI_ENABLED || 'true',
      WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID || '',
      WA_BUSINESS_ACCOUNT_ID: process.env.WA_BUSINESS_ACCOUNT_ID || '',
      TIKTOK_APP_ID: process.env.TIKTOK_APP_ID || '',
      PAYME_MERCHANT_ID: process.env.PAYME_MERCHANT_ID || '',
      CLICK_MERCHANT_ID: process.env.CLICK_MERCHANT_ID || '',
      UZUM_SERVICE_ID: process.env.UZUM_SERVICE_ID || '',
      UZUM_MERCHANT_LOGIN: process.env.UZUM_MERCHANT_LOGIN || '',
      PAYNET_MERCHANT_ID: process.env.PAYNET_MERCHANT_ID || '',
    };
    for (const [k, v] of Object.entries(envDefaults)) {
      if (!(k in result) && v) result[k] = v;
    }

    return res.json({ settings: result });
  } catch (err) {
    logger.error(`Admin settings get: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: { message: 'settings object required' } });
    }

    for (const [key, rawValue] of Object.entries(settings)) {
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;
      if (rawValue === '***SET***') continue;

      let valueToStore: any = rawValue;
      if (SECRET_KEYS.has(key) && typeof rawValue === 'string' && rawValue.length > 0) {
        valueToStore = encrypt(rawValue);
      }

      await db
        .insert(schema.systemSettings)
        .values({ key, value: valueToStore, description: `Admin updated ${key}` })
        .onConflictDoUpdate({ target: schema.systemSettings.key, set: { value: valueToStore, updatedAt: new Date() } });

    }

    logger.success(`Admin: settings updated (${Object.keys(settings).length} keys)`);
    return res.json({ message: 'Settings saved' });
  } catch (err) {
    logger.error(`Admin settings put: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

/* ================================================================ */
/*  PAYMENT METHODS — CRUD                                            */
/* ================================================================ */

router.get('/payment-methods', async (_req: Request, res: Response) => {
  try {
    const methods = await db.select().from(schema.paymentMethods).orderBy(asc(schema.paymentMethods.sortOrder), asc(schema.paymentMethods.createdAt));
    return res.json({ methods });
  } catch (err) {
    logger.error(`Admin payment-methods: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.post('/payment-methods', async (req: Request, res: Response) => {
  try {
    const { name, requisite, instructions, isActive, sortOrder } = req.body || {};
    if (!name || !requisite) return res.status(400).json({ error: { message: 'name va requisite kerak' } });
    const [method] = await db.insert(schema.paymentMethods).values({ name, requisite, instructions: instructions || null, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 }).returning();
    logger.success(`Admin: payment method added "${name}"`);
    return res.status(201).json({ method });
  } catch (err) {
    logger.error(`Admin payment-methods POST: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.put('/payment-methods/:id', async (req: Request, res: Response) => {
  try {
    const { name, requisite, instructions, isActive, sortOrder } = req.body || {};
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: { message: 'Invalid ID' } });
    const [method] = await db
      .update(schema.paymentMethods)
      .set({ ...(name !== undefined && { name }), ...(requisite !== undefined && { requisite }), ...(instructions !== undefined && { instructions }), ...(isActive !== undefined && { isActive }), ...(sortOrder !== undefined && { sortOrder }), updatedAt: new Date() })
      .where(eq(schema.paymentMethods.id, id))
      .returning();
    if (!method) return res.status(404).json({ error: { message: 'Not found' } });
    return res.json({ method });
  } catch (err) {
    logger.error(`Admin payment-methods PUT: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.delete('/payment-methods/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: { message: 'Invalid ID' } });
    const [deleted] = await db.delete(schema.paymentMethods).where(eq(schema.paymentMethods.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: { message: 'Not found' } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error(`Admin payment-methods DELETE: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

/* ================================================================ */
/*  PLANS — tariffs management                                        */
/* ================================================================ */

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await db.select().from(schema.plans).orderBy(asc(schema.plans.priceUzs));
    return res.json({ plans });
  } catch (err) {
    logger.error(`Admin plans: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.put('/plans/:name', async (req: Request, res: Response) => {
  try {
    const planName = req.params.name;
    const [existing] = await db.select().from(schema.plans).where(eq(schema.plans.name, planName)).limit(1);
    if (!existing) return res.status(404).json({ error: { message: 'Plan not found' } });

    const fields = [
      'displayName','priceUzs','maxIgAccounts','maxRules','maxDmTemplates',
      'maxAiRepliesPerDay','maxScheduledPosts','commentAutoReply','dmAutoReply',
      'aiSmartReply','contentCalendar','analytics','whatsapp','telegramBot','isActive',
    ];
    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates[f] = ['priceUzs','maxIgAccounts','maxRules','maxDmTemplates','maxAiRepliesPerDay','maxScheduledPosts'].includes(f)
          ? Number(req.body[f]) : req.body[f];
      }
    }

    const [updated] = await db.update(schema.plans).set(updates).where(eq(schema.plans.name, planName)).returning();
    logger.success(`Admin: plan "${planName}" updated`);
    return res.json({ plan: updated });
  } catch (err) {
    logger.error(`Admin plans PUT: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

export { router as adminRouter };
