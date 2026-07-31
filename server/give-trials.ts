import db, { schema } from './backend/src/db/index.js';
import { eq } from 'drizzle-orm';

async function run() {
  const clients = await db.select().from(schema.clients);
  console.log(`Found ${clients.length} clients`);
  let count = 0;
  for (const c of clients) {
    const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.clientId, c.id));
    if (subs.length === 0) {
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 7);
      await db.insert(schema.subscriptions).values({
        clientId: c.id,
        planType: 'trial',
        status: 'active',
        endsAt,
        maxRules: 5,
        maxAccounts: 1,
      });
      count++;
    }
  }
  console.log(`Gave trials to ${count} clients.`);
  process.exit(0);
}

run().catch(console.error);
