import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).default('user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const igAccounts = pgTable('ig_accounts', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  igUserId: varchar('ig_user_id', { length: 100 }).unique().notNull(),
  igUsername: varchar('ig_username', { length: 255 }),
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const automationRules = pgTable('automation_rules', {
  id: serial('id').primaryKey(),
  igAccountId: integer('ig_account_id').references(() => igAccounts.id).notNull(),
  keywords: text('keywords').array().notNull(),
  replyTemplate: text('reply_template'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const triggeredEvents = pgTable('triggered_events', {
  id: serial('id').primaryKey(),
  eventId: varchar('event_id', { length: 255 }).unique().notNull(),
  igAccountId: integer('ig_account_id').references(() => igAccounts.id),
  clientId: integer('client_id').references(() => clients.id),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('processed').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  planType: varchar('plan_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  startsAt: timestamp('starts_at').defaultNow().notNull(),
  endsAt: timestamp('ends_at').notNull(),
  gracePeriodEndsAt: timestamp('grace_period_ends_at'),
  maxRules: integer('max_rules').default(5).notNull(),
  maxAccounts: integer('max_accounts').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 10 }).default('UZS').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const telegramUsers = pgTable('telegram_users', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  telegramId: varchar('telegram_id', { length: 100 }).unique().notNull(),
  telegramUsername: varchar('telegram_username', { length: 255 }),
  chatId: varchar('chat_id', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiKnowledge = pgTable('ai_knowledge', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  content: text('content').notNull(),
  sourceType: varchar('source_type', { length: 50 }).default('text').notNull(),
  sourceName: varchar('source_name', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiConversations = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  contextType: varchar('context_type', { length: 50 }).default('chat'),
  sessionId: varchar('session_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiSettings = pgTable('ai_settings', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).unique().notNull(),
  provider: varchar('provider', { length: 50 }).default('gemini').notNull(),
  smartReplyEnabled: boolean('smart_reply_enabled').default(false).notNull(),
  contextCount: integer('context_count').default(10).notNull(),
  systemPrompt: text('system_prompt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialAccounts = pgTable('social_accounts', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformUserId: varchar('platform_user_id', { length: 255 }).notNull(),
  platformUsername: varchar('platform_username', { length: 255 }),
  accessToken: text('access_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  webhookSubscribed: boolean('webhook_subscribed').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dmTemplates = pgTable('dm_templates', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  platform: varchar('platform', { length: 20 }).default('ig').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  keywords: text('keywords').array(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dmConversations = pgTable('dm_conversations', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  socialAccountId: integer('social_account_id').references(() => socialAccounts.id),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformConversationId: varchar('platform_conversation_id', { length: 255 }),
  participantId: varchar('participant_id', { length: 255 }).notNull(),
  participantName: varchar('participant_name', { length: 255 }),
  lastMessage: text('last_message'),
  lastMessageAt: timestamp('last_message_at'),
  unreadCount: integer('unread_count').default(0).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dmMessages = pgTable('dm_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => dmConversations.id).notNull(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformMessageId: varchar('platform_message_id', { length: 255 }),
  direction: varchar('direction', { length: 10 }).notNull(),
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 50 }).default('text').notNull(),
  mediaUrl: varchar('media_url', { length: 500 }),
  isRead: boolean('is_read').default(false).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contentCalendar = pgTable('content_calendar', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  socialAccountId: integer('social_account_id').references(() => socialAccounts.id),
  platform: varchar('platform', { length: 20 }).notNull(),
  contentType: varchar('content_type', { length: 50 }).default('post').notNull(),
  caption: text('caption'),
  mediaUrls: text('media_urls').array(),
  hashtags: text('hashtags').array(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  publishedAt: timestamp('published_at'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const analyticsCache = pgTable('analytics_cache', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  socialAccountId: integer('social_account_id').references(() => socialAccounts.id),
  platform: varchar('platform', { length: 20 }).notNull(),
  metricType: varchar('metric_type', { length: 100 }).notNull(),
  period: varchar('period', { length: 20 }).notNull(),
  value: jsonb('value').notNull(),
  cachedAt: timestamp('cached_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).unique().notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  requisite: text('requisite').notNull(),
  instructions: text('instructions'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(), // free | standart | pro | enterprise
  displayName: varchar('display_name', { length: 100 }).notNull(),
  priceUzs: integer('price_uzs').default(0).notNull(),
  maxIgAccounts: integer('max_ig_accounts').default(1).notNull(),
  maxRules: integer('max_rules').default(5).notNull(),
  maxDmTemplates: integer('max_dm_templates').default(5).notNull(),
  maxAiRepliesPerDay: integer('max_ai_replies_per_day').default(0).notNull(),
  maxScheduledPosts: integer('max_scheduled_posts').default(0).notNull(),
  commentAutoReply: boolean('comment_auto_reply').default(true).notNull(),
  dmAutoReply: boolean('dm_auto_reply').default(false).notNull(),
  aiSmartReply: boolean('ai_smart_reply').default(false).notNull(),
  contentCalendar: boolean('content_calendar').default(false).notNull(),
  analytics: boolean('analytics').default(true).notNull(),
  whatsapp: boolean('whatsapp').default(false).notNull(),
  telegramBot: boolean('telegram_bot').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
