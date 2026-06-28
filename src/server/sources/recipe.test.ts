import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRecipe, runRecipePaged, type RecipeV2 } from './recipe';

const pages = new Map<string, { ok?: boolean; status?: number; html: string }>();

function htmlResponse(url: string) {
  const page = pages.get(url);
  if (!page) throw new Error(`unexpected fetch: ${url}`);

  return Promise.resolve({
    ok: page.ok ?? true,
    status: page.status ?? 200,
    text: () => Promise.resolve(page.html),
  } as Response);
}

const recipe = {
  version: 1,
  list: {
    itemSelector: 'article',
    linkSelector: 'a',
    titleSelector: 'h2',
    summarySelector: 'p',
    maxItems: 5,
  },
} as const;

describe('runRecipe', () => {
  beforeEach(() => {
    pages.clear();
    vi.stubGlobal('fetch', vi.fn(htmlResponse));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extracts, normalizes, and trims article fields from matching cards', async () => {
    pages.set('https://example.com/news', {
      html: `
        <article>
          <a href="/articles/one"><span>fallback title</span></a>
          <h2> First story </h2>
          <p> Summary text </p>
        </article>
        <article>
          <a href="https://example.com/articles/two">Second story</a>
        </article>
        <article><h2>No link</h2></article>
      `,
    });

    await expect(runRecipe('https://example.com/news', recipe)).resolves.toEqual([
      {
        url: 'https://example.com/articles/one',
        title: 'First story',
        summary: 'Summary text',
      },
      {
        url: 'https://example.com/articles/two',
        title: 'Second story',
        summary: undefined,
      },
    ]);
  });

  it('rejects cross-host article links from generated recipes', async () => {
    pages.set('https://example.com/news', {
      html: '<article><a href="https://evil.example/post">Bad link</a></article>',
    });

    await expect(runRecipe('https://example.com/news', recipe)).rejects.toThrow('cross-host url blocked');
  });

  it('surfaces failed page fetches with status details', async () => {
    pages.set('https://example.com/news', {
      ok: false,
      status: 503,
      html: '',
    });

    await expect(runRecipe('https://example.com/news', recipe)).rejects.toThrow('fetch failed: 503');
  });
});

describe('runRecipePaged', () => {
  beforeEach(() => {
    pages.clear();
    vi.stubGlobal('fetch', vi.fn(htmlResponse));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows same-host next links, dedupes items, and respects maxItems', async () => {
    pages.set('https://example.com/news', {
      html: `
        <article><a href="/a">A</a></article>
        <article><a href="/b">B</a></article>
        <a class="next" href="/news/page/2">Next</a>
      `,
    });
    pages.set('https://example.com/news/page/2', {
      html: `
        <article><a href="/b">B duplicate</a></article>
        <article><a href="/c">C</a></article>
        <article><a href="/d">D</a></article>
      `,
    });

    const pagedRecipe: RecipeV2 = {
      version: 2,
      list: {
        itemSelector: 'article',
        linkSelector: 'a',
        nextPageSelector: 'a.next',
        maxItems: 3,
        maxPages: 2,
      },
    };

    await expect(runRecipePaged('https://example.com/news', pagedRecipe)).resolves.toEqual([
      { url: 'https://example.com/a', title: 'A', summary: undefined },
      { url: 'https://example.com/b', title: 'B', summary: undefined },
      { url: 'https://example.com/c', title: 'C', summary: undefined },
    ]);
  });

  it('does not follow next links to another host', async () => {
    pages.set('https://example.com/news', {
      html: `
        <article><a href="/a">A</a></article>
        <a class="next" href="https://other.example/page/2">Next</a>
      `,
    });

    const pagedRecipe: RecipeV2 = {
      version: 2,
      list: {
        itemSelector: 'article',
        linkSelector: 'a',
        nextPageSelector: 'a.next',
        maxPages: 2,
      },
    };

    await expect(runRecipePaged('https://example.com/news', pagedRecipe)).rejects.toThrow('cross-host url blocked');
  });
});
