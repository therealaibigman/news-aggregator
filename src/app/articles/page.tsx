import { AppShell } from '../components/AppShell';
import { ArticlesClient } from './components/ArticlesClient';

export default function ArticlesPage() {
  return (
    <AppShell
      title="Articles"
      description="Review scored articles, save what matters, and hide noise from the queue."
    >
      <ArticlesClient />
    </AppShell>
  );
}
