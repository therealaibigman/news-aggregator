import { JSDOM } from 'jsdom';
import { assertSameHost } from '../recipes/validate';

export type Recipe = {
  version: 1;
  list: {
    itemSelector: string;
    linkSelector: string;
    titleSelector?: string;
    summarySelector?: string;
    publishedAtSelector?: string;
    maxItems?: number;
  };
};

export type RecipeV2 = {
  version: 2;
  list: Recipe['list'] & {
    nextPageSelector?: string; // optional <a> to next page
    maxPages?: number;
  };
};

export type RecipeItem = {
  url: string;
  title: string;
  summary?: string;
};

export async function runRecipe(baseUrl: string, recipe: Recipe | RecipeV2): Promise<RecipeItem[]> {
  const res = await fetch(baseUrl, {
    headers: { 'user-agent': 'news-aggregator/0.1', accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const max = recipe.list.maxItems ?? 30;
  const items = Array.from(doc.querySelectorAll(recipe.list.itemSelector)).slice(0, max);

  const out: RecipeItem[] = [];
  for (const el of items) {
    const linkEl = el.querySelector(recipe.list.linkSelector) as HTMLAnchorElement | null;
    const href = linkEl?.getAttribute('href') ?? '';
    if (!href) continue;
    const url = assertSameHost(baseUrl, href);

    const title = recipe.list.titleSelector
      ? (el.querySelector(recipe.list.titleSelector)?.textContent ?? '').trim()
      : (linkEl?.textContent ?? '').trim();

    const summary = recipe.list.summarySelector
      ? (el.querySelector(recipe.list.summarySelector)?.textContent ?? '').trim()
      : '';

    out.push({ url, title: title || url, summary: summary || undefined });
  }
  return out;
}

export async function runRecipePaged(baseUrl: string, recipe: Recipe | RecipeV2): Promise<RecipeItem[]> {
  const v2 = 'version' in recipe && recipe.version === 2;
  if (!v2) return runRecipe(baseUrl, recipe);

  const r = recipe as RecipeV2;
  const maxPages = Math.max(1, Math.min(r.list.maxPages ?? 3, 10));
  const seen = new Set<string>();
  let url = baseUrl;
  const out: RecipeItem[] = [];

  for (let page = 0; page < maxPages; page++) {
    const pageItems = await runRecipe(url, r);
    for (const it of pageItems) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      out.push(it);
      if (out.length >= (r.list.maxItems ?? 30)) return out;
    }

    if (!r.list.nextPageSelector) break;

    const res = await fetch(url, { headers: { 'user-agent': 'news-aggregator/0.1', accept: 'text/html' } });
    if (!res.ok) break;
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const nextHref = (doc.querySelector(r.list.nextPageSelector) as HTMLAnchorElement | null)?.getAttribute('href');
    if (!nextHref) break;
    const nextUrl = assertSameHost(baseUrl, nextHref);
    if (nextUrl === url) break;
    url = nextUrl;
  }

  return out;
}
