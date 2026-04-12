import { JSDOM } from 'jsdom';

export type ScrapedArticle = {
  url: string;
  title: string;
  summary?: string;
  publishedAt?: Date;
};

// Minimal Cointelegraph homepage scraper.
// Note: site structure can change, treat selectors as best-effort.
export async function scrapeCointelegraphHome(): Promise<ScrapedArticle[]> {
  const res = await fetch('https://cointelegraph.com/', {
    headers: {
      'user-agent': 'news-aggregator/0.1 (+https://localhost)',
      accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`cointelegraph fetch failed: ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const anchors = Array.from(doc.querySelectorAll('a[href^="/"]'))
    .map((a) => a.getAttribute('href')!)
    .filter((href) => href.startsWith('/news/') || href.startsWith('/magazine/') || href.startsWith('/learn/'));

  const urls = Array.from(new Set(anchors))
    .slice(0, 30)
    .map((path) => new URL(path, 'https://cointelegraph.com').toString());

  // Fetch titles from page cards where possible, fallback to URL.
  const titleByUrl = new Map<string, string>();
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = a.getAttribute('href');
    if (!href) continue;
    if (!href.startsWith('/news/') && !href.startsWith('/magazine/') && !href.startsWith('/learn/')) continue;
    const url = new URL(href, 'https://cointelegraph.com').toString();
    const text = (a.textContent || '').trim();
    if (text && text.length > 20 && !titleByUrl.has(url)) titleByUrl.set(url, text);
  }

  return urls.map((url) => ({ url, title: titleByUrl.get(url) ?? url }));
}
