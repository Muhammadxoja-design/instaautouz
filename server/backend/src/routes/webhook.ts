import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { fetchComment, replyToComment, getDecryptedToken } from '../services/meta.js';
import { sendMessage as igSendDm } from '../services/instagram-dm.js';
import { sendMessage as waSendMessage } from '../services/whatsapp.js';
import { decrypt } from '../utils/crypto.js';
import { sendNotification } from '../services/telegram.js';
import { generateSmartReply } from '../services/ai.js';
import { getTemplates, renderTemplate } from '../services/templates.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/meta', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    logger.success('Webhook verified by Meta');
    return res.status(200).type('text/plain').send(challenge as string);
  }
  logger.warn(`Webhook verify failed: mode=${mode}`);
  return res.status(403).send('Verification failed');
});

router.post('/meta', (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Hub-Signature-256' });
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(401).json({ error: 'Missing raw body' });
    }

    const expectedSig = crypto
      .createHmac('sha256', process.env.META_APP_SECRET!)
      .update(rawBody)
      .digest('hex');

    if (signature !== `sha256=${expectedSig}`) {
      logger.warn('Webhook: invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const body = JSON.parse(rawBody.toString('utf8'));
    logger.info(`Webhook received: ${body.entry?.length || 0} entries`);

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const field = change.field;
        const value = change.value;
        const id = value?.comment_id || value?.id || value?.message_id || Date.now();
        const eventId = `${field}:${entry.id}:${id}`;

        db.insert(schema.triggeredEvents)
          .values({ eventId, eventType: field, status: 'queued', payload: { entry, change } })
          .onConflictDoNothing()
          .then(() => {
            if (field === 'comments') {
              setImmediate(() => handleCommentEvent(eventId, change).catch((err) => logger.error(`Webhook comment handler: ${err}`)));
            } else if (change.value?.messaging_product === 'whatsapp') {
              setImmediate(() => handleWhatsAppEvent(eventId, change).catch((err) => logger.error(`Webhook whatsapp handler: ${err}`)));
            } else if (field === 'messages' || field === 'conversations') {
              setImmediate(() => handleDmEvent(eventId, change, entry).catch((err) => logger.error(`Webhook DM handler: ${err}`)));
            }
          })
          .catch((err) => logger.error(`Webhook DB insert error: ${err}`));
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error(`Webhook POST /meta error: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleCommentEvent(eventId: string, change: any) {
  if (change.field !== 'comments' || !change.value?.comment_id) return;

  const commentId = change.value.comment_id;
  const accounts = await db
    .select()
    .from(schema.igAccounts)
    .where(eq(schema.igAccounts.isActive, true));

  for (const acc of accounts) {
    try {
      const token = await getDecryptedToken(acc.id);
      const comment = await fetchComment(commentId, token);

      if (!comment?.text) continue;

      const rules = await db
        .select()
        .from(schema.automationRules)
        .where(
          and(
            eq(schema.automationRules.igAccountId, acc.id),
            eq(schema.automationRules.isActive, true),
          ),
        );

      let processed = false;
      for (const rule of rules) {
        const matchedKeyword = rule.keywords.find((kw) =>
          comment.text.toLowerCase().includes(kw.toLowerCase()),
        );
        if (!matchedKeyword) continue;

        const message = rule.replyTemplate
          ? rule.replyTemplate
              .replace(/{keyword}/g, matchedKeyword)
              .replace(/{username}/g, comment.from?.username || '')
          : `Salom! Siz "${matchedKeyword}" haqida so'radingiz. Batafsil DM yuboring.`;

        await replyToComment(commentId, message, token);
        logger.success(`Webhook: Replied to ${commentId} on account ${acc.igUsername}: keyword="${matchedKeyword}"`);

        await db
          .update(schema.triggeredEvents)
          .set({ status: 'processed', igAccountId: acc.id, clientId: acc.clientId, payload: { comment, ruleId: rule.id, matchedKeyword, reply: message } })
          .where(eq(schema.triggeredEvents.eventId, eventId));

        processed = true;
        break;
      }

      if (processed) return;

      /* AI smart reply fallback */
      const aiReply = await generateSmartReply(acc.clientId, comment.text, comment.from?.username || '');
      if (aiReply) {
        await replyToComment(commentId, aiReply, token);
        logger.success(`Webhook: AI replied to ${commentId} on account ${acc.igUsername}`);

        await db
          .update(schema.triggeredEvents)
          .set({ status: 'processed', igAccountId: acc.id, clientId: acc.clientId, payload: { comment, aiReply } })
          .where(eq(schema.triggeredEvents.eventId, eventId));

        await sendNotification(acc.clientId, `🤖 AI avtomatik javob berdi:\n\n${aiReply}`).catch(() => {});
        return;
      }
    } catch (err) {
      logger.error(`Webhook: Error processing account ${acc.igUsername} (${acc.id}): ${err instanceof Error ? err.message : err}`);
    }
  }
}

/* ================================================================ */
/*  DM EVENT HANDLER — Instagram Messages webhook                    */
/* ================================================================ */

async function handleDmEvent(eventId: string, change: any, _entry: any) {
  try {
    const value = change.value;
    const messageId = value?.message_id;
    const fromId = value?.from?.id;
    const messageText = value?.message?.text || '';
    if (!messageId || !fromId) return;

    // DM webhook: lookup by the recipient (business) IG user ID from entry, not sender
    const recipientId = value?.recipient?.id || value?.to?.id || _entry?.id;
    if (!recipientId) return;

    const [account] = await db
      .select()
      .from(schema.igAccounts)
      .where(and(eq(schema.igAccounts.igUserId, recipientId), eq(schema.igAccounts.isActive, true)))
      .limit(1);

    if (!account) return;

  /* Find or create conversation */
  let [conv] = await db
    .select()
    .from(schema.dmConversations)
    .where(eq(schema.dmConversations.participantId, fromId))
    .limit(1);

  if (!conv) {
    const [created] = await db
      .insert(schema.dmConversations)
      .values({
        clientId: account.clientId,
        platform: 'ig',
        participantId: fromId,
        participantName: value.from?.username || fromId,
        unreadCount: 1,
      })
      .returning();
    conv = created;
  } else {
    await db
      .update(schema.dmConversations)
      .set({ unreadCount: (conv.unreadCount || 0) + 1, lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.dmConversations.id, conv.id));
  }

  await db.insert(schema.dmMessages).values({
    conversationId: conv.id,
    clientId: account.clientId,
    platform: 'ig',
    platformMessageId: messageId,
    direction: 'incoming',
    content: messageText || '(media)',
  });

  await db
    .update(schema.triggeredEvents)
    .set({ status: 'processed', payload: { messageId, fromId, text: messageText } })
    .where(eq(schema.triggeredEvents.eventId, eventId));

  /* Try AI auto-reply */
  if (messageText) {
    const aiReply = await generateSmartReply(account.clientId, messageText, value.from?.username || 'user');
    if (aiReply) {
      const token = decrypt(account.accessToken);
      await igSendDm(account.igUserId, fromId, aiReply, token);
      await sendNotification(account.clientId, `🤖 AI DM javob berdi:\n\n${aiReply}`).catch(() => {});
      logger.success(`Webhook: AI replied to DM from ${fromId}`);
    }

    /* Try keyword template match */
    if (!aiReply) {
      const templates = await getTemplates(account.clientId, 'ig');
      for (const tmpl of templates) {
        if (tmpl.keywords?.length) {
          const match = tmpl.keywords.find((kw: string) =>
            messageText.toLowerCase().includes(kw.toLowerCase()),
          );
          if (match) {
            const token = decrypt(account.accessToken);
            const reply = renderTemplate(tmpl.content, {
              recipient_name: value.from?.username || '',
              keyword: match,
            });
            await igSendDm(account.igUserId, fromId, reply, token);
            logger.success(`Webhook: Template DM reply to ${fromId}: "${tmpl.name}"`);
            break;
          }
        }
      }
    }
  }
  } catch (err) {
    logger.error(`Webhook DM handler error: ${err instanceof Error ? err.message : err}`);
  }
}

/* ================================================================ */
/*  WHATSAPP WEBHOOK HANDLER — incoming messages via Meta webhook    */
/* ================================================================ */

async function handleWhatsAppEvent(eventId: string, change: any) {
  try {
    const value = change.value;
    if (value.messaging_product !== 'whatsapp') return;

    const messages = value.messages;
    if (!messages?.length) return;

    for (const msg of messages) {
      const from = msg.from;
      const msgId = msg.id;
      const text = msg.text?.body || '';
      const timestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

      /* Find linked WhatsApp social account */
      const accounts = await db
        .select()
        .from(schema.socialAccounts)
        .where(and(eq(schema.socialAccounts.platform, 'wa'), eq(schema.socialAccounts.isActive, true)));

      for (const acc of accounts) {
        /* Find or create conversation */
        let [conv] = await db
          .select()
          .from(schema.dmConversations)
          .where(
            and(
              eq(schema.dmConversations.clientId, acc.clientId),
              eq(schema.dmConversations.platform, 'wa'),
              eq(schema.dmConversations.participantId, from),
            ),
          )
          .limit(1);

        if (!conv) {
          const contact = value.contacts?.[0];
          const [created] = await db
            .insert(schema.dmConversations)
            .values({
              clientId: acc.clientId,
              socialAccountId: acc.id,
              platform: 'wa',
              platformConversationId: from,
              participantId: from,
              participantName: contact?.profile?.name || contact?.wa_id || from,
              unreadCount: 1,
              lastMessage: text,
              lastMessageAt: timestamp,
            })
            .returning();
          conv = created;
        } else {
          await db
            .update(schema.dmConversations)
            .set({
              unreadCount: (conv.unreadCount || 0) + 1,
              lastMessage: text,
              lastMessageAt: timestamp,
              updatedAt: new Date(),
            })
            .where(eq(schema.dmConversations.id, conv.id));
        }

        await db.insert(schema.dmMessages).values({
          conversationId: conv.id,
          clientId: acc.clientId,
          platform: 'wa',
          platformMessageId: msgId,
          direction: 'incoming',
          content: text || '(media)',
          createdAt: timestamp,
        });

        await db
          .update(schema.triggeredEvents)
          .set({ status: 'processed', payload: { messageId: msgId, from, text } })
          .where(eq(schema.triggeredEvents.eventId, eventId));

        /* AI auto-reply */
        if (text) {
          let replied = false;
          const templates = await getTemplates(acc.clientId, 'wa');
          for (const tmpl of templates) {
            if (tmpl.keywords?.length) {
              const match = tmpl.keywords.find((kw: string) =>
                text.toLowerCase().includes(kw.toLowerCase()),
              );
              if (match) {
                const reply = renderTemplate(tmpl.content, {
                  recipient_name: conv.participantName || '',
                  keyword: match,
                });
                await waSendMessage(from, reply);
                logger.success(`Webhook WA: Template replied to ${from}: "${tmpl.name}"`);
                replied = true;
                break;
              }
            }
          }

          if (!replied) {
            const aiReply = await generateSmartReply(acc.clientId, text, conv.participantName || 'user');
            if (aiReply) {
              await waSendMessage(from, aiReply);
              await sendNotification(acc.clientId, `🤖 AI WhatsApp javob berdi:\n\n${aiReply}`).catch(() => {});
              logger.success(`Webhook WA: AI replied to ${from}`);
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Webhook WhatsApp handler error: ${err instanceof Error ? err.message : err}`);
  }
}

export { router as webhookRouter };
