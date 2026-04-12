import Link from 'next/link';

export default function ArticlesPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Articles</h1>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href="/">
            Home
          </Link>
          <Link className="text-sm underline" href="/settings">
            Settings
          </Link>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-700">UI upgrade placeholder. Next: filters + list + why panel.</div>
    </div>
  );
}
