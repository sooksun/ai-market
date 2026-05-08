'use client';

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-ink-100/70 dark:bg-ink-800/60 ring-1 ring-ink-200/60 dark:ring-white/5">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={
            'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ' +
            (value === t.value
              ? 'bg-white dark:bg-ink-700 shadow-sm text-ink-900 dark:text-white'
              : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
