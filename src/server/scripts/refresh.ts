import 'dotenv/config';
import { db } from '../db';
import * as schema from '../db/schema';
import { refreshCointelegraph } from '../jobs/refresh';

async function main() {
  // Ensure default source exists.
  await db
    .insert(schema.sources)
    .values({ name: 'Cointelegraph', baseUrl: 'https://cointelegraph.com', enabled: true })
    .onConflictDoNothing();

  await refreshCointelegraph();
  console.log('refresh: done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
