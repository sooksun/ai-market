import { classNames } from './format';

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={classNames('block', className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-ink-700 dark:text-ink-100">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
        {hint && <span className="text-[11px] text-ink-400 dark:text-ink-300">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export const TextInput = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={classNames(
      'w-full rounded-xl bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 px-3 py-2 text-sm placeholder:text-ink-300 dark:placeholder:text-ink-400 text-ink-900 dark:text-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200/50 dark:focus:ring-brand-500/30 outline-none',
      className,
    )}
  />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={classNames(
      'w-full rounded-xl bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 px-3 py-2 text-sm placeholder:text-ink-300 dark:placeholder:text-ink-400 text-ink-900 dark:text-white focus:border-brand-400 focus:ring-2 focus:ring-brand-200/50 dark:focus:ring-brand-500/30 outline-none',
      className,
    )}
  />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={classNames(
      'w-full appearance-none rounded-xl bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 px-3 py-2 text-sm text-ink-900 dark:text-white focus:border-brand-400 outline-none',
      className,
    )}
  >
    {children}
  </select>
);
