import { extract } from '@extractus/feed-extractor';

export type RssItem = {
  url: string;
  title: string;
  summary?: string;
  publishedAt?: Date;
};

export async function tryExtractFeed(baseUrl: string): Promise<{ feedUrl: string; items: RssItem[] } | null> {
  const candidates = [
    new URL('/feed', baseUrl).toString(),
    new URL('/rss', baseUrl).toString(),
    new URL('/atom', baseUrl).toString(),
    new URL('/rss.xml', baseUrl).toString(),
    new URL('/feed.xml', baseUrl).toString(),
    new URL('/index.xml', baseUrl).toString(),
  ];

  for (const feedUrl of candidates) {
    try {
      const feed = await extract(feedUrl);
      const items: RssItem[] = (feed.entries ?? []).slice(0, 50).map((e) => ({
        url: e.link ?? '',
        title: e.title ?? e.link ?? 'untitled',
        summary: e.description ?? undefined,
        publishedAt: e.published ? new Date(e.published) : undefined,
      }));
      const cleaned = items.filter((i) => i.url.startsWith('http'));
      if (cleaned.length) return { feedUrl, items: cleaned };
    } catch {
      // ignore
    }
  }

  return null;
}
