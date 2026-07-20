import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db, { schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { encrypt } from '../utils/crypto.js';
import { exchangeCodeForToken, getInstagramAccount, refreshToken } from '../services/meta.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All Meta permissions selected in the app dashboard
const META_SCOPES = [
  // Instagram
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'instagram_content_publish',
  'instagram_manage_insights',

  // Pages API — Manage everything on your Page
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_posts',
  'pages_manage_engagement',
  'pages_read_user_content',
  'pages_messaging',

  // Marketing API — Create & manage ads, measure performance, ad leads
  'ads_management',
  'ads_read',
  'business_management',
  'leads_retrieval',

  // WhatsApp
  'whatsapp_business_management',
  'whatsapp_business_messaging',

  // Catalog API
  'catalog_management',

  // oEmbed
  'oembed_read',

  // Live Video
  'publish_video',

  // Audience Network
  'audience_network_management',

  // Threads (separate auth but include for completeness)
  'threads_basic',
  'threads_content_publish',
  'threads_manage_replies',
  'threads_read_replies',
  'threads_manage_insights',

  // Fundraisers
  'fundraiser_contributions',

  // App Ads Manager
  'attribution_read',
];

router.get('/facebook', (req: Request, res: Response) => {
  try {
    const clientId = process.env.META_APP_ID || '';
    if (!clientId) return res.status(500).json({ error: { message: 'META_APP_ID not configured' } });
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/facebook/callback`;
    const scope = META_SCOPES.join(',');

    const url = `https://www.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v22.0'}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;

    return res.redirect(url);
  } catch (err) {
    logger.error(`OAuth facebook: ${err}`);
    return res.status(500).send('OAuth failed');
  }
});

router.get('/facebook/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/facebook/callback`;
    const tokenData = await exchangeCodeForToken(code as string, redirectUri);
    const longTokenData = await refreshToken(tokenData.access_token);
    const igAccount = await getInstagramAccount(longTokenData.access_token);

    const clientId = Number(state);
    if (!clientId) {
      return res.status(400).send('Client ID required in state parameter');
    }

    const tokenExpiresAt = new Date(Date.now() + longTokenData.expires_in * 1000);

    const existing = await db
      .select()
      .from(schema.igAccounts)
      .where(eq(schema.igAccounts.igUserId, igAccount.igUserId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.igAccounts)
        .set({
          clientId,
          accessToken: encrypt(longTokenData.access_token),
          igUsername: igAccount.igUsername,
          tokenExpiresAt,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.igAccounts.igUserId, igAccount.igUserId));
    } else {
      await db.insert(schema.igAccounts).values({
        clientId,
        igUserId: igAccount.igUserId,
        igUsername: igAccount.igUsername,
        accessToken: encrypt(longTokenData.access_token),
        tokenExpiresAt,
      });
    }

    logger.success(`Facebook connected: IG user ${igAccount.igUsername} (${igAccount.igUserId})`);
    return res.redirect('/dashboard');
  } catch (err) {
    logger.error(`OAuth callback error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).send('OAuth failed: ' + (err as Error).message);
  }
});

router.get('/url', authenticate, (req: Request, res: Response) => {
  try {
    const clientId = process.env.META_APP_ID || '';
    if (!clientId) return res.status(500).json({ error: { message: 'META_APP_ID not configured' } });
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/facebook/callback`;
    const scope = META_SCOPES.join(',');

    const url = `https://www.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v22.0'}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${req.client!.clientId}`;

    return res.json({ url });
  } catch (err) {
    logger.error(`OAuth url: ${err}`);
    return res.status(500).json({ error: { message: 'Internal error' } });
  }
});

router.get('/google', (req: Request, res: Response) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) return res.status(500).send('GOOGLE_CLIENT_ID not configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
    const scope = 'openid email profile';
    const state = (req.query.redirect_to as string) || '/dashboard';

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&access_type=online`;

    return res.redirect(url);
  } catch (err) {
    logger.error(`OAuth google: ${err}`);
    return res.status(500).send('OAuth failed');
  }
});

router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as Record<string, string>;
    if (!tokenData.id_token) {
      return res.status(400).send('Failed to get Google token');
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = (await userInfoRes.json()) as Record<string, string>;

    if (!userInfo.email) {
      return res.status(400).send('Google email not available');
    }

    let [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.email, userInfo.email))
      .limit(1);

    if (!client) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const [newClient] = await db.insert(schema.clients).values({
        email: userInfo.email,
        passwordHash: hashPassword(randomPassword),
        name: userInfo.name || (userInfo.email as string).split('@')[0],
      }).returning();
      client = newClient;
    }

    const token = jwt.sign(
      { clientId: client!.id, role: client!.role, email: client!.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    const callbackUrl = new URL('/auth/callback', process.env.CLIENT_URL || 'http://localhost:5173');
    callbackUrl.searchParams.set('token', token);
    callbackUrl.searchParams.set('redirect_to', (state as string) || '/dashboard');
    return res.redirect(callbackUrl.toString());
  } catch (err) {
    logger.error(`Google OAuth error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).send('Google OAuth failed');
  }
});

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { id, first_name, last_name, username, auth_date, hash } = req.body;
    if (!id || !hash) {
      return res.status(400).json({ error: { message: 'Invalid Telegram data' } });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!botToken) {
      return res.status(500).json({ error: { message: 'TELEGRAM_BOT_TOKEN not configured' } });
    }

    // Verify Telegram hash
    const checkString = [
      `auth_date=${auth_date}`,
      `first_name=${first_name || ''}`,
      `id=${id}`,
      ...(last_name ? [`last_name=${last_name}`] : []),
      ...(username ? [`username=${username}`] : []),
    ].sort().join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (calculatedHash !== hash) {
      return res.status(401).json({ error: { message: 'Telegram data verification failed' } });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - Number(auth_date) > 86400) {
      return res.status(400).json({ error: { message: 'Telegram auth expired' } });
    }

    // Find or create client by Telegram ID
    let [telegramUser] = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, String(id)))
      .limit(1);

    if (telegramUser) {
      // Existing Telegram user -> login
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, telegramUser.clientId))
        .limit(1);

      if (!client) {
        return res.status(404).json({ error: { message: 'User not found' } });
      }

      const token = jwt.sign(
        { clientId: client.id, role: client.role, email: client.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' },
      );

      return res.json({
        token,
        client: { id: client.id, email: client.email, name: client.name, role: client.role },
      });
    }

    // New Telegram user -> create client + link
    const email = `tg_${id}@telegram.local`;
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const result = await db.insert(schema.clients).values({
      email,
      passwordHash: hashPassword(randomPassword),
      name: [first_name, last_name].filter(Boolean).join(' ') || `Telegram User`,
    }).returning({ id: schema.clients.id });

    const newClient = result[0];

    await db.insert(schema.telegramUsers).values({
      clientId: newClient.id,
      telegramId: String(id),
      telegramUsername: username || null,
      chatId: String(id),
    });

    const token = jwt.sign(
      { clientId: newClient.id, role: 'user', email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    return res.json({
      token,
      client: { id: newClient.id, email, name: [first_name, last_name].filter(Boolean).join(' ') || 'Telegram User', role: 'user' },
    });
  } catch (err) {
    logger.error(`Telegram OAuth error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

export { router as oauthRouter };
