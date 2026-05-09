import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  RISK_TYPE_LABELS_TH,
  RISK_SEVERITY_LABELS_TH,
  type RiskTypeValue,
  type RiskSeverityValue,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';

const ALLOWED = ['AUDITOR', 'DIRECTOR', 'PROCUREMENT', 'ADMIN'];

interface ScanDetail {
  id: string;
  ranBy: { id: string; fullName: string };
  prCount: number;
  flagCount: number;
  scope: unknown;
  notes: string | null;
  createdAt: string;
  flags: {
    id: string;
    type: RiskTypeValue;
    severity: RiskSeverityValue;
    message: string;
    detail: unknown;
    modelVersion: string | null;
    createdAt: string;
    dismissedAt: string | null;
    purchaseRequest: { id: string; docNo: string | null; title: string } | null;
    item: { id: string; name: string; ordinal: number } | null;
  }[];
}

const SEVERITY_TONE: Record<RiskSeverityValue, string> = {
  HIGH: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 ring-rose-200/60 dark:ring-rose-700/40',
  MEDIUM: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 ring-amber-200/60 dark:ring-amber-700/40',
  LOW: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 ring-emerald-200/60 dark:ring-emerald-700/40',
};

const SEVERITY_RANK: Record<RiskSeverityValue, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default async function AuditScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  let scan: ScanDetail;
  try {
    scan = await apiFetch<ScanDetail>(`/audit/scans/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // group flags by PR
  const byPr = new Map<
    string,
    { pr: NonNullable<ScanDetail['flags'][number]['purchaseRequest']>; flags: ScanDetail['flags'] }
  >();
  const orphan: ScanDetail['flags'] = [];
  for (const f of scan.flags) {
    if (!f.purchaseRequest) {
      orphan.push(f);
      continue;
    }
    const e = byPr.get(f.purchaseRequest.id) ?? { pr: f.purchaseRequest, flags: [] };
    e.flags.push(f);
    byPr.set(f.purchaseRequest.id, e);
  }
  const groups = Array.from(byPr.values()).sort((a, b) => {
    const aMax = Math.min(...a.flags.map((f) => SEVERITY_RANK[f.severity]));
    const bMax = Math.min(...b.flags.map((f) => SEVERITY_RANK[f.severity]));
    return aMax - bMax;
  });

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <Link
          href={'/audit' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปหน้า audit
        </Link>

        <PageHeader
          eyebrow={`Audit scan · ${scan.id.slice(-8)}`}
          title={`สแกน ${scan.prCount} PR · พบ ${scan.flagCount} ความเสี่ยง`}
          subtitle={`โดย ${scan.ranBy.fullName} · ${new Date(scan.createdAt).toLocaleString('th-TH')}`}
        />

        {scan.notes && (
          <Card className="p-5 mb-6 border-l-4 border-brand-400">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200">
                <Icon name="Sparkles" className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-ink-400 dark:text-ink-300">
                  AI สรุป
                </h3>
                <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">
                  {scan.notes}
                </p>
              </div>
            </div>
          </Card>
        )}

        {groups.length === 0 && orphan.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon name="ShieldCheck" className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <p className="text-sm text-ink-700 dark:text-ink-100">
              ไม่พบความเสี่ยงในขอบเขตนี้
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <Card key={g.pr.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 dark:border-white/5 bg-ink-50/40 dark:bg-ink-900/40 px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-ink-700 dark:text-ink-100">
                      {g.pr.docNo ?? g.pr.id.slice(-6)}
                    </span>
                    <span className="text-sm font-medium text-ink-900 dark:text-white truncate">
                      {g.pr.title}
                    </span>
                  </div>
                  <Link
                    href={`/requests/${g.pr.id}` as never}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    เปิด PR <Icon name="ArrowRight" className="w-3 h-3" />
                  </Link>
                </div>
                <ul className="divide-y divide-ink-100 dark:divide-white/5">
                  {g.flags
                    .slice()
                    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
                    .map((f) => (
                      <FlagRow key={f.id} flag={f} />
                    ))}
                </ul>
              </Card>
            ))}
            {orphan.length > 0 && (
              <Card>
                <div className="border-b border-ink-100 dark:border-white/5 bg-ink-50/40 dark:bg-ink-900/40 px-5 py-3 text-sm font-medium">
                  ไม่ผูก PR
                </div>
                <ul className="divide-y divide-ink-100 dark:divide-white/5">
                  {orphan.map((f) => (
                    <FlagRow key={f.id} flag={f} />
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FlagRow({ flag }: { flag: ScanDetail['flags'][number] }) {
  const detail = flag.detail as Record<string, unknown> | null | undefined;
  const suggestion =
    detail && typeof detail.suggestion === 'string' ? detail.suggestion : null;
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span
          className={classNames(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
            SEVERITY_TONE[flag.severity],
          )}
        >
          {RISK_SEVERITY_LABELS_TH[flag.severity]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-ink-700 dark:text-ink-100">
            {RISK_TYPE_LABELS_TH[flag.type]}
            {flag.item && (
              <span className="ml-2 font-normal text-ink-400 dark:text-ink-300">
                #{flag.item.ordinal} {flag.item.name}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">
            {flag.message}
          </p>
          {suggestion && (
            <p className="mt-1 text-xs text-brand-700 dark:text-brand-200">
              <Icon name="Lightbulb" className="inline h-3 w-3 mr-1" />
              {suggestion}
            </p>
          )}
          <div className="mt-1 text-[11px] text-ink-400 dark:text-ink-300 font-mono">
            {flag.modelVersion ?? 'manual'}
          </div>
        </div>
      </div>
    </li>
  );
}
