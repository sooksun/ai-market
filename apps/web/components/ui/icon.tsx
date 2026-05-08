import * as Lucide from 'lucide-react';

export type IconName = keyof typeof Lucide;

export function Icon({
  name,
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = Lucide[name] as React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  if (!Cmp) return null;
  return <Cmp className={className} strokeWidth={strokeWidth} />;
}
