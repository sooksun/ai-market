import * as Lucide from 'lucide-react';
import { classNames } from './format';

type Variant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-[13px] gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-4 py-2.5 text-[15px] gap-2',
};

const VARIANTS: Record<Variant, string> = {
  primary: 'grad-brand text-white shadow-sm hover:opacity-95',
  soft: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-900/60',
  ghost:
    'text-ink-700 dark:text-ink-100 hover:bg-ink-100 dark:hover:bg-ink-800/60',
  outline:
    'ring-1 ring-ink-200 dark:ring-white/10 text-ink-700 dark:text-ink-100 bg-white dark:bg-ink-800/50 hover:bg-ink-50 dark:hover:bg-ink-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Lucide;
  iconRight?: keyof typeof Lucide;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const Icon = icon ? (Lucide[icon] as React.ComponentType<{ className?: string }>) : null;
  const IconRight = iconRight
    ? (Lucide[iconRight] as React.ComponentType<{ className?: string }>)
    : null;
  return (
    <button
      type={type}
      className={classNames(
        'inline-flex items-center font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
      {IconRight && <IconRight className="w-4 h-4" />}
    </button>
  );
}
