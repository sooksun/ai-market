import { classNames } from './format';

export function KV({
  k,
  v,
  mono,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-dashed border-ink-100 dark:border-white/5 last:border-0">
      <span className="text-[12.5px] text-ink-500 dark:text-ink-300">{k}</span>
      <span
        className={classNames(
          'text-sm font-medium text-ink-900 dark:text-white',
          mono && 'font-mono tabular-nums',
        )}
      >
        {v}
      </span>
    </div>
  );
}
