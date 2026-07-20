import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { logger } from '../utils/logger.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const publicUrl = process.env.PUBLIC_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  logger.error('TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!publicUrl) {
  logger.error('PUBLIC_URL not set in .env — required for webhook');
  process.exit(1);
}

const bot = new Bot(token);
const webhookUrl = `${publicUrl.replace(/\/+$/, '')}/api/telegram/webhook`;

async function main() {
  const action = process.argv[2] || 'setup';

  switch (action) {
    case 'setup':
    case 'set-webhook': {
      await bot.api.setWebhook(webhookUrl, {
        secret_token: secret,
        allowed_updates: [
          'message',
          'edited_message',
          'callback_query',
          'inline_query',
          'chosen_inline_result',
          'my_chat_member',
          'chat_member',
          'chat_join_request',
          'message_reaction',
          'message_reaction_count',
          'business_connection',
          'business_message',
          'deleted_business_messages',
          'chat_boost',
          'removed_chat_boost',
          'purchased_paid_media',
        ],
      });
      const info = await bot.api.getWebhookInfo();
      logger.info('Webhook info:');
      console.log(JSON.stringify(info, null, 2));
      break;
    }

    case 'info': {
      const me = await bot.api.getMe();
      const webhook = await bot.api.getWebhookInfo();
      logger.info(`Bot: @${me.username} (ID: ${me.id})`);
      logger.info(
        `Features: inline=${me.supports_inline_queries}, ` +
        `groups=${me.can_join_groups}, ` +
        `guest=${(me as any).supports_guest_queries ?? false}`,
      );
      logger.info(`Webhook: ${webhook.url || 'not set'}`);
      logger.info(`Pending: ${webhook.pending_update_count || 0}`);
      break;
    }

    case 'delete': {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      logger.info('Webhook deleted');
      break;
    }

    case 'commands': {
      await bot.api.setMyCommands([
        { command: 'start', description: 'Botni ishga tushirish' },
        { command: 'menu', description: 'Asosiy menyu' },
        { command: 'dashboard', description: 'Dashboard ochish' },
        { command: 'help', description: 'Yordam' },
        { command: 'status', description: 'Hisob holati' },
        { command: 'link', description: 'Hisobni ulash' },
        { command: 'stats', description: 'Statistika' },
        { command: 'broadcast', description: 'Xabar yuborish (admin)' },
      ]);
      logger.info('Commands registered');
      break;
    }

    case 'test': {
      const me = await bot.api.getMe();
      logger.info(`Testing bot @${me.username}...`);

      // Bot API 10.0: Test getChat with full info
      try {
        const chatId = process.argv[3];
        if (chatId) {
          const chat = await bot.api.getChat(chatId);
          logger.info(`Chat: ${chat.title || chat.first_name || chat.id} (${chat.type})`);

          // Bot API 9: getChatFullInfo equivalent
          const admins = await bot.api.getChatAdministrators(chatId);
          logger.info(`Admins: ${admins.length}`);
        }
      } catch (e) {
        logger.warn(`Chat test skipped: ${e instanceof Error ? e.message : e}`);
      }

      logger.success('Bot OK');
      break;
    }

    case 'send-poll': {
      const chatId = process.argv[3];
      if (!chatId) {
        logger.error('Usage: npx tsx setup-bot.ts send-poll <chat_id>');
        break;
      }
      // Bot API 10: Poll with media and multiple correct answers
      await bot.api.sendPoll(chatId, 'Eng yaxshi avtomatizatsiya nima?', [
        'Instagram komment',
        'DM xabarlar',
        'Hamma narsa',
        'Bilmayman',
      ], {
        is_anonymous: false,
        allows_multiple_answers: false,
        type: 'regular',
        open_period: 60,
      });
      logger.success(`Poll sent to ${chatId}`);
      break;
    }

    case 'rich-message': {
      const chatId = process.argv[3];
      if (!chatId) {
        logger.error('Usage: npx tsx setup-bot.ts rich-message <chat_id>');
        break;
      }
      // Bot API 10.1: Rich formatted message
      await bot.api.sendMessage(
        chatId,
        '<b>InstaAutoUZ</b>\n\n' +
        'Avtomatlashtirilgan Instagram boshqaruvi.\n\n' +
        '<blockquote>"Eng yaxshi avtomatizatsiya — bu sizning vaqtingizni tejaydi"</blockquote>\n\n' +
        '<u>Imkoniyatlar:</u>\n' +
        '• Kommentlarga avtomatik javob\n' +
        '• DM xabarlar\n' +
        '• Kalit so\'zlar bo\'yicha filtrlash\n\n' +
        '<i>Bugun boshlang!</i>',
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .webApp('Dashboard', process.env.TELEGRAM_WEBAPP_URL || ''),
        },
      );
      logger.success(`Rich message sent to ${chatId}`);
      break;
    }

    case 'set-description': {
      // Bot API 7+: longer description
      await bot.api.setMyDescription(
        'InstaAutoUZ — Instagram akkauntlaringizni avtomatlashtirish uchun bot.\n\n' +
        'Imkoniyatlar:\n' +
        '- Kommentlarga avtomatik javob\n' +
        '- DM xabarlarini avtomatik yuborish\n' +
        '- Kalit so\'zlar bo\'yicha filtrlash\n' +
        '- Telegram orqali bildirishnomalar\n' +
        '- Dashboard orqali boshqaruv\n\n' +
        '/start buyrug\'i bilan boshlang!',
      );
      await bot.api.setMyShortDescription('Instagram avtomatizatsiyasi');
      logger.info('Description set');
      break;
    }

    default: {
      logger.warn(`Unknown action: ${action}`);
      logger.info(
        'Usage: npx tsx backend/src/scripts/setup-bot.ts ' +
        '[setup|info|delete|commands|test|send-poll|rich-message|set-description]',
      );
    }
  }
}

main().catch((err) => {
  logger.error(`Script failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
