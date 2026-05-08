export const fmtTHB = (n: number): string =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n);

export const fmtNum = (n: number): string => new Intl.NumberFormat('th-TH').format(n);

export function classNames(...args: Array<string | undefined | false | null>): string {
  return args.filter(Boolean).join(' ');
}
