'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="grid h-9 grid-cols-2 rounded-md border border-slate-300 bg-white p-0.5 text-xs font-semibold shadow-sm">
      <button
        type="button"
        className={[
          'rounded px-2 transition-colors',
          theme === 'light' ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100',
        ].join(' ')}
        aria-pressed={theme === 'light'}
        onClick={() => choose('light')}
      >
        Light
      </button>
      <button
        type="button"
        className={[
          'rounded px-2 transition-colors',
          theme === 'dark' ? 'bg-cyan-300 text-slate-950' : 'text-slate-600 hover:bg-slate-100',
        ].join(' ')}
        aria-pressed={theme === 'dark'}
        onClick={() => choose('dark')}
      >
        Dark
      </button>
    </div>
  );
}
