import 'dotenv/config';
import { runWorkerOnce } from '../jobsq/worker';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const conc = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2));
  console.log(`worker: starting (concurrency=${conc})`);

  while (true) {
    const runs = await Promise.all(Array.from({ length: conc }, () => runWorkerOnce(5)));
    const processed = runs.reduce((n, r) => n + r.processed, 0);
    if (processed === 0) {
      await sleep(2000);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
