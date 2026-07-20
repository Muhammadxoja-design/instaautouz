import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { chatWithAI, generateSmartReply, getAvailableProviders } from '../services/ai.js';
import {
  addKnowledge,
  getKnowledge,
  deleteKnowledge,
  fetchLinkContent,
  getOrCreateSettings,
  updateSettings,
} from '../services/knowledge.js';
import db, { schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

/* ================================================================ */
/*  KNOWLEDGE                                                         */
/* ================================================================ */

router.get('/knowledge', async (req: Request, res: Response) => {
  try {
    const entries = await getKnowledge(req.client!.clientId);
    res.json({ entries });
  } catch (err) {
    logger.error(`AI /knowledge GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch knowledge' } });
  }
});

router.post('/knowledge', async (req: Request, res: Response) => {
  try {
    const { content, sourceType, sourceName } = req.body;

    if (!content) {
      return res.status(400).json({ error: { message: 'content required' } });
    }

    let finalContent = content;
    const type = sourceType || 'text';

    if (type === 'link') {
      finalContent = await fetchLinkContent(content);
    }

    const entry = await addKnowledge(req.client!.clientId, finalContent, type, sourceName);
    res.status(201).json({ entry });
  } catch (err) {
    logger.error(`AI /knowledge POST: ${err}`);
    res.status(500).json({ error: { message: 'Failed to add knowledge' } });
  }
});

router.delete('/knowledge/:id', async (req: Request, res: Response) => {
  try {
    const result = await deleteKnowledge(Number(req.params.id), req.client!.clientId);
    if (!result) {
      return res.status(404).json({ error: { message: 'Knowledge entry not found' } });
    }
    res.json({ message: 'Knowledge deleted' });
  } catch (err) {
    logger.error(`AI /knowledge DELETE: ${err}`);
    res.status(500).json({ error: { message: 'Failed to delete knowledge' } });
  }
});

/* ================================================================ */
/*  CHAT                                                               */
/* ================================================================ */

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, provider } = req.body;

    if (!message) {
      return res.status(400).json({ error: { message: 'message required' } });
    }

    const reply = await chatWithAI(req.client!.clientId, message, provider);
    res.json({ reply });
  } catch (err) {
    logger.error(`AI /chat: ${err}`);
    res.status(500).json({ error: { message: 'AI chat failed' } });
  }
});

/* ================================================================ */
/*  CAPTION GENERATOR                                                   */
/* ================================================================ */

router.post('/generate-caption', async (req: Request, res: Response) => {
  try {
    const { topic, tone, platform } = req.body;
    if (!topic) {
      return res.status(400).json({ error: { message: 'topic required' } });
    }

    const prompt = [
      `Sen Instagram caption yozuvchisisiz.`,
      `Mavzu: ${topic}`,
      `Uslub: ${tone || 'professional'}`,
      `Platforma: ${platform || 'Instagram'}`,
      '',
      '3 xil variantda caption yoz. Har bir variant yangi qatordan boshlansin va "---" bilan ajratilsin.',
      'Captionlar qisqa, ta\'sirli va O\'zbek tilida bo\'lsin.',
      'Har bir caption 2-3 jumladan oshmasin.',
      'Emoji ishlatishingiz mumkin.',
    ].join('\n');

    const reply = await chatWithAI(req.client!.clientId, prompt);
    const captions = reply.split('---').map((c) => c.trim()).filter(Boolean);
    res.json({ captions: captions.length > 0 ? captions : [reply] });
  } catch (err) {
    logger.error(`AI /generate-caption: ${err}`);
    res.status(500).json({ error: { message: 'Failed to generate caption' } });
  }
});

/* ================================================================ */
/*  HASHTAG GENERATOR                                                  */
/* ================================================================ */

router.post('/generate-hashtags', async (req: Request, res: Response) => {
  try {
    const { caption, count } = req.body;
    if (!caption) {
      return res.status(400).json({ error: { message: 'caption required' } });
    }

    const prompt = [
      `Berilgan caption uchun eng mos hashtaglarni yoz.`,
      `Caption: ${caption}`,
      `Jami: ${count || 15} ta hashtag`,
      '',
      'Hashtaglarni vergul bilan ajratib yoz, boshiga # qo\'yib.',
      'O\'zbek va rus tillaridagi hashtaglardan foydalan.',
      'Mashhur va kam raqobatli hashtaglarni tanla.',
      'Hashtaglar mavzuga mos bo\'lsin.',
    ].join('\n');

    const reply = await chatWithAI(req.client!.clientId, prompt);
    const hashtags = reply.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean);
    res.json({ hashtags });
  } catch (err) {
    logger.error(`AI /generate-hashtags: ${err}`);
    res.status(500).json({ error: { message: 'Failed to generate hashtags' } });
  }
});

/* ================================================================ */
/*  SMART REPLY                                                        */
/* ================================================================ */

router.post('/smart-reply', async (req: Request, res: Response) => {
  try {
    const { commentText, commentUsername, igAccountId } = req.body;

    if (!commentText) {
      return res.status(400).json({ error: { message: 'commentText required' } });
    }

    const clientId = req.client!.clientId;
    let reply: string | null = null;

    if (igAccountId) {
      const [account] = await db
        .select()
        .from(schema.igAccounts)
        .where(and(eq(schema.igAccounts.id, igAccountId), eq(schema.igAccounts.clientId, clientId)))
        .limit(1);

      if (account) {
        reply = await generateSmartReply(clientId, commentText, commentUsername || 'user');
      }
    } else {
      reply = await generateSmartReply(clientId, commentText, commentUsername || 'user');
    }

    res.json({ reply, generated: !!reply });
  } catch (err) {
    logger.error(`AI /smart-reply: ${err}`);
    res.status(500).json({ error: { message: 'Smart reply failed' } });
  }
});

/* ================================================================ */
/*  SETTINGS                                                           */
/* ================================================================ */

router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings(req.client!.clientId);
    const availableProviders = getAvailableProviders();
    res.json({ settings, availableProviders });
  } catch (err) {
    logger.error(`AI /settings GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get settings' } });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { provider, smartReplyEnabled, contextCount, systemPrompt } = req.body;
    const updated = await updateSettings(req.client!.clientId, {
      provider,
      smartReplyEnabled,
      contextCount,
      systemPrompt,
    });
    res.json({ settings: updated });
  } catch (err) {
    logger.error(`AI /settings PUT: ${err}`);
    res.status(500).json({ error: { message: 'Failed to update settings' } });
  }
});

/* ================================================================ */
/*  CONVERSATIONS                                                      */
/* ================================================================ */

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const contextType = (req.query.contextType as string) || undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const conditions = [eq(schema.aiConversations.clientId, req.client!.clientId)];
    if (contextType) {
      conditions.push(eq(schema.aiConversations.contextType, contextType));
    }

    const conversations = await db
      .select()
      .from(schema.aiConversations)
      .where(and(...conditions))
      .orderBy(desc(schema.aiConversations.createdAt))
      .limit(limit);

    res.json({ conversations });
  } catch (err) {
    logger.error(`AI /conversations GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch conversations' } });
  }
});

router.delete('/conversations', async (req: Request, res: Response) => {
  try {
    await db
      .delete(schema.aiConversations)
      .where(eq(schema.aiConversations.clientId, req.client!.clientId));

    res.json({ message: 'Conversations cleared' });
  } catch (err) {
    logger.error(`AI /conversations DELETE: ${err}`);
    res.status(500).json({ error: { message: 'Failed to clear conversations' } });
  }
});

export { router as aiRouter };
