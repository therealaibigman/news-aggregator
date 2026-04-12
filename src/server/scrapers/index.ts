import { scrapeCointelegraphHome } from './cointelegraph';

export type SourceKey = 'cointelegraph';

export async function scrapeSource(key: SourceKey) {
  switch (key) {
    case 'cointelegraph':
      return scrapeCointelegraphHome();
  }
}
