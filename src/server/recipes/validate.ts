export function assertSameHost(baseUrl: string, url: string) {
  const base = new URL(baseUrl);
  const u = new URL(url, baseUrl);
  if (u.host !== base.host) throw new Error(`cross-host url blocked: ${u.host} != ${base.host}`);
  return u.toString();
}
