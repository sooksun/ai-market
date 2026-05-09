import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus } from '@ai-market/shared';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Donut } from '@/components/ui/charts';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { fmtNum } from '@/components/ui/format';
import { FinancialSections, type FinancialData } from './financial-sections';

interface DashboardData {
  generatedAt: string;
  monthStart: string;
  summary: {
    totalPrThisMonth: number;
    submittedThisMonth: number;
    pendingReview: number;
    totalRiskFlagsActive: number;
  };
  requestsByStatus: Record<PurchaseRequestStatus, number>;
  riskCount: { LOW: number; MEDIUM: number; HIGH: number };
  topRequesters: Array<{ userId: string; fullName: string; email: string; count: number }>;
  aiUsageThisMonth: { callCount: number; tokenInput: number; tokenOutput: number };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    userName: string | null;
    createdAt: string;
  }>;
}

const ELEVATED = ['DIRECTOR', 'ADMIN'];

const STATUS_COLOR: Record<PurchaseRequestStatus, string> = {
  DRAFT: '#94a3b8',
  SUBMITTED: '#0ea5e9',
  REVIEWING: '#f59e0b',
  RETURNED: '#fb923c',
  APPROVED_FOR_COMPARISON: '#7c5cf6',
  IN_COMPARISON: '#6a44ec',
  PENDING_APPROVAL: '#a855f7',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  IN_RECEIVING: '#06b6d4',
  RECEIVED: '#22c55e',
  CLOSED: '#64748b',
  CANCELLED: '#94a3b8',
};

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ELEVATED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const [data, financial] = await Promise.all([
    apiFetch<DashboardData>('/dashboard/director', { cookie }),
    apiFetch<FinancialData>('/dashboard/financial', { cookie }),
  ]);
  const tStatus = await getTranslations('prStatus');
  const tAction = await getTranslations('auditAction');
  const tEntity = await getTranslations('entityType');
  const safe = (t: (k: string) => string, k: string) => {
    try {
      return t(k);
    } catch {
      return k;
    }
  };

  const totalRisk = data.riskCount.LOW + data.riskCount.MEDIUM + data.riskCount.HIGH;
  const totalRequests = Object.values(data.requestsByStatus).reduce((s, n) => s + n, 0);
  const monthLabel = new Date(data.monthStart).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
  });

  const statusEntries = Object.entries(data.requestsByStatus)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a) as Array<[PurchaseRequestStatus, number]>;

  const donutSegments = statusEntries.map(([status, count]) => ({
    value: count,
    color: STATUS_COLOR[status] ?? '#94a3b8',
    label: safe(tStatus, status),
  }));

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow={`ภาพรวม · ${monthLabel}`}
          title="แดชบอร์ดผู้บริหาร"
          subtitle={`ภาพรวมการจัดซื้อจัดจ้างของโรงเรียน — อัปเดต ${new Date(data.generatedAt).toLocaleString('th-TH')}`}
        />

        {/* Summary metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon="FileStack"
            label="คำขอใหม่ในเดือนนี้"
            value={fmtNum(data.summary.totalPrThisMonth)}
            sub={`ส่งเรื่องแล้ว ${fmtNum(data.summary.submittedThisMonth)}`}
            tone="brand"
          />
          <MetricCard
            icon="Clock"
            label="รอเจ้าหน้าที่ตรวจ"
            value={fmtNum(data.summary.pendingReview)}
            sub="SUBMITTED + REVIEWING"
            tone={data.summary.pendingReview > 0 ? 'amber' : 'green'}
          />
          <MetricCard
            icon="ShieldAlert"
            label="risk flag ที่ยังเปิด"
            value={fmtNum(data.summary.totalRiskFlagsActive)}
            sub={`HIGH ${data.riskCount.HIGH} · MEDIUM ${data.riskCount.MEDIUM} · LOW ${data.riskCount.LOW}`}
            tone={
              data.riskCount.HIGH > 0
                ? 'rose'
                : data.riskCount.MEDIUM > 0
                  ? 'amber'
                  : 'green'
            }
          />
          <MetricCard
            icon="Sparkles"
            label="AI calls ในเดือนนี้"
            value={fmtNum(data.aiUsageThisMonth.callCount)}
            sub={`token IN ${fmtNum(data.aiUsageThisMonth.tokenInput)} · OUT ${fmtNum(data.aiUsageThisMonth.tokenOutput)}`}
            tone="blue"
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Status donut */}
          <Card className="p-5 lg:col-span-2">
            <SectionTitle
              icon={<Icon name="PieChart" className="w-3.5 h-3.5" />}
              title="คำขอตามสถานะ"
              sub={`${fmtNum(totalRequests)} รายการรวม`}
              action={
                <Link href={'/inbox' as never}>
                  <Button variant="ghost" size="sm" iconRight="ArrowRight">
                    ไป Inbox
                  </Button>
                </Link>
              }
            />

            {totalRequests === 0 ? (
              <div className="mt-4 text-center py-12 text-sm text-ink-400 dark:text-ink-300">
                <Icon name="Inbox" className="w-10 h-10 mx-auto mb-2" />
                ยังไม่มีคำขอในระบบ
              </div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                <Donut
                  segments={donutSegments}
                  size={160}
                  thickness={22}
                  centerLabel={fmtNum(totalRequests)}
                  centerSub="รายการ"
                />
                <div className="flex-1 w-full space-y-2">
                  {statusEntries.map(([status, count]) => {
                    const pct = totalRequests > 0 ? (count / totalRequests) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: STATUS_COLOR[status] }}
                          />
                          <span className="flex-1 text-ink-700 dark:text-ink-100">
                            {safe(tStatus, status)}
                          </span>
                          <span className="font-mono tabular-nums text-ink-500 dark:text-ink-300">
                            {count}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              background: STATUS_COLOR[status],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Risk severity */}
          <Card className="p-5">
            <SectionTitle
              icon={<Icon name="ShieldAlert" className="w-3.5 h-3.5" />}
              title="Risk flag ที่ยังเปิด"
              sub={totalRisk === 0 ? 'ไม่มี flag ค้าง' : `${totalRisk} รายการ`}
            />
            {totalRisk === 0 ? (
              <div className="mt-4 text-center py-8 text-xs text-ink-400 dark:text-ink-300">
                <Icon name="ShieldCheck" className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                ดีมาก — ไม่มี risk flag ค้าง
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <RiskBar
                  label="HIGH (วิกฤต)"
                  count={data.riskCount.HIGH}
                  total={totalRisk}
                  color="bg-rose-500"
                />
                <RiskBar
                  label="MEDIUM (ปานกลาง)"
                  count={data.riskCount.MEDIUM}
                  total={totalRisk}
                  color="bg-amber-500"
                />
                <RiskBar
                  label="LOW (ต่ำ)"
                  count={data.riskCount.LOW}
                  total={totalRisk}
                  color="bg-ink-300"
                />
              </div>
            )}
          </Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Top requesters */}
          <Card className="p-5">
            <SectionTitle
              icon={<Icon name="Users" className="w-3.5 h-3.5" />}
              title="ผู้ขอซื้อมากที่สุดเดือนนี้"
            />
            {data.topRequesters.length === 0 ? (
              <p className="mt-4 text-xs text-ink-400 dark:text-ink-300">
                ยังไม่มีคำขอในเดือนนี้
              </p>
            ) : (
              <ol className="mt-4 space-y-2 text-sm">
                {data.topRequesters.map((r, idx) => (
                  <li
                    key={r.userId}
                    className="flex items-center justify-between rounded-xl bg-ink-50 dark:bg-ink-800/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <Avatar name={r.fullName} size={28} />
                      <div className="leading-tight">
                        <div className="text-sm text-ink-900 dark:text-white">{r.fullName}</div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">
                          {r.email}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-100 dark:bg-brand-900/40 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-200 tabular-nums">
                      {r.count} คำขอ
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Recent activity */}
          <Card className="p-5">
            <SectionTitle
              icon={<Icon name="Activity" className="w-3.5 h-3.5" />}
              title="กิจกรรมล่าสุด"
              action={
                <Link href={'/audit-logs' as never}>
                  <Button variant="ghost" size="sm" iconRight="ArrowRight">
                    ดูทั้งหมด
                  </Button>
                </Link>
              }
            />
            {data.recentActivity.length === 0 ? (
              <p className="mt-4 text-xs text-ink-400 dark:text-ink-300">ยังไม่มีกิจกรรม</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="text-xs">
                    <div className="text-[11px] text-ink-400 dark:text-ink-300 tabular-nums">
                      {new Date(a.createdAt).toLocaleString('th-TH')}
                    </div>
                    <div className="text-sm text-ink-800 dark:text-ink-100">
                      <span className="font-medium">{a.userName ?? '—'}</span>{' '}
                      <span className="text-ink-500 dark:text-ink-300">
                        {safe(tAction, a.action)}
                      </span>{' '}
                      {a.entityType === 'PurchaseRequest' && a.entityId ? (
                        <Link
                          href={`/requests/${a.entityId}` as never}
                          className="text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          ({safe(tEntity, a.entityType)})
                        </Link>
                      ) : (
                        <span className="text-ink-400 dark:text-ink-300">
                          ({safe(tEntity, a.entityType)})
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <FinancialSections data={financial} />
      </div>
    </AppShell>
  );
}

function RiskBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-700 dark:text-ink-100">{label}</span>
        <span className="font-mono tabular-nums text-ink-500 dark:text-ink-300">{count}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}
