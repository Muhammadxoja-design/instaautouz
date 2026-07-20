import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db, { schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { authenticate } from '../middleware/auth.js';
import { sendOtpEmail } from '../utils/email.js';
import { getBot } from '../services/telegram.js';
import { logger } from '../utils/logger.js';

const router = Router();

const otpStore = new Map<string, { code: string; expiresAt: Date }>();
const twoFactorStore = new Map<string, { code: string; clientId: number; expiresAt: Date }>();

setInterval(() => {
  const now = new Date();
  for (const [key, val] of otpStore) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
  for (const [key, val] of twoFactorStore) {
    if (val.expiresAt < now) twoFactorStore.delete(key);
  }
}, 60_000);

async function generateAndSendOtp(email: string): Promise<string> {
  const code = crypto.randomInt(100000, 999999).toString();
  otpStore.set(email, { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  await sendOtpEmail(email, code);
  return code;
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password required' } });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: { message: 'Password must be at least 6 characters' } });
    }

    const existing = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.email, email))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: { message: 'Email already registered' } });
    }

    await db.insert(schema.clients).values({
      email,
      passwordHash: hashPassword(password),
      name: name || email.split('@')[0],
    });

    await generateAndSendOtp(email);

    logger.success(`User registered: ${email}`);
    return res.status(201).json({ message: 'User created. Verify OTP.' });
  } catch (err) {
    logger.error(`Register error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password required' } });
    }

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.email, email))
      .limit(1);

    if (!client || !verifyPassword(password, client.passwordHash)) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    if (!client.isActive) {
      return res.status(403).json({ error: { message: 'Account is disabled' } });
    }

    if (client.twoFactorEnabled) {
      const code = crypto.randomInt(100000, 999999).toString();
      twoFactorStore.set(client.id.toString(), {
        code,
        clientId: client.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const [telegramUser] = await db
        .select()
        .from(schema.telegramUsers)
        .where(and(eq(schema.telegramUsers.clientId, client.id), eq(schema.telegramUsers.isActive, true)))
        .limit(1);

      if (telegramUser) {
        try {
          const bot = getBot();
          await bot.api.sendMessage(telegramUser.chatId,
            `🔐 <b>2FA kodi:</b> ${code}\n\nKod 5 daqiqa amal qiladi.`,
            { parse_mode: 'HTML' },
          );
        } catch (e) {
          logger.warn(`2FA telegram send failed for ${email}: ${e instanceof Error ? e.message : e}`);
        }
      }

      logger.info(`2FA required: ${email}`);
      return res.json({ requiresTwoFactor: true, clientId: client.id });
    }

    const token = jwt.sign(
      { clientId: client.id, role: client.role, email: client.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    logger.success(`Login: ${email}`);
    return res.json({
      token,
      client: { id: client.id, email: client.email, name: client.name, role: client.role },
    });
  } catch (err) {
    logger.error(`Login error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { clientId, code } = req.body;
    if (!clientId || !code) {
      return res.status(400).json({ error: { message: 'clientId and code required' } });
    }

    const stored = twoFactorStore.get(clientId.toString());
    if (!stored) {
      return res.status(400).json({ error: { message: 'No 2FA code sent. Please login again.' } });
    }

    if (new Date() > stored.expiresAt) {
      twoFactorStore.delete(clientId.toString());
      return res.status(400).json({ error: { message: '2FA code expired. Please login again.' } });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: { message: 'Invalid 2FA code' } });
    }

    twoFactorStore.delete(clientId.toString());

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const token = jwt.sign(
      { clientId: client.id, role: client.role, email: client.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    logger.success(`2FA verified: ${client.email}`);
    return res.json({
      token,
      client: { id: client.id, email: client.email, name: client.name, role: client.role },
    });
  } catch (err) {
    logger.error(`Verify-2FA error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/toggle-2fa', authenticate, async (req: Request, res: Response) => {
  try {
    const clientId = req.client!.clientId;
    const { enabled } = req.body;

    if (enabled) {
      const [telegramUser] = await db
        .select()
        .from(schema.telegramUsers)
        .where(and(eq(schema.telegramUsers.clientId, clientId), eq(schema.telegramUsers.isActive, true)))
        .limit(1);

      if (!telegramUser) {
        return res.status(400).json({
          error: { message: '2FA yoqish uchun avval Telegram hisobingizni ulang. Bot orqali /link buyrug\'idan foydalaning.' },
        });
      }
    }

    await db.update(schema.clients)
      .set({ twoFactorEnabled: enabled, updatedAt: new Date() })
      .where(eq(schema.clients.id, clientId));

    const status = enabled ? 'enabled' : 'disabled';
    logger.success(`2FA ${status} for client ${clientId}`);
    return res.json({ message: `2FA ${status}`, twoFactorEnabled: enabled });
  } catch (err) {
    logger.error(`Toggle-2FA error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const clientId = req.client!.clientId;
    const [client] = await db
      .select({ twoFactorEnabled: schema.clients.twoFactorEnabled })
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    const [telegramUser] = await db
      .select()
      .from(schema.telegramUsers)
      .where(and(eq(schema.telegramUsers.clientId, clientId), eq(schema.telegramUsers.isActive, true)))
      .limit(1);

    return res.json({
      twoFactorEnabled: client?.twoFactorEnabled ?? false,
      telegramLinked: !!telegramUser,
      telegramUsername: telegramUser?.telegramUsername || null,
    });
  } catch (err) {
    logger.error(`Auth status error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: { message: 'Email and code required' } });
    }

    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({ error: { message: 'No OTP sent to this email' } });
    }

    if (new Date() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: { message: 'OTP expired. Request a new one.' } });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: { message: 'Invalid OTP code' } });
    }

    otpStore.delete(email);

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.email, email))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const token = jwt.sign(
      { clientId: client.id, role: client.role, email: client.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    logger.success(`OTP verified: ${email}`);
    return res.json({
      access_token: token,
      client: { id: client.id, email: client.email, name: client.name, role: client.role },
    });
  } catch (err) {
    logger.error(`Verify-OTP error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: 'Email required' } });
    }

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.email, email))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    await generateAndSendOtp(email);

    logger.info(`OTP resent: ${email}`);
    return res.json({ message: 'OTP resent' });
  } catch (err) {
    logger.error(`Resend-OTP error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: 'Email required' } });
    }

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.email, email))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    otpStore.set(`reset:${email}`, { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtpEmail(email, code);

    logger.info(`Reset code sent: ${email}`);
    return res.json({ message: 'Reset code sent' });
  } catch (err) {
    logger.error(`Forgot-password error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ error: { message: 'Email, code, and password required' } });
    }

    const stored = otpStore.get(`reset:${email}`);
    if (!stored) {
      return res.status(400).json({ error: { message: 'No reset request found' } });
    }

    if (new Date() > stored.expiresAt) {
      otpStore.delete(`reset:${email}`);
      return res.status(400).json({ error: { message: 'Code expired' } });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: { message: 'Invalid code' } });
    }

    otpStore.delete(`reset:${email}`);

    await db
      .update(schema.clients)
      .set({ passwordHash: hashPassword(password), updatedAt: new Date() })
      .where(eq(schema.clients.email, email));

    logger.success(`Password reset: ${email}`);
    return res.json({ message: 'Password updated' });
  } catch (err) {
    logger.error(`Reset-password error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    const clientId = req.client!.clientId;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    updates.updatedAt = new Date();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { message: 'Nothing to update' } });
    }

    await db.update(schema.clients).set(updates).where(eq(schema.clients.id, clientId));

    const [client] = await db
      .select({
        id: schema.clients.id,
        email: schema.clients.email,
        name: schema.clients.name,
        role: schema.clients.role,
        isActive: schema.clients.isActive,
        createdAt: schema.clients.createdAt,
      })
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    logger.success(`Profile updated: ${client!.email}`);
    return res.json({ client });
  } catch (err) {
    logger.error(`Profile update error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.put('/password', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const clientId = req.client!.clientId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: { message: 'Current and new password required' } });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: { message: 'New password must be at least 6 characters' } });
    }

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (!client || !verifyPassword(currentPassword, client.passwordHash)) {
      return res.status(401).json({ error: { message: 'Current password is incorrect' } });
    }

    await db
      .update(schema.clients)
      .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(schema.clients.id, clientId));

    logger.success(`Password changed: ${client.email}`);
    return res.json({ message: 'Password updated' });
  } catch (err) {
    logger.error(`Password change error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const [client] = await db
      .select({
        id: schema.clients.id,
        email: schema.clients.email,
        name: schema.clients.name,
        role: schema.clients.role,
        isActive: schema.clients.isActive,
        twoFactorEnabled: schema.clients.twoFactorEnabled,
        createdAt: schema.clients.createdAt,
      })
      .from(schema.clients)
      .where(eq(schema.clients.id, req.client!.clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: { message: 'Client not found' } });
    }

    return res.json({ client });
  } catch (err) {
    logger.error(`GET /me error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

export { router as authRouter };
