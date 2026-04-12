import { JSDOM } from 'jsdom';

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

export type RecipeItem = {
  url: string;
  title: string;
  summary?: string;
};

export async function runRecipe(baseUrl: string, recipe: Recipe): Promise<RecipeItem[]> {
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
    const url = new URL(href, baseUrl).toString();

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
