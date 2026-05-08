import { Card } from './card';
import { Icon, type IconName } from './icon';

type Tone = 'brand' | 'blue' | 'green' | 'amber' | 'rose';

const TONES: Record<Tone, string> = {
  brand: 'from-brand-500/15 to-brand-500/0 text-brand-700 dark:text-brand-200',
  blue: 'from-sky-500/15 to-sky-500/0 text-sky-700 dark:text-sky-200',
  green: 'from-emerald-500/15 to-emerald-500/0 text-emerald-700 dark:text-emerald-200',
  amber: 'from-amber-500/15 to-amber-500/0 text-amber-800 dark:text-amber-200',
  rose: 'from-rose-500/15 to-rose-500/0 text-rose-700 dark:text-rose-200',
};

export interface MetricCardProps {
  icon?: IconName;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  trend?: number;
  tone?: Tone;
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  sub,
  trend,
  tone = 'brand',
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${TONES[tone]} pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-ink-500 dark:text-ink-300 text-sm">
            {icon && <Icon name={icon} className="w-4 h-4" />}
            <span>{label}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <div className="text-3xl font-bold tracking-tight tabular-nums text-ink-900 dark:text-white">
              {value}
            </div>
            {unit && <div className="text-sm text-ink-400 dark:text-ink-300">{unit}</div>}
          </div>
          {sub && <div className="mt-1 text-xs text-ink-400 dark:text-ink-300">{sub}</div>}
        </div>
        {trend != null && (
          <div
            className={
              trend >= 0
                ? 'text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-300'
                : 'text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-300'
            }
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </Card>
  );
}
