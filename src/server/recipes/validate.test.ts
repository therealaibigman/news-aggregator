import { describe, expect, it } from 'vitest';
import { assertSameHost } from './validate';

describe('assertSameHost', () => {
  it('resolves relative URLs against the source host', () => {
    expect(assertSameHost('https://example.com/news', '/article/1')).toBe('https://example.com/article/1');
  });

  it('allows absolute URLs on the same host', () => {
    expect(assertSameHost('https://example.com', 'https://example.com/article/1')).toBe(
      'https://example.com/article/1',
    );
  });

  it('blocks cross-host URLs', () => {
    expect(() => assertSameHost('https://example.com', 'https://other.example/article/1')).toThrow(
      'cross-host url blocked',
    );
  });
});
