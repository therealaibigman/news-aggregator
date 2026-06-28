import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const extractMock = vi.hoisted(() => vi.fn());

vi.mock('@extractus/feed-extractor', () => ({
  extract: extractMock,
}));

import { tryExtractFeed } from './rss';

describe('tryExtractFeed', () => {
  beforeEach(() => {
    extractMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tries direct feed-looking URLs before guessing common feed paths', async () => {
    extractMock.mockResolvedValueOnce({
      entries: [
        {
          link: 'https://example.com/article/1',
          title: 'Direct feed item',
          description: 'Summary',
          published: '2026-06-27T12:00:00Z',
        },
      ],
    });

    const result = await tryExtractFeed('https://example.com/arc/outboundfeeds/rss');

    expect(extractMock).toHaveBeenCalledTimes(1);
    expect(extractMock).toHaveBeenCalledWith('https://example.com/arc/outboundfeeds/rss');
    expect(result).toEqual({
      feedUrl: 'https://example.com/arc/outboundfeeds/rss',
      items: [
        {
          url: 'https://example.com/article/1',
          title: 'Direct feed item',
          summary: 'Summary',
          publishedAt: new Date('2026-06-27T12:00:00Z'),
        },
      ],
    });
  });

  it('falls through common feed candidates until one has usable http links', async () => {
    extractMock
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ entries: [{ link: '/relative', title: 'Relative item' }] })
      .mockResolvedValueOnce({
        entries: [
          { link: 'https://example.com/article/2', title: undefined },
          { link: 'mailto:tips@example.com', title: 'Tip line' },
        ],
      });

    const result = await tryExtractFeed('https://example.com');

    expect(extractMock.mock.calls.map(([url]) => url)).toEqual([
      'https://example.com/feed',
      'https://example.com/rss',
      'https://example.com/atom',
    ]);
    expect(result).toEqual({
      feedUrl: 'https://example.com/atom',
      items: [
        {
          url: 'https://example.com/article/2',
          title: 'https://example.com/article/2',
          summary: undefined,
          publishedAt: undefined,
        },
      ],
    });
  });

  it('returns null when no candidate yields usable article links', async () => {
    extractMock.mockResolvedValue({ entries: [{ link: '', title: 'No URL' }] });

    await expect(tryExtractFeed('https://example.com')).resolves.toBeNull();

    expect(extractMock).toHaveBeenCalledTimes(6);
  });
});
