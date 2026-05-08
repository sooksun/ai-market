export function Sparkline({
  data,
  stroke = '#6a44ec',
  fill = 'rgba(106,68,236,0.12)',
  height = 48,
  width = 160,
}: {
  data: number[];
  stroke?: string;
  fill?: string;
  height?: number;
  width?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const points = data.map<[number, number]>((d, i) => [
    i * stepX,
    height - ((d - min) / span) * (height - 6) - 3,
  ]);
  const path = points
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={fill} />
      <path
        d={path}
        className="sparkline"
        stroke={stroke}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  dim?: boolean;
}

export function BarChart({
  data,
  height = 160,
  labelClassName,
}: {
  data: BarDatum[];
  height?: number;
  labelClassName?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 22);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group">
              <div className="text-[10px] tabular-nums text-ink-400 dark:text-ink-300 mb-1 opacity-0 group-hover:opacity-100 transition">
                {d.value.toLocaleString('th-TH')}
              </div>
              <div
                className="w-full rounded-t-md grad-brand transition-all"
                style={{ height: h, opacity: d.dim ? 0.35 : 1 }}
              />
              <div className={`mt-1.5 text-[11px] ${labelClassName ?? 'text-ink-500 dark:text-ink-300'}`}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

export function Donut({
  segments,
  size = 140,
  thickness = 18,
  centerLabel,
  centerSub,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string | number;
  centerSub?: string;
}) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-ink-100 dark:text-ink-700"
          strokeWidth={thickness}
          fill="none"
        />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const offset = -acc;
          acc += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={dash}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-bold text-ink-900 dark:text-white tabular-nums">
            {centerLabel}
          </div>
          {centerSub && <div className="text-[11px] text-ink-400 dark:text-ink-300">{centerSub}</div>}
        </div>
      </div>
    </div>
  );
}
