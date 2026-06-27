import 'dotenv/config';
import { dispatchDueScrapes } from '../jobsq/dispatcher';
import { createLogger } from '../logging/logger';

const logger = createLogger('scripts.dispatch');

async function main() {
  const minutes = Number(process.env.REFRESH_MINUTES ?? 30);
  const out = await dispatchDueScrapes(minutes);
  logger.info('dispatch_finished', { refreshMinutes: minutes, ...out });
}

main().catch((e) => {
  logger.error('dispatch_fatal', { error: e });
  process.exit(1);
});
