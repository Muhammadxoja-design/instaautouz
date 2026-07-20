import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getHandler } from '../services/platform.js';
import { sendMessage as igSendMessage, syncMessages } from '../services/instagram-dm.js';
import { renderTemplate } from '../services/templates.js';
import { generateSmartReply } from '../services/ai.js';
import { sendNotification } from '../services/telegram.js';
import db, { schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

/* ================================================================ */
/*  CONVERSATIONS                                                      */
/* ================================================================ */

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string | undefined;
    const conditions = [eq(schema.dmConversations.clientId, req.client!.clientId)];
    if (platform) conditions.push(eq(schema.dmConversations.platform, platform as any));

    const conversations = await db
      .select()
      .from(schema.dmConversations)
      .where(and(...conditions))
      .orderBy(desc(schema.dmConversations.lastMessageAt));

    res.json({ conversations });
  } catch (err) {
    logger.error(`DMs conversations GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch conversations' } });
  }
});

router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const messages = await db
      .select()
      .from(schema.dmMessages)
      .where(
        and(
          eq(schema.dmMessages.conversationId, Number(req.params.id)),
          eq(schema.dmMessages.clientId, req.client!.clientId),
        ),
      )
      .orderBy(desc(schema.dmMessages.createdAt))
      .limit(limit);

    res.json({ messages: messages.reverse() });
  } catch (err) {
    logger.error(`DMs messages GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch messages' } });
  }
});

/* ================================================================ */
/*  SEND MESSAGE                                                       */
/* ================================================================ */

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { conversationId, content, platform, recipientId, templateId } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: { message: 'conversationId and content required' } });
    }

    const [conv] = await db
      .select()
      .from(schema.dmConversations)
      .where(
        and(
          eq(schema.dmConversations.id, conversationId),
          eq(schema.dmConversations.clientId, req.client!.clientId),
        ),
      )
      .limit(1);

    if (!conv) return res.status(404).json({ error: { message: 'Conversation not found' } });

    const p = platform || conv.platform;
    const handler = getHandler(p as any);
    if (!handler) return res.status(400).json({ error: { message: `No handler for ${p}` } });

    const [account] = await db
      .select()
      .from(schema.socialAccounts)
      .where(
        and(
          eq(schema.socialAccounts.clientId, req.client!.clientId),
          eq(schema.socialAccounts.platform, p as any),
          eq(schema.socialAccounts.isActive, true),
        ),
      )
      .limit(1);

    if (!account) return res.status(400).json({ error: { message: `No active ${p} account` } });

    let finalContent = content;

    if (templateId) {
      const tmpl = await db
        .select()
        .from(schema.dmTemplates)
        .where(
          and(eq(schema.dmTemplates.id, templateId), eq(schema.dmTemplates.clientId, req.client!.clientId)),
        )
        .limit(1);

      if (tmpl.length > 0) {
        finalContent = renderTemplate(tmpl[0].content, {
          recipient_name: conv.participantName || '',
          platform_name: p.toUpperCase(),
        });
      }
    }

    const recipient = conv.platformConversationId
      ? conv.participantId
      : recipientId || conv.participantId;

    await handler.sendMessage(account as any, recipient, finalContent);

    await db.insert(schema.dmMessages).values({
      conversationId,
      clientId: req.client!.clientId,
      platform: p,
      direction: 'outgoing',
      content: finalContent,
    });

    await db
      .update(schema.dmConversations)
      .set({ lastMessage: finalContent, lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.dmConversations.id, conversationId));

    res.json({ ok: true });
  } catch (err) {
    logger.error(`DMs send POST: ${err}`);
    res.status(500).json({ error: { message: 'Failed to send message' } });
  }
});

/* ================================================================ */
/*  AI SMART REPLY FOR DM                                              */
/* ================================================================ */

router.post('/ai-reply', async (req: Request, res: Response) => {
  try {
    const { conversationId, messageText } = req.body;
    if (!conversationId || !messageText) {
      return res.status(400).json({ error: { message: 'conversationId and messageText required' } });
    }

    const reply = await generateSmartReply(req.client!.clientId, messageText, 'user');
    res.json({ reply, generated: !!reply });
  } catch (err) {
    logger.error(`DMs AI reply POST: ${err}`);
    res.status(500).json({ error: { message: 'AI reply failed' } });
  }
});

/* ================================================================ */
/*  ARCHIVE / DELETE                                                    */
/* ================================================================ */

router.put('/conversations/:id/archive', async (req: Request, res: Response) => {
  try {
    await db
      .update(schema.dmConversations)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.dmConversations.id, Number(req.params.id)),
          eq(schema.dmConversations.clientId, req.client!.clientId),
        ),
      );
    res.json({ ok: true });
  } catch (err) {
    logger.error(`DMs archive PUT: ${err}`);
    res.status(500).json({ error: { message: 'Failed to archive' } });
  }
});

export { router as dmRouter };
