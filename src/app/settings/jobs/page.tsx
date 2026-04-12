import Link from 'next/link';
import { JobsClient } from './components/JobsClient';

export default function JobsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings: Jobs</h1>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href="/settings">
            Settings
          </Link>
          <Link className="text-sm underline" href="/">
            Home
          </Link>
        </div>
      </div>

      <JobsClient />
    </div>
  );
}
