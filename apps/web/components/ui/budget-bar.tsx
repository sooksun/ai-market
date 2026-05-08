export function BudgetBar({
  used = 0,
  reserved = 0,
  total = 1,
  height = 10,
}: {
  used?: number;
  reserved?: number;
  total?: number;
  height?: number;
}) {
  const u = Math.min(used / total, 1) * 100;
  const r = Math.min((used + reserved) / total, 1) * 100;
  return (
    <div className="w-full">
      <div
        className="relative w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"
        style={{ height }}
      >
        <div className="absolute inset-y-0 left-0 grad-brand" style={{ width: u + '%' }} />
        <div
          className="absolute inset-y-0 bg-brand-300/60 dark:bg-brand-400/40"
          style={{ left: u + '%', width: r - u + '%' }}
        />
      </div>
    </div>
  );
}
