export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
      <div>
        {eyebrow && (
          <div className="text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-300 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-ink-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-ink-500 dark:text-ink-300 mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  sub,
  action,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200">
            {icon}
          </span>
        )}
        <div>
          <div className="font-semibold text-ink-900 dark:text-white">{title}</div>
          {sub && <div className="text-xs text-ink-400 dark:text-ink-300">{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
