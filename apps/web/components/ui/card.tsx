import { classNames } from './format';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={classNames(
        'rounded-2xl bg-white dark:bg-ink-800/70 border border-ink-100 dark:border-white/5 shadow-card',
        className,
      )}
    >
      {children}
    </div>
  );
}
