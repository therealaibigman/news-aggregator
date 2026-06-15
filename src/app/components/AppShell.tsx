import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/articles', label: 'Articles' },
  { href: '/settings', label: 'Settings' },
];

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-950">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_0_3px_rgba(34,211,238,0.16)]" />
              News Aggregator
            </Link>
            <nav className="flex items-center gap-1 rounded-md bg-slate-100 p-1 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded px-3 py-1.5 text-slate-600 hover:bg-white hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
      {children}
    </div>
  );
}
