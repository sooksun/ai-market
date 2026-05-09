import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  RISK_TYPE_LABELS_TH,
  RISK_SEVERITY_LABELS_TH,
  type AuditScanListItem,
  type RiskTypeValue,
  type RiskSeverityValue,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';
import { ScanLauncher } from './scan-launcher';

const ALLOWED = ['AUDITOR', 'DIRECTOR', 'PROCUREMENT', 'ADMIN'];

interface FlagListResponse {
  total: number;
  page: number;
  pageSize: number;
  flags: {
    id: string;
    type: RiskTypeValue;
    severity: RiskSeverityValue;
    message: string;
    modelVersion: string | null;
    createdAt: string;
    dismissedAt: string | null;
    purchaseRequest: {
      id: string;
      docNo: string | null;
      title: string;
      status: string;
    } | null;
    item: { id: string; name: string; ordinal: number } | null;
    scan: { id: string; createdAt: string } | null;
  }[];
}

const SEVERITY_TONE: Record<RiskSeverityValue, string> = {
  HIGH: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 ring-rose-200/60 dark:ring-rose-700/40',
  MEDIUM: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 ring-amber-200/60 dark:ring-amber-700/40',
  LOW: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 ring-emerald-200/60 dark:ring-emerald-700/40',
};

export default async function AuditPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const [scans, flags] = await Promise.all([
    apiFetch<AuditScanListItem[]>('/audit/scans', { cookie }),
    apiFetch<FlagListResponse>('/audit/flags?open=true&pageSize=30', { cookie }),
  ]);

  const flagsBySeverity = flags.flags.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<RiskSeverityValue, number>,
  );

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="AI Audit"
          title="ตรวจสอบความเสี่ยงคำขอซื้อด้วย AI"
          subtitle="สแกน pattern ผิดปกติย้อนหลัง — ผลทั้งหมดเป็นข้อเสนอ ผู้ตรวจเป็นผู้ตัดสินใจสุดท้าย"
        />

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryCard
            label="ความเสี่ยงสูง"
            value={flagsBySeverity.HIGH}
            tone="rose"
            icon="AlertTriangle"
          />
          <SummaryCard
            label="กลาง"
            value={flagsBySeverity.MEDIUM}
            tone="amber"
            icon="AlertCircle"
          />
          <SummaryCard
            label="ต่ำ"
            value={flagsBySeverity.LOW}
            tone="emerald"
            icon="ShieldCheck"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-white/5 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-900 dark:text-white">
                  ความเสี่ยงที่ยังไม่ได้ตรวจ
                </h2>
                <span className="text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                  {flags.total.toLocaleString('th-TH')} รายการ
                </span>
              </div>
              <ul className="divide-y divide-ink-100 dark:divide-white/5">
                {flags.flags.length === 0 && (
                  <li className="px-5 py-12 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="ShieldCheck" className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                    ไม่มีความเสี่ยงค้าง — เรียบร้อย
                  </li>
                )}
                {flags.flags.map((f) => (
                  <li key={f.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={classNames(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                          SEVERITY_TONE[f.severity],
                        )}
                      >
                        {RISK_SEVERITY_LABELS_TH[f.severity]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-300">
                          <span className="font-medium text-ink-700 dark:text-ink-100">
                            {RISK_TYPE_LABELS_TH[f.type]}
                          </span>
                          {f.purchaseRequest && (
                            <>
                              <span>·</span>
                              <Link
                                href={`/requests/${f.purchaseRequest.id}` as never}
                                className="font-mono text-brand-600 dark:text-brand-300 hover:underline"
                              >
                                {f.purchaseRequest.docNo ?? f.purchaseRequest.id.slice(-6)}
                              </Link>
                              <span className="truncate">
                                {f.purchaseRequest.title}
                              </span>
                            </>
                          )}
                          {f.item && (
                            <>
                              <span>·</span>
                              <span className="truncate">
                                #{f.item.ordinal} {f.item.name}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">
                          {f.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-400 dark:text-ink-300">
                          <span className="font-mono">{f.modelVersion ?? 'manual'}</span>
                          <span>·</span>
                          <span>
                            {new Date(f.createdAt).toLocaleString('th-TH')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-white/5 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-900 dark:text-white">
                  ประวัติการสแกน
                </h2>
                <span className="text-xs text-ink-400 dark:text-ink-300">
                  เรียงล่าสุด
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">เวลา</th>
                    <th className="px-4 py-3 font-medium">ผู้สแกน</th>
                    <th className="px-4 py-3 font-medium text-right">PR</th>
                    <th className="px-4 py-3 font-medium text-right">Flag</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-white/5">
                  {scans.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-ink-400 dark:text-ink-300"
                      >
                        <Icon name="Clock" className="mx-auto mb-2 h-8 w-8" />
                        ยังไม่เคยสแกน
                      </td>
                    </tr>
                  )}
                  {scans.map((s) => (
                    <tr key={s.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-900/30">
                      <td className="px-4 py-3 text-xs text-ink-700 dark:text-ink-100 tabular-nums">
                        {new Date(s.createdAt).toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-800 dark:text-ink-100">
                        {s.ranBy.fullName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm text-ink-700 dark:text-ink-200">
                        {s.prCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-ink-900 dark:text-white">
                        {s.flagCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/audit/${s.id}` as never}
                          className="inline-flex items-center text-xs text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          ดู <Icon name="ChevronRight" className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-6">
            <ScanLauncher />
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                ระบบตรวจอะไรบ้าง
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-ink-600 dark:text-ink-200">
                <li className="flex items-start gap-2">
                  <Icon name="ScanSearch" className="mt-0.5 h-3.5 w-3.5 text-brand-500" />
                  <span><strong>Heuristic อัตโนมัติ:</strong> ใบเสนอราคาไม่ครบ ราคาผิดปกติ ผู้ขายกระจุก ซอยรายการ เอกสารขาด</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="Sparkles" className="mt-0.5 h-3.5 w-3.5 text-brand-500" />
                  <span><strong>AI qualitative:</strong> ตรวจสเปกล็อกยี่ห้อ เหตุผลขาด รูปแบบน่าสงสัยข้าม PR</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="ShieldAlert" className="mt-0.5 h-3.5 w-3.5 text-brand-500" />
                  <span>คนเป็นผู้ตัดสินใจ — AI แค่เสนอ flag ให้ตรวจ</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'rose' | 'amber' | 'emerald';
  icon: IconName;
}) {
  const toneCls: Record<typeof tone, string> = {
    rose: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
    amber: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span
          className={classNames(
            'grid h-10 w-10 place-items-center rounded-xl',
            toneCls[tone],
          )}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs text-ink-400 dark:text-ink-300">{label}</div>
          <div className="mt-0.5 text-2xl font-semibold text-ink-900 dark:text-white tabular-nums">
            {value.toLocaleString('th-TH')}
          </div>
        </div>
      </div>
    </Card>
  );
}
