export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-ink-50 dark:bg-ink-900/50 ring-1 ring-ink-100 dark:ring-white/5">
      <span className="text-[11px] font-medium text-ink-500 dark:text-ink-300">ความมั่นใจ AI</span>
      <div className="w-16 h-1.5 rounded-full bg-ink-100 dark:bg-ink-700 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: pct + '%' }} />
      </div>
      <span className="text-[11px] font-semibold text-ink-800 dark:text-ink-100 tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
