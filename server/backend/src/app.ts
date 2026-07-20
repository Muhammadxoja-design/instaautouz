import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webhookRouter } from './routes/webhook.js';
import { paymentRouter } from './routes/payments.js';
import { authRouter } from './routes/auth.js';
import { igAccountRouter } from './routes/igAccounts.js';
import { automationRuleRouter } from './routes/automationRules.js';
import { subscriptionRouter } from './routes/subscriptions.js';
import { adminRouter } from './routes/admin.js';
import { oauthRouter } from './routes/oauth.js';
import { telegramRouter } from './routes/telegram.js';
import { aiRouter } from './routes/ai.js';
import { platformRouter } from './routes/platforms.js';
import { dmRouter } from './routes/dms.js';
import { templateRouter } from './routes/templates.js';
import { analyticsRouter } from './routes/analytics.js';
import { tiktokRouter } from './routes/tiktok.js';
import { contentRouter } from './routes/content.js';
import { integrationsRouter } from './routes/integrations.js';
import { errorHandler } from './middleware/error.js';
import { rawBodyMiddleware } from './middleware/rawBody.js';
import { requestLogger } from './middleware/requestLogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../../public');
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Ko\'p urinishlar. Iltimos 15 daqiqa kutib turing.' } },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  app.use(requestLogger);

  app.use('/api/webhook', rawBodyMiddleware);
  app.use('/api/payments', rawBodyMiddleware);
  app.use('/api', express.json());
  app.use(express.static(publicDir));
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api', apiLimiter);
  app.use('/api/webhook', webhookRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/ig-accounts', igAccountRouter);
  app.use('/api/automation-rules', automationRuleRouter);
  app.use('/api/subscriptions', subscriptionRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/telegram', telegramRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/platforms', platformRouter);
  app.use('/api/dms', dmRouter);
  app.use('/api/templates', templateRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/tiktok', tiktokRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/oauth', oauthRouter);
  app.use('/api/integrations', integrationsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: { message: 'Route not found' } });
  });

  app.use(errorHandler);

  return app;
}
