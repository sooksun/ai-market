import { classNames } from './format';

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  draft: {
    label: 'ร่าง',
    cls: 'bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-100',
    dot: 'bg-ink-400',
  },
  submitted: {
    label: 'ส่งแล้ว',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    dot: 'bg-sky-500',
  },
  reviewing: {
    label: 'กำลังตรวจ',
    cls: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  returned: {
    label: 'ตีกลับแก้ไข',
    cls: 'bg-orange-50 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    dot: 'bg-orange-500',
  },
  approved: {
    label: 'อนุมัติแล้ว',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'ไม่อนุมัติ',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    dot: 'bg-rose-500',
  },
  completed: {
    label: 'เสร็จสิ้น',
    cls: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
    dot: 'bg-brand-500',
  },
  paid: {
    label: 'เบิกจ่ายแล้ว',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'รอดำเนินการ',
    cls: 'bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-100',
    dot: 'bg-ink-400',
  },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const m = STATUS_MAP[status] ?? STATUS_MAP.pending!;
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        m.cls,
        className,
      )}
    >
      <span className={classNames('w-1.5 h-1.5 rounded-full', m.dot)} />
      {label ?? m.label}
    </span>
  );
}

const RISK_MAP: Record<string, { label: string; cls: string }> = {
  low: {
    label: 'ต่ำ',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/40',
  },
  medium: {
    label: 'ปานกลาง',
    cls: 'bg-amber-50 text-amber-800 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/40',
  },
  high: {
    label: 'สูง',
    cls: 'bg-rose-50 text-rose-700 ring-rose-200/60 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-700/40',
  },
  critical: {
    label: 'วิกฤต',
    cls: 'bg-rose-600 text-white ring-rose-700 dark:bg-rose-700 dark:ring-rose-400/40',
  },
};

export function RiskBadge({ level, className }: { level: string; className?: string }) {
  const m = RISK_MAP[level.toLowerCase()] ?? RISK_MAP.low!;
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1',
        m.cls,
        className,
      )}
    >
      ความเสี่ยง · {m.label}
    </span>
  );
}
