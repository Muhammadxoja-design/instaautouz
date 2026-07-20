import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { eq, and, desc } from 'drizzle-orm';
import db, { schema } from '../db/index.js';
import { logger } from '../utils/logger.js';

export type AIProvider = 'gemini' | 'claude' | 'groq';

let geminiInstance: GoogleGenerativeAI | null = null;
let claudeInstance: Anthropic | null = null;
let groqInstance: OpenAI | null = null;

function initAIInstances() {
  if (process.env.GEMINI_API_KEY) {
    geminiInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  if (process.env.CLAUDE_API_KEY) {
    claudeInstance = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  if (process.env.GROQ_API_KEY) {
    groqInstance = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
}

initAIInstances();

// Admin panel dan kalitlar yangilanganda qayta init qilish
export function reinitAI() { initAIInstances(); }

async function isAIEnabled(): Promise<boolean> {
  try {
    const [row] = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, 'AI_ENABLED')).limit(1);
    if (row) return String(row.value) !== 'false';
  } catch { /* ignore */ }
  return process.env.AI_ENABLED !== 'false';
}

function buildSystemPrompt(clientId: number, knowledgeEntries: string[], pastReplies: string[]): string {
  const lines: string[] = [
    "Sen InstaAutoUZ ning AI yordamchisisan.",
    "Foydalanuvchining Instagram avtomatizatsiyasiga yordam berasan.",
    "Quyida foydalanuvchi bergan ma'lumotlar va oldingi avto-javoblar berilgan.",
    "",
    "=== FOYDALANUVCHI MA'LUMOTLARI ===",
  ];

  if (knowledgeEntries.length === 0) {
    lines.push("(Hali ma'lumot kiritilmagan)");
  } else {
    for (const entry of knowledgeEntries) {
      lines.push(`- ${entry}`);
    }
  }

  lines.push(
    "",
    "=== OLINGI AVTO-JAVOBLAR ===",
  );

  if (pastReplies.length === 0) {
    lines.push("(Hali avto-javob yo'q)");
  } else {
    for (const reply of pastReplies) {
      lines.push(`- ${reply}`);
    }
  }

  lines.push(
    "",
    "Qoidalar:",
    "- Faqat foydalanuvchi bergan ma'lumotlar asosida javob ber.",
    "- O'zbek tilida javob ber.",
    "- Qisqa va aniq javob ber.",
    "- Agar ma'lumot yetarli bo'lmasa, foydalanuvchidan qo'shimcha ma'lumot so'ra.",
    "- Instagram avtomatizatsiyasi, kommentlar, DM va qoidalar haqida yordam ber.",
  );

  return lines.join('\n');
}

async function getClientContext(clientId: number): Promise<{ knowledge: string[]; pastReplies: string[] }> {
  const knowledgeRows = await db
    .select()
    .from(schema.aiKnowledge)
    .where(and(eq(schema.aiKnowledge.clientId, clientId), eq(schema.aiKnowledge.isActive, true)))
    .orderBy(desc(schema.aiKnowledge.createdAt))
    .limit(50);

  const knowledge = knowledgeRows.map((k) => {
    const prefix = k.sourceType === 'link' ? 'Havola: ' : k.sourceType === 'file' ? 'Fayl: ' : '';
    return `${prefix}${k.content}`;
  });

  const replyRows = await db
    .select()
    .from(schema.aiConversations)
    .where(
      and(
        eq(schema.aiConversations.clientId, clientId),
        eq(schema.aiConversations.contextType, 'auto_reply'),
      ),
    )
    .orderBy(desc(schema.aiConversations.createdAt))
    .limit(20);

  const pastReplies = replyRows.map((r) => `[${r.role}] ${r.content}`);

  return { knowledge, pastReplies };
}

export async function chatWithAI(
  clientId: number,
  message: string,
  provider: AIProvider = 'gemini',
): Promise<string> {
  const settings = await db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.clientId, clientId))
    .limit(1);

  const activeProvider = settings.length > 0 ? (settings[0].provider as AIProvider) : provider;
  const ctx = await getClientContext(clientId);
  const systemPrompt = buildSystemPrompt(clientId, ctx.knowledge, ctx.pastReplies);

  const conversationHistory = await db
    .select()
    .from(schema.aiConversations)
    .where(
      and(
        eq(schema.aiConversations.clientId, clientId),
        eq(schema.aiConversations.contextType, 'chat'),
      ),
    )
    .orderBy(desc(schema.aiConversations.createdAt))
    .limit(10);

  const history = conversationHistory.reverse();

  try {
    let reply = '';

    if (activeProvider === 'gemini' && geminiInstance) {
      const model = geminiInstance.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const chat = model.startChat({
        systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
        history: history.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
      });
      const result = await chat.sendMessage(message);
      reply = result.response.text();
    } else if (activeProvider === 'claude' && claudeInstance) {
      const msg = await claudeInstance.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message },
        ],
      });
      reply = msg.content.map((c) => ('text' in c ? c.text : '')).join('');
    } else if (activeProvider === 'groq' && groqInstance) {
      const completion = await groqInstance.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message },
        ],
        max_tokens: 1024,
      });
      reply = completion.choices[0]?.message?.content || '';
    } else {
      reply = 'AI sozlanmagan. Admin paneldan API kalit kiriting.';
    }

    await db.insert(schema.aiConversations).values({ clientId, role: 'user', content: message, contextType: 'chat' });
    if (reply) {
      await db.insert(schema.aiConversations).values({ clientId, role: 'assistant', content: reply, contextType: 'chat' });
    }

    return reply || 'AI javob bera olmadi.';
  } catch (err) {
    logger.error(`AI chat error: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

export async function generateSmartReply(
  clientId: number,
  commentText: string,
  commentUsername: string,
): Promise<string | null> {
  // Global AI enabled check
  if (!(await isAIEnabled())) return null;

  const settings = await db
    .select()
    .from(schema.aiSettings)
    .where(and(eq(schema.aiSettings.clientId, clientId), eq(schema.aiSettings.smartReplyEnabled, true)))
    .limit(1);

  if (settings.length === 0) return null;

  const ctx = await getClientContext(clientId);
  const systemPrompt = buildSystemPrompt(clientId, ctx.knowledge, ctx.pastReplies);

  const prompt = [
    systemPrompt, '',
    `Foydalanuvchi @${commentUsername} komment qoldirdi: "${commentText}"`, '',
    "Bu kommentga mos avtomatik javob yoz. Javob qisqa va tabiiy bo'lsin.",
  ].join('\n');

  try {
    const provider = settings[0].provider as AIProvider;
    let reply = '';

    if (provider === 'gemini' && geminiInstance) {
      const model = geminiInstance.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      reply = result.response.text();
    } else if (provider === 'claude' && claudeInstance) {
      const msg = await claudeInstance.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });
      reply = msg.content.map((c) => ('text' in c ? c.text : '')).join('');
    } else if (provider === 'groq' && groqInstance) {
      const completion = await groqInstance.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      reply = completion.choices[0]?.message?.content || '';
    } else {
      return null;
    }

    if (reply) {
      await db.insert(schema.aiConversations).values({ clientId, role: 'bot', content: reply, contextType: 'auto_reply' });
    }

    return reply || null;
  } catch (err) {
    logger.error(`AI smart reply error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (geminiInstance) providers.push('gemini');
  if (claudeInstance) providers.push('claude');
  if (groqInstance) providers.push('groq');
  return providers;
}
