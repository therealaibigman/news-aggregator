type Source = {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  refreshMinutes: number | null;
};

export default async function Home() {
  const res = await fetch('http://localhost:3000/api/sources', { cache: 'no-store' });
  const sources = (await res.json()) as Source[];

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">News Aggregator</h1>
      <p className="text-sm text-gray-600 mt-2">Sources (MVP)</p>

      <div className="mt-6 space-y-2">
        {sources.length === 0 ? (
          <div className="text-sm text-gray-700">No sources yet. POST to /api/ingest with a URL to add one.</div>
        ) : (
          sources.map((s) => (
            <div key={s.id} className="rounded border p-3">
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-gray-700">{s.baseUrl}</div>
              <div className="text-xs text-gray-500">
                enabled: {String(s.enabled)} · refreshMinutes: {String(s.refreshMinutes)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
