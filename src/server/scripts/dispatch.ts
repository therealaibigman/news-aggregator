import 'dotenv/config';
import { dispatchDueScrapes } from '../jobsq/dispatcher';

async function main() {
  const minutes = Number(process.env.REFRESH_MINUTES ?? 30);
  const out = await dispatchDueScrapes(minutes);
  console.log(`dispatch: enqueued=${out.enqueued}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
