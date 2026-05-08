import { Card } from './card';
import { Icon } from './icon';
import { Confidence } from './confidence';

export function AIInsightCard({
  title,
  body,
  confidence = 0.86,
  evidence = [],
  action = 'ตรวจสอบข้อเสนอ',
  onAction,
}: {
  title: string;
  body: string;
  confidence?: number;
  evidence?: string[];
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full grad-brand-soft blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white">
            <Icon name="Sparkles" className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-200">
            AI Co-pilot
          </div>
          <div className="ml-auto">
            <Confidence value={confidence} />
          </div>
        </div>
        <h4 className="font-semibold text-ink-900 dark:text-white text-[15px] leading-snug">{title}</h4>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-200 leading-relaxed">{body}</p>
        {evidence.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {evidence.map((e, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-ink-50 dark:bg-ink-900/50 text-ink-600 dark:text-ink-200 ring-1 ring-ink-100 dark:ring-white/5"
              >
                <Icon name="Link2" className="w-3 h-3" />
                {e}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg grad-brand text-white text-sm font-medium shadow-sm hover:opacity-95"
          >
            <Icon name="UserCheck" className="w-3.5 h-3.5" />
            {action}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-50 dark:bg-ink-700/50 text-ink-700 dark:text-ink-100 text-sm hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            ปิดข้อเสนอ
          </button>
          <span className="ml-auto text-[11px] text-ink-400 dark:text-ink-300">
            ผู้ใช้เป็นผู้ตัดสินใจสุดท้าย
          </span>
        </div>
      </div>
    </Card>
  );
}
