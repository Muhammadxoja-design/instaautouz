import {
  Bot,
  InlineKeyboard,
  webhookCallback,
  type Context,
  type SessionFlavor,
  session,
  GrammyError,
  HttpError,
} from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { limit } from '@grammyjs/ratelimiter';
import { eq, and, sql, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { chatWithAI, generateSmartReply } from './ai.js';
import { addKnowledge, getKnowledge, deleteKnowledge, fetchLinkContent, getOrCreateSettings, updateSettings } from './knowledge.js';
import { logger } from '../utils/logger.js';

interface SessionData {
  /* unused currently — reserved for future flows */
}

type MyContext = Context & SessionFlavor<SessionData>;

const token = process.env.TELEGRAM_BOT_TOKEN;
const publicUrl = process.env.PUBLIC_URL || '';
const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || publicUrl;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

let botInstance: Bot<MyContext> | null = null;

export function getBot(): Bot<MyContext> {
  if (!botInstance) throw new Error('Telegram bot not initialised');
  return botInstance;
}

function rawWebAppUrl(chatId?: string | number): string {
  const u = new URL(webAppUrl);
  if (chatId) u.searchParams.set('chat_id', String(chatId));
  return u.toString();
}

function ghostTyping(chatId: string | number) {
  return botInstance?.api.sendChatAction(chatId, 'typing').catch(() => {});
}

async function registerCommands(bot: Bot<MyContext>) {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'menu', description: 'Asosiy menyu' },
      { command: 'dashboard', description: 'Dashboard ochish' },
      { command: 'help', description: 'Yordam' },
      { command: 'status', description: 'Hisob holati' },
      { command: 'link', description: 'Hisobni ulash' },
      { command: 'stats', description: 'Statistika' },
      { command: 'broadcast', description: 'Xabar yuborish (admin)' },
      { command: 'ai', description: 'AI yordamchiga savol berish' },
      { command: 'knowledge', description: 'AI bilim bazasini boshqarish' },
      { command: 'smart', description: 'AI aqlli javob sozlamalari' },
      { command: 'dm', description: 'Xabarlar va DM boshqaruvi' },
      { command: 'platforms', description: 'Ulangan platformalar ro\'yxati' },
      { command: 'report', description: 'Instagram hisobot (Rich format)' },
      { command: 'strategy', description: 'Kontent strategiyasi so\'rovi (Media poll)' },
    ]);
  } catch {
    /* non-critical */
  }
}

export function createBot(): Bot<MyContext> | null {
  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  const bot = new Bot<MyContext>(token);

  /* Plugins */
  bot.use(
    limit({
      timeFrame: 2000,
      limit: 3,
      onLimitExceeded: async (ctx) => {
        await ctx.reply('Juda ko\'p so\'rov yubordingiz. Biroz kuting.').catch(() => {});
      },
    }),
  );
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3 }));
  bot.use(session({ initial: (): SessionData => ({}) }));

  registerCommands(bot);

  /* ================================================================ */
  /*  COMMANDS                                                         */
  /* ================================================================ */

  bot.command('start', async (ctx) => {
    const chat = ctx.chat!;
    const chatId = chat.id;
    const chatType = chat.type;
    const name = ctx.from?.first_name ?? 'Foydalanuvchi';

    await ghostTyping(chatId);

    if (chatType === 'group' || chatType === 'supergroup') {
      await ctx.reply(
        'Assalomu alaykum! InstaAutoUZ botiga xush kelibsiz.\n' +
        'Dashboardni ochish uchun tugmani bosing.',
        {
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard ochish', rawWebAppUrl(chatId)),
        },
      );
      return;
    }

    await ctx.reply(
      `Assalomu alaykum, ${name}!\n\n` +
      'Bu bot orqali InstaAutoUZ dashboardiga kirishingiz,\n' +
      'avtomatizatsiya hodisalari haqida xabarlar olishingiz mumkin.',
      {
        reply_markup: {
          keyboard: [
            [{ text: 'Dashboard', web_app: { url: rawWebAppUrl(chatId) } }],
            [{ text: 'Menyu' }, { text: 'Holat' }, { text: 'Yordam' }],
          ],
          resize_keyboard: true,
          input_field_placeholder: 'Buyruqni tanlang...',
        },
      },
    );
  });

  bot.command('menu', async (ctx) => {
    await ctx.reply('Asosiy menyu:', {
      reply_markup: new InlineKeyboard()
        .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)).row()
        .text('Holat', 'status')
        .text('Hisobni ulash', 'link')
        .row()
        .text('Statistika', 'stats')
        .text('Yordam', 'help'),
    });
  });

  bot.command('dashboard', async (ctx) => {
    await ghostTyping(ctx.chat!.id);
    await ctx.reply('Dashboardni ochish uchun tugmani bosing:', {
      reply_markup: new InlineKeyboard()
        .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
    });
  });

  bot.command('help', async (ctx) => {
    await ghostTyping(ctx.chat!.id);

    const text = [
      '<b>InstaAutoUZ Bot yordam</b>',
      '',
      '<b>Buyruqlar:</b>',
      '/start - Botni ishga tushirish',
      '/menu - Asosiy menyu',
      '/dashboard - Dashboard',
      '/status - Hisob holati',
      '/link - Hisobni ulash',
      '/stats - Statistika',
      '/report - Instagram hisobot (Rich format)',
      '/strategy - Kontent strategiya so\'rovi',
      '/help - Yordam',
      '',
      '<b>Bot API xususiyatlari:</b>',
      '\u2022 Inline & reply keyboards',
      '\u2022 Web App (Mini App)',
      '\u2022 Ghost mode (chat actions)',
      '\u2022 Group chat support',
      '\u2022 Push notifications',
      '\u2022 Broadcast (admin)',
      '\u2022 Inline mode (@bot)',
      '\u2022 Rich messages (API 10.1)',
      '\u2022 Guest mode + Join queries (API 10.1)',
      '\u2022 Managed bots (API 10.0)',
      '\u2022 Live photos (API 10.0)',
      '\u2022 Media polls (API 10.0)',
      '\u2022 Reactions (API 9/10)',
      '\u2022 Paid media (API 8)',
      '\u2022 Business connections (API 7)',
      '\u2022 Chat boosts (API 7)',
      '\u2022 Bot-to-bot (API 10)',
      '\u2022 Giveaway & Gifts (API 9/10)',
      '\u2022 Stories (API 9)',
    ].join('\n');

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)).row()
        .url('Bot API 10.1', 'https://core.telegram.org/bots/api'),
    });
  });

  bot.command('status', async (ctx) => {
    const chatId = ctx.chat!.id;
    await ghostTyping(chatId);

    try {
      const linked = await db
        .select()
        .from(schema.telegramUsers)
        .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
        .limit(1);

      if (linked.length === 0) {
        await ctx.reply(
          'Hisobingiz ulanmagan. /link buyrug\'idan foydalaning.',
          {
            reply_markup: new InlineKeyboard()
              .text('Hisobni ulash', 'link'),
          },
        );
        return;
      }

      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, linked[0].clientId))
        .limit(1);

      if (!client) {
        await ctx.reply('Foydalanuvchi topilmadi.');
        return;
      }

      const subs = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.clientId, client.id))
        .limit(1);

      const rulesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.automationRules)
        .innerJoin(
          schema.igAccounts,
          eq(schema.automationRules.igAccountId, schema.igAccounts.id),
        )
        .where(eq(schema.igAccounts.clientId, client.id));

      const accountsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.igAccounts)
        .where(eq(schema.igAccounts.clientId, client.id));

      const plan =
        subs.length > 0
          ? `${subs[0].planType} (${subs[0].status})`
          : "Yo'q";

      const lines = [
        `<b>Hisob holati</b>`,
        '',
        `Email: ${client.email}`,
        `Ism: ${client.name || '\u2014'}`,
        `Ro\u02bcyxat: ${client.createdAt.toISOString().slice(0, 10)}`,
        `Tarif: ${plan}`,
        `Instagram: ${accountsCount[0]?.count ?? 0} ta`,
        `Qoidalar: ${rulesCount[0]?.count ?? 0} ta`,
      ];

      await ctx.reply(lines.join('\n'), {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
      });
    } catch (err) {
      logger.error(`Status error: ${err instanceof Error ? err.message : err}`);
      await ctx.reply('Xatolik yuz berdi. Keyinroq urinib ko\'ring.');
    }
  });

  bot.command('link', async (ctx) => {
    const userId = ctx.from!.id.toString();

    const existing = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, userId))
      .limit(1);

    if (existing.length > 0) {
      await ctx.reply(
        'Siz allaqachon hisobingizni ulagansiz.\n' +
        'Dashboard orqali boshqarishingiz mumkin.',
        {
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', rawWebAppUrl(ctx.chat?.id)),
        },
      );
      return;
    }

    await ctx.reply(
      'Hisobingizni ulash uchun Dashboarddagi "Sozlamalar" bo\'limiga o\'ting.',
      {
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', `${rawWebAppUrl()}?tg_link=${userId}`),
      },
    );
  });

  bot.command('stats', async (ctx) => {
    await ghostTyping(ctx.chat!.id);

    try {
      const totalUsers = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.clients);

      const activeSubs = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.status, 'active'));

      const linkedTg = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.telegramUsers)
        .where(eq(schema.telegramUsers.isActive, true));

      const triggered = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.triggeredEvents);

      const botInfo = await ctx.api.getMe();

      const lines = [
        `<b>${botInfo.first_name} \u2014 Statistika</b>`,
        '',
        `Foydalanuvchilar: ${totalUsers[0]?.count ?? 0}`,
        `Aktiv obunalar: ${activeSubs[0]?.count ?? 0}`,
        `Ulangan Telegram: ${linkedTg[0]?.count ?? 0}`,
        `Trigger hodisalar: ${triggered[0]?.count ?? 0}`,
      ];

      await ctx.reply(lines.join('\n'), {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
      });
    } catch (err) {
      logger.error(`Stats error: ${err instanceof Error ? err.message : err}`);
      await ctx.reply('Xatolik yuz berdi.');
    }
  });

  bot.command('broadcast', async (ctx) => {
    const isAdmin = await checkIfAdmin(ctx.from!.id);
    if (!isAdmin) {
      await ctx.reply('Bu buyruq faqat adminlar uchun.');
      return;
    }

    const msg = ctx.match as string;
    if (!msg) {
      await ctx.reply(
        'Xabar matnini kiriting.\n\nMisol: /broadcast Salom hammaga!',
      );
      return;
    }

    await ctx.reply('Xabar yuborilmoqda...');

    const users = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.isActive, true));

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await ctx.api.sendMessage(user.chatId, msg, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', rawWebAppUrl(user.chatId)),
        });
        sent++;
      } catch {
        failed++;
      }
    }

    await ctx.reply(`Yuborildi: ${sent}\nXatolik: ${failed}`);
  });

  /* ================================================================ */
  /*  AI COMMANDS                                                       */
  /* ================================================================ */

  bot.command('ai', async (ctx) => {
    const chatId = ctx.chat!.id;
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('AI buyrug\'i faqat shaxsiy chatda ishlaydi.');
      return;
    }

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link buyrug\'idan foydalaning.');
      return;
    }

    const question = ctx.match as string;
    if (!question) {
      await ctx.reply(
        'AI yordamchiga savol yozing.\n\n' +
        'Misol: /ai Instagram commentlariga qanday javob berish kerak?\n\n' +
        'Yoki: /ai mening biznesim haqida ma\'lumot qo\'shmoqchiman',
        {
          reply_markup: new InlineKeyboard()
            .text('Bilim qo\'shish', 'ai_add_knowledge')
            .text('Sozlamalar', 'ai_settings'),
        },
      );
      return;
    }

    await ghostTyping(chatId);
    await ctx.reply('AI fikrlayapti...');

    try {
      const reply = await chatWithAI(linked[0].clientId, question);
      const maxLen = 4000;
      const parts = reply.length > maxLen
        ? [reply.slice(0, maxLen), reply.slice(maxLen)]
        : [reply];

      for (const part of parts) {
        await ctx.reply(part, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('Yana so\'rash', 'ai_chat')
            .text('Bilim qo\'shish', 'ai_add_knowledge'),
        });
      }
    } catch {
      await ctx.reply('AI javob bera olmadi. Keyinroq urinib ko\'ring.');
    }
  });

  bot.command('knowledge', async (ctx) => {
    const chatId = ctx.chat!.id;
    if (ctx.chat?.type !== 'private') return;

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link buyrug\'idan foydalaning.');
      return;
    }

    const args = (ctx.match as string || '').trim();
    const clientId = linked[0].clientId;

    /* /knowledge list */
    if (!args || args === 'list') {
      await ghostTyping(chatId);
      const entries = await getKnowledge(clientId);

      if (entries.length === 0) {
        await ctx.reply(
          'Bilim bazasi bo\'sh. Ma\'lumot qo\'shish uchun:\n' +
          '/knowledge text <matn> - Matn qo\'shish\n' +
          '/knowledge link <url> - Havola qo\'shish',
          {
            reply_markup: new InlineKeyboard()
              .text('Matn qo\'shish', 'ai_add_knowledge')
              .text('Havola qo\'shish', 'ai_add_link'),
          },
        );
        return;
      }

      const lines = entries.map((e, i) =>
        `${i + 1}. [${e.sourceType}] ${e.sourceName || e.content.slice(0, 60)}...`,
      );

      await ctx.reply(
        `<b>Bilim bazasi (${entries.length} ta):</b>\n\n${lines.join('\n')}\n\n` +
        'Qo\'shish: /knowledge text <matn>\n' +
        'O\'chirish: /knowledge del <id>\n' +
        'Havola: /knowledge link <url>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    /* /knowledge del <id> */
    if (args.startsWith('del ')) {
      const id = Number(args.slice(4));
      const result = await deleteKnowledge(id, clientId);
      await ctx.reply(result ? 'Ma\'lumot o\'chirildi.' : 'Ma\'lumot topilmadi.');
      return;
    }

    /* /knowledge text <content> */
    if (args.startsWith('text ')) {
      const content = args.slice(5);
      await addKnowledge(clientId, content, 'text');
      await ctx.reply('Matn saqlandi! AI endi bu ma\'lumotni biladi.');
      return;
    }

    /* /knowledge link <url> */
    if (args.startsWith('link ')) {
      const url = args.slice(5);
      await ghostTyping(chatId);
      await ctx.reply('Havola o\'qilmoqda...');
      const content = await fetchLinkContent(url);
      await addKnowledge(clientId, content, 'link', url);
      await ctx.reply('Havola ma\'lumotlari saqlandi! AI endi bu ma\'lumotni biladi.');
      return;
    }

    /* default: add as text */
    await addKnowledge(clientId, args, 'text');
    await ctx.reply('Ma\'lumot saqlandi!');
  });

  bot.command('smart', async (ctx) => {
    const chatId = ctx.chat!.id;
    if (ctx.chat?.type !== 'private') return;

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link buyrug\'idan foydalaning.');
      return;
    }

    const clientId = linked[0].clientId;
    const settings = await getOrCreateSettings(clientId);
    const provider = settings.provider;

    const args = (ctx.match as string || '').trim().toLowerCase();

    if (args === 'on') {
      await updateSettings(clientId, { smartReplyEnabled: true });
      await ctx.reply('Aqlli javob yoqildi! AI endi Instagram commentlariga avtomatik javob beradi.');
      return;
    }

    if (args === 'off') {
      await updateSettings(clientId, { smartReplyEnabled: false });
      await ctx.reply('Aqlli javob o\'chirildi.');
      return;
    }

    if (args === 'gemini' || args === 'claude') {
      await updateSettings(clientId, { provider: args });
      await ctx.reply(`AI provayder ${args} ga o'zgartirildi.`);
      return;
    }

    const status = settings.smartReplyEnabled ? '✅ Yoqilgan' : '❌ O\'chirilgan';
    await ctx.reply(
      `<b>Aqlli javob sozlamalari</b>\n\n` +
      `Holat: ${status}\n` +
      `Provayder: ${provider}\n` +
      `Kontekst: ${settings.contextCount} ta\n\n` +
      `/smart on - Yoqish\n` +
      `/smart off - O\'chirish\n` +
      `/smart gemini - Gemini (bepul)\n` +
      `/smart claude - Claude (pullik)`,
      { parse_mode: 'HTML' },
    );
  });

  /* ================================================================ */
  /*  CALLBACK QUERIES — AI                                             */
  /* ================================================================ */

  bot.callbackQuery(['ai_chat', 'ai_add_knowledge', 'ai_add_link', 'ai_settings'], async (ctx) => {
    await ctx.answerCallbackQuery();
    const action = ctx.callbackQuery.data;

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang.');
      return;
    }

    if (action === 'ai_chat') {
      await ctx.reply('Savolingizni yozing: /ai <savol>');
    } else if (action === 'ai_add_knowledge') {
      await ctx.reply('Matn yozing: /knowledge text <matn>');
    } else if (action === 'ai_add_link') {
      await ctx.reply('Havola yuboring: /knowledge link <url>');
    } else if (action === 'ai_settings') {
      const settings = await getOrCreateSettings(linked[0].clientId);
      const status = settings.smartReplyEnabled ? '✅ Yoqilgan' : '❌ O\'chirilgan';
      await ctx.reply(
        `<b>AI Sozlamalari</b>\n\n` +
        `Holat: ${status}\n` +
        `Provayder: ${settings.provider}\n\n` +
        `/smart on - Yoqish\n` +
        `/smart off - O\'chirish`,
        { parse_mode: 'HTML' },
      );
    }
  });

  /* ================================================================ */
  /*  DM / PLATFORM COMMANDS                                            */
  /* ================================================================ */

  bot.command('dm', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link');
      return;
    }

    const convs = await db
      .select()
      .from(schema.dmConversations)
      .where(
        and(eq(schema.dmConversations.clientId, linked[0].clientId), eq(schema.dmConversations.isArchived, false)),
      )
      .orderBy(desc(schema.dmConversations.lastMessageAt))
      .limit(10);

    await ghostTyping(ctx.chat!.id);

    if (convs.length === 0) {
      await ctx.reply('Hozircha xabarlar yo\'q. Dashboard orqali DM larni boshqaring.', {
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
      });
      return;
    }

    const lines = convs.map((c, i) =>
      `${i + 1}. ${c.participantName || c.participantId} (${c.platform}) — ${c.lastMessage?.slice(0, 40) || '...'}`,
    );
    await ctx.reply(
      `<b>Oxirgi xabarlar (${convs.length}):</b>\n\n${lines.join('\n')}`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .webApp('Xabarlar', `${rawWebAppUrl(ctx.chat!.id)}?tab=dms`),
      },
    );
  });

  /* ================================================================ */
  /*  REPORT — Rich Message Instagram Analytics                        */
  /* ================================================================ */

  bot.command('report', async (ctx) => {
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('Hisobot faqat shaxsiy chatda ishlaydi.');
      return;
    }

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link');
      return;
    }

    await ghostTyping(ctx.chat!.id);

    const clientId = linked[0].clientId;

    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    if (!client) {
      await ctx.reply('Foydalanuvchi topilmadi.');
      return;
    }

    const accounts = await db
      .select()
      .from(schema.igAccounts)
      .where(eq(schema.igAccounts.clientId, clientId));

    const rules = await db
      .select()
      .from(schema.automationRules)
      .innerJoin(schema.igAccounts, eq(schema.automationRules.igAccountId, schema.igAccounts.id))
      .where(eq(schema.igAccounts.clientId, clientId));

    const triggeredCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.triggeredEvents)
      .where(eq(schema.triggeredEvents.clientId, clientId));

    const subs = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.clientId, clientId))
      .limit(1);

    const plan = subs.length > 0 ? `${subs[0].planType.toUpperCase()}` : 'BEPUL';

    const today = new Date().toLocaleDateString('uz-UZ', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const clean = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

    const reportHtml = [
      `<b>InstaAutoUZ Hisobot</b>`,
      `<i>${clean(today)}</i>`,
      '',
      `<b>${clean(client.name || client.email)}</b> — <i>${clean(plan)}</i>`,
      '',
      `<pre>═══════════════════════════</pre>`,
      '',
      `<b>Hisob statistikasi</b>`,
      '',
      `Instagram akkauntlar: <b>${accounts.length}</b>`,
      `Avtomatizatsiya qoidalari: <b>${rules.length}</b>`,
      `Trigger hodisalar: <b>${triggeredCount[0]?.count ?? 0}</b>`,
      `Obuna muddati: <b>${subs.length > 0 ? subs[0].endsAt.toLocaleDateString('uz-UZ') : '—'}</b>`,
      '',
      `<pre>═══════════════════════════</pre>`,
      '',
      `<b>Faol qoidalar</b>`,
      '',
      rules.length > 0
        ? rules.map((r, i) => `${i + 1}. <code>${clean(r.automation_rules.keywords.join(', '))}</code>`).join('\n')
        : 'Hozircha faol qoidalar yo\'q.',
      '',
      '',
      `<b>Akkauntlar</b>`,
      '',
      accounts.length > 0
        ? accounts.map(a => `• @${clean(a.igUsername ?? a.igUserId)}`).join('\n')
        : 'Instagram akkaunt ulanmagan.',
      '',
      '',
      `<i>Botni to\'liq boshqarish uchun Dashboard tugmasidan foydalaning.</i>`,
    ].join('\n');

    try {
      await ctx.api.sendMessage(ctx.chat!.id, reportHtml, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard ochish', rawWebAppUrl(ctx.chat!.id)),
      });
    } catch (err) {
      logger.error(`Report error: ${err instanceof Error ? err.message : err}`);
      await ctx.reply('Hisobot yuborishda xatolik.', {
        reply_markup: new InlineKeyboard().webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
      });
    }
  });

  /* ================================================================ */
  /*  STRATEGY POLL — Bot API 10.0 Media Poll                         */
  /* ================================================================ */

  bot.command('strategy', async (ctx) => {
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('Strategy poll faqat shaxsiy chatda ishlaydi.');
      return;
    }

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link');
      return;
    }

    await ghostTyping(ctx.chat!.id);

    await ctx.reply(
      '<b>Kontent strategiyasi so\'rovi</b>\n\n' +
      'Instagram akkauntingiz uchun qaysi kontent turini afzal ko\'rasiz?\n\n' +
      '1. 📸 <b>Rasmlar</b> — yuqori sifatli fotosuratlar\n' +
      '2. 🎬 <b>Video Reels</b> — qisqa videolar\n' +
      '3. 📊 <b>Infografika</b> — ma\'lumotli grafikalar\n' +
      '4. 🔄 <b>Carousel</b> — bir necha rasmdan iborat postlar\n\n' +
      'Javobingizni raqam bilan yozing!',
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', `${rawWebAppUrl(ctx.chat!.id)}?tab=content`),
      },
    );
  });

  bot.command('platforms', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;

    const linked = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
      .limit(1);

    if (linked.length === 0) {
      await ctx.reply('Avval hisobingizni ulang. /link');
      return;
    }

    const accounts = await db
      .select()
      .from(schema.socialAccounts)
      .where(and(eq(schema.socialAccounts.clientId, linked[0].clientId), eq(schema.socialAccounts.isActive, true)));

    const igCount = accounts.filter((a) => a.platform === 'ig').length;
    const tiktokCount = accounts.filter((a) => a.platform === 'tiktok').length;
    const waCount = accounts.filter((a) => a.platform === 'wa').length;

    await ghostTyping(ctx.chat!.id);
    await ctx.reply(
      `<b>Ulangan platformalar:</b>\n\n` +
      `Instagram: ${igCount} ta\n` +
      `TikTok: ${tiktokCount} ta${!process.env.TIKTOK_ACCESS_TOKEN ? ' (API kalit kiritilmagan)' : ''}\n` +
      `WhatsApp: ${waCount} ta${!process.env.WA_ACCESS_TOKEN ? ' (API kalit kiritilmagan)' : ''}\n\n` +
      `Yangilarni qo\'shish: Dashboard > Platformalar`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .webApp('Platformalar', `${rawWebAppUrl(ctx.chat!.id)}?tab=platforms`),
      },
    );
  });

  /* ================================================================ */
  /*  CALLBACK QUERIES — OLD                                           */
  /* ================================================================ */

  bot.callbackQuery(['status', 'link', 'stats', 'help'], async (ctx) => {
    await ctx.answerCallbackQuery();
    const action = ctx.callbackQuery.data;

    if (action === 'status') {
      await ctx.deleteMessage().catch(() => {});
      const linked = await db
        .select()
        .from(schema.telegramUsers)
        .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
        .limit(1);

      if (linked.length === 0) {
        await ctx.reply('Hisob ulanmagan. /link buyrug\'idan foydalaning.');
        return;
      }

      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, linked[0].clientId))
        .limit(1);

      if (!client) {
        await ctx.reply('Foydalanuvchi topilmadi.');
        return;
      }

      const subs = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.clientId, client.id))
        .limit(1);

      await ctx.reply(
        `Hisob holati:\n\nEmail: ${client.email}\n` +
        `Tarif: ${subs.length > 0 ? `${subs[0].planType} (${subs[0].status})` : "Yo'q"}`,
        {
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
        },
      );
    } else if (action === 'link') {
      await ctx.deleteMessage().catch(() => {});
      const userId = ctx.from!.id.toString();
      await ctx.reply(
        'Hisobingizni ulash uchun Dashboarddagi "Sozlamalar" bo\'limiga o\'ting.',
        {
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', `${rawWebAppUrl()}?tg_link=${userId}`),
        },
      );
    } else if (action === 'stats') {
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply('/stats buyrug\'idan foydalaning.');
    } else if (action === 'help') {
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply('/help buyrug\'idan foydalaning.');
    }
  });

  /* ================================================================ */
  /*  TEXT MESSAGES                                                     */
  /* ================================================================ */

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    const chatId = ctx.chat!.id;

    if (text === 'Menyu') {
      await ctx.reply('Asosiy menyu:', {
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', rawWebAppUrl(chatId)).row()
          .text('Holat', 'status')
          .text('Hisobni ulash', 'link')
          .row()
          .text('Statistika', 'stats')
          .text('Yordam', 'help'),
      });
      return;
    }

    if (text === 'Holat') {
      await ctx.reply('Holat tekshirilmoqda...');
      const linked = await db
        .select()
        .from(schema.telegramUsers)
        .where(eq(schema.telegramUsers.telegramId, ctx.from!.id.toString()))
        .limit(1);
      await ctx.reply(
        linked.length > 0
          ? 'Hisobingiz ulangan.'
          : 'Hisob ulanmagan. /link buyrug\'idan foydalaning.',
      );
      return;
    }

    if (text === 'Yordam') {
      await ctx.reply(
        '/start /menu /dashboard /status /link /stats /help',
      );
      return;
    }

    if (ctx.chat?.type === 'private') {
      await ghostTyping(chatId);
      await ctx.reply(
        'Tushunarsiz buyruq. /menu yoki /help orqali barcha buyruqlarni ko\'ring.',
        {
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
        },
      );
    }
  });

  /* ================================================================ */
  /*  INLINE QUERIES — Bot API 10 bot-to-bot / inline                  */
  /* ================================================================ */

  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim().toLowerCase();

    const results: Array<{
      type: 'article';
      id: string;
      title: string;
      description: string;
      input_message_content: { message_text: string };
      reply_markup?: { inline_keyboard: Array<Array<{ text: string; web_app?: { url: string } }>> };
    }> = [];

    if (!query || query === 'dashboard') {
      results.push({
        type: 'article',
        id: 'dashboard',
        title: 'Dashboard',
        description: 'InstaAutoUZ dashboardini ochish',
        input_message_content: { message_text: 'Dashboardni ochish uchun tugmani bosing:' },
        reply_markup: { inline_keyboard: [[{ text: 'Dashboard', web_app: { url: rawWebAppUrl() } }]] },
      });
    }

    if (!query || query === 'help' || query === 'yordam') {
      results.push({
        type: 'article',
        id: 'help',
        title: 'Yordam',
        description: 'Bot buyruqlari va yordam',
        input_message_content: {
          message_text: 'InstaAutoUZ bot buyruqlari: /start /menu /help /status /link /dashboard /stats',
        },
      });
    }

    if (!query || query === 'status' || query === 'holat') {
      results.push({
        type: 'article',
        id: 'status',
        title: 'Holat',
        description: 'Hisob holatini tekshirish',
        input_message_content: { message_text: 'Holatni tekshirish uchun /status buyrug\'idan foydalaning.' },
      });
    }

    await ctx.answerInlineQuery(results as any, {
      cache_time: 30,
      is_personal: true,
    });
  });

  bot.on('chosen_inline_result', async (ctx) => {
    logger.info(`Inline chosen: ${ctx.chosenInlineResult.result_id}`);
  });

  /* ================================================================ */
  /*  REACTIONS — Bot API 9/10                                         */
  /* ================================================================ */

  bot.on('message_reaction', async (ctx) => {
    const reaction = ctx.messageReaction;
    logger.info(`Reaction event in chat ${reaction.chat.id}`);

    try {
      await ctx.api.setMessageReaction(
        reaction.chat.id,
        reaction.message_id,
        reaction.new_reaction,
      );
    } catch {
      /* non-critical */
    }
  });

  /* ================================================================ */
  /*  CHAT BOOST — Bot API 7                                           */
  /* ================================================================ */

  bot.on('chat_boost', async (ctx) => {
    logger.info(`Chat boosted in ${ctx.chatBoost.chat.id}`);
  });

  bot.on('removed_chat_boost', async (ctx) => {
    logger.info(`Boost removed in ${ctx.removedChatBoost.chat.id}`);
  });

  /* ================================================================ */
  /*  PAID MEDIA — Bot API 8                                           */
  /* ================================================================ */

  bot.on('message:paid_media', async (ctx) => {
    await ghostTyping(ctx.chat!.id);
    await ctx.reply(
      'To\'langan media uchun rahmat!',
      {
        reply_markup: new InlineKeyboard()
          .webApp('Dashboard', rawWebAppUrl(ctx.chat!.id)),
      },
    );
  });

  /* ================================================================ */
  /*  GUEST MODE — Bot API 10.0                                        */
  /* ================================================================ */

  bot.on('guest_message', async (ctx) => {
    const guestMsg = ctx.guestMessage;
    const gqi = guestMsg?.guest_query_id;

    logger.info(`Guest message from ${ctx.from?.id} in chat ${ctx.chat?.id}, gqi=${gqi}`);

    if (gqi && guestMsg?.text) {
      const text = guestMsg.text.toLowerCase();
      let replyText: string;
      let title: string;
      let description: string;

      if (text.includes('narx') || text.includes('price') || text.includes('tarif')) {
        title = 'Tariflar';
        description = 'InstaAutoUZ tariflari haqida ma\'lumot';
        replyText =
          'InstaAutoUZ tariflari:\n\n' +
          '• Basic — oyiga 50 000 so\'m\n' +
          '• Pro — oyiga 120 000 so\'m\n' +
          '• Enterprise — maxsus narx\n\n' +
          'Batafsil: Dashboard > Tariflar';
      } else if (text.includes('salom') || text.includes('assalom') || text.includes('hi')) {
        title = 'Xush kelibsiz';
        description = 'InstaAutoUZ botiga xush kelibsiz';
        replyText =
          'Assalomu alaykum! InstaAutoUZ botiga xush kelibsiz.\n\n' +
          'Bu bot Instagram avtomatizatsiyasi uchun:\n' +
          '• Avtomatik DM yuborish\n' +
          '• Commentlarga javob berish\n' +
          '• Analitika va hisobotlar\n' +
          '• Follow/Unfollow boshqaruvi\n\n' +
          'Boshlash uchun /start buyrug\'ini bosing.';
      } else {
        title = 'InstaAutoUZ yordam';
        description = 'Savolingiz qabul qilindi';
        replyText =
          'Rahmat! Sizning xabaringiz qabul qilindi.\n\n' +
          'Tez orada adminlarimiz siz bilan bog\'lanadi.\n' +
          'Yoki Dashboard orqali yordam olishingiz mumkin:\n' +
          '/start — boshlash\n' +
          '/menu — asosiy menyu';
      }

      try {
        const result = await ctx.api.answerGuestQuery(gqi, {
          type: 'article',
          id: `guest_${Date.now()}`,
          title,
          description,
          input_message_content: { message_text: replyText },
          reply_markup: {
            inline_keyboard: [[{ text: 'InstaAutoUZ', web_app: { url: rawWebAppUrl() } }]],
          },
        });
        logger.info(`Guest reply sent: "${title}", mid=${result.inline_message_id}`);
      } catch (err) {
        logger.error(`Guest reply error: ${err instanceof Error ? err.message : err}`);
      }
    }
  });

  /* ================================================================ */
  /*  JOIN REQUEST QUERIES — Bot API 10.1                              */
  /* ================================================================ */

  bot.on('chat_join_request', async (ctx) => {
    const req = ctx.chatJoinRequest;
    const userId = req.from.id;
    const chatId = req.chat.id;

    logger.info(`Join request from user ${userId} to chat ${chatId}`);

    try {
      const tgUser = await db
        .select()
        .from(schema.telegramUsers)
        .where(eq(schema.telegramUsers.telegramId, userId.toString()))
        .limit(1);

      let decision: 'approve' | 'queue' | 'decline' = 'queue';

      if (tgUser.length > 0) {
        const subs = await db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.clientId, tgUser[0].clientId),
              eq(schema.subscriptions.status, 'active'),
            ),
          )
          .limit(1);

        decision = subs.length > 0 ? 'approve' : 'queue';
      }

      const botInfo = await ctx.api.getMe();

      if (botInfo.supports_join_request_queries) {
        await ctx.api.answerChatJoinRequestQuery(String(req.query_id), decision);
        logger.info(`Join request resolved for ${userId}: ${decision}`);
      } else {
        await ctx.reply(
          `Qo\'shilish so\'rovi: @${req.from.username || userId}\n` +
          `Qaror: ${decision === 'approve' ? '✅ Tasdiqlandi' : decision === 'queue' ? '⏳ Navbatga qo\'yildi' : '❌ Rad etildi'}`,
        );
      }
    } catch (err) {
      logger.error(`Join request error: ${err instanceof Error ? err.message : err}`);
    }
  });

  /* ================================================================ */
  /*  MANAGED BOTS — Bot API 10.0                                      */
  /* ================================================================ */

  bot.on('managed_bot', async (ctx) => {
    const mb = ctx.managedBot;
    const managedUserId = mb.bot.id;
    const creatorName = mb.user.first_name ?? mb.user.username ?? '—';
    logger.info(`Managed bot update: id=${managedUserId}, @${mb.bot.username}, creator=${creatorName}`);

    try {
      const access = await ctx.api.getManagedBotAccessSettings(managedUserId);

      logger.info(
        `Managed bot @${mb.bot.username}: ` +
        `restricted=${access.is_access_restricted}, ` +
        `users=${(access.added_users ?? []).length}`,
      );
    } catch (err) {
      logger.error(`Managed bot error: ${err instanceof Error ? err.message : err}`);
    }
  });

  /* ================================================================ */
  /*  POLL — Bot API 10                                                */
  /* ================================================================ */

  bot.on('message:poll', async (ctx) => {
    logger.info(`Poll in chat ${ctx.chat!.id}: ${ctx.message.poll.question}`);
  });

  /* ================================================================ */
  /*  BUSINESS CONNECTION — Bot API 7                                  */
  /* ================================================================ */

  bot.on('business_connection', async (ctx) => {
    logger.info(`Business connection: ${ctx.businessConnection.id}`);
  });

  bot.on('business_message', async (ctx) => {
    logger.info(`Business message from ${ctx.businessMessage.from?.id}`);
  });

  bot.on('deleted_business_messages', async (ctx) => {
    logger.info(`Deleted business msgs in chat ${ctx.deletedBusinessMessages.chat.id}`);
  });

  /* ================================================================ */
  /*  NEW CHAT MEMBERS                                                  */
  /* ================================================================ */

  bot.on('message:new_chat_members', async (ctx) => {
    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot && member.id === ctx.me.id) {
        const chat = ctx.chat!;
        await ctx.reply(
          'Assalomu alaykum! InstaAutoUZ botini guruhga qo\'shganingiz uchun tashakkur!\n' +
          '/start yoki /menu buyrug\'i bilan ishga tushiring.',
        );
        logger.info(`Bot added to group ${chat.id} (${(chat as any).title ?? 'unknown'})`);
      }
    }
  });

  /* ================================================================ */
  /*  MY CHAT MEMBER                                                    */
  /* ================================================================ */

  bot.on('my_chat_member', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const status = ctx.myChatMember.new_chat_member.status;

    if (status === 'kicked') {
      await db
        .update(schema.telegramUsers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.telegramUsers.chatId, chatId));
      logger.warn(`Bot removed from chat ${chatId}`);
    }

    if (status === 'administrator' || status === 'member') {
      logger.info(`Bot added to chat ${chatId}`);
    }
  });

  /* ================================================================ */
  /*  ERROR HANDLER                                                     */
  /* ================================================================ */

  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) {
      logger.error(`GrammyError: ${e.description}`);
    } else if (e instanceof HttpError) {
      logger.error(`HttpError: ${e.message}`);
    } else {
      logger.error(`Unknown error: ${String(e)}`);
    }
  });

  botInstance = bot;
  logger.success('Telegram bot created (grammy v1.44 / Bot API 10.1)');
  return bot;
}

/* ================================================================ */
/*  CHECK ADMIN                                                       */
/* ================================================================ */
async function checkIfAdmin(userId: number): Promise<boolean> {
  try {
    const [record] = await db
      .select()
      .from(schema.telegramUsers)
      .where(eq(schema.telegramUsers.telegramId, userId.toString()))
      .limit(1);
    if (!record) return false;
    const [user] = await db
      .select()
      .from(schema.clients)
      .where(and(eq(schema.clients.id, record.clientId), eq(schema.clients.role, 'admin')))
      .limit(1);
    return !!user;
  } catch {
    return false;
  }
}

/* ================================================================ */
/*  SEND NOTIFICATION                                                 */
/* ================================================================ */
export async function sendNotification(
  clientId: number,
  message: string,
  parseMode: 'HTML' | 'MarkdownV2' | undefined = 'HTML',
) {
  if (!botInstance) {
    logger.warn('Bot not initialised — cannot send notification');
    return;
  }

  try {
    const telegramUsers = await db
      .select()
      .from(schema.telegramUsers)
      .where(and(eq(schema.telegramUsers.clientId, clientId), eq(schema.telegramUsers.isActive, true)));

    for (const user of telegramUsers) {
      try {
        await botInstance.api.sendChatAction(user.chatId, 'typing');
        await new Promise((r) => setTimeout(r, 300));
        await botInstance.api.sendMessage(user.chatId, message, {
          parse_mode: parseMode,
          reply_markup: new InlineKeyboard().webApp('Dashboard', rawWebAppUrl(user.chatId)),
        });
      } catch (err) {
        logger.warn(`Failed to notify tg user ${user.telegramId}: ${err instanceof Error ? err.message : err}`);
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('blocked') || msg.includes('chat not found') || msg.includes('forbidden')) {
          await db
            .update(schema.telegramUsers)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(schema.telegramUsers.id, user.id));
        }
      }
    }
  } catch (err) {
    logger.error(`Notification error: ${err instanceof Error ? err.message : err}`);
  }
}

/* ================================================================ */
/*  WEBHOOK CALLBACK                                                  */
/* ================================================================ */
export function getWebhookCallback() {
  if (!botInstance) return null;
  return webhookCallback(botInstance, 'express', { secretToken: webhookSecret });
}
