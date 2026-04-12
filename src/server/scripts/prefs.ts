import 'dotenv/config';
import { buildGlobalPreferenceSummary } from '../prefs/summarize';

async function main() {
  const content = await buildGlobalPreferenceSummary();
  console.log(content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
