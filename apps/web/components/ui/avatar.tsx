export function Avatar({
  name = '',
  size = 32,
  src,
}: {
  name?: string;
  size?: number;
  src?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  const hue = ((name.charCodeAt(0) || 0) * 13) % 360;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold ring-2 ring-white dark:ring-ink-800"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: src
          ? undefined
          : `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 30) % 360} 70% 50%))`,
      }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials || '?'
      )}
    </span>
  );
}
