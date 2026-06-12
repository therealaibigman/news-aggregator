import { AppShell } from '@/app/components/AppShell';
import { JobsClient } from './components/JobsClient';

export default function JobsPage() {
  return (
    <AppShell title="Job Queue" description="Dispatch, drain, retry, and clean scrape or scoring jobs.">
      <JobsClient />
    </AppShell>
  );
}
