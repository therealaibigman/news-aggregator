import 'dotenv/config';
import { runWorkerOnce } from '../jobsq/worker';
import { createLogger } from '../logging/logger';

const logger = createLogger('scripts.worker');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const conc = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2));
  logger.info('worker_started', { concurrency: conc });

  while (true) {
    const runs = await Promise.all(Array.from({ length: conc }, () => runWorkerOnce(5)));
    const processed = runs.reduce((n, r) => n + r.processed, 0);
    if (processed > 0) {
      logger.info('worker_batch_processed', { processed, concurrency: conc });
    }
    if (processed === 0) {
      await sleep(2000);
    }
  }
}

main().catch((e) => {
  logger.error('worker_fatal', { error: e });
  process.exit(1);
});
