import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  AUDIT_ACTION_LABELS_TH,
  ENTITY_TYPE_LABELS_TH,
  PR_STATUS_LABELS_TH,
  type PurchaseRequestStatus,
} from '@ai-market/shared';

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

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ELEVATED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const data = await apiFetch<DashboardData>('/dashboard/director', {
    cookie: cookieStore.toString(),
  });

  const totalRisk = data.riskCount.LOW + data.riskCount.MEDIUM + data.riskCount.HIGH;
  const monthLabel = new Date(data.monthStart).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard ผู้บริหาร</h1>
          <p className="text-sm text-slate-500">
            ภาพรวมระบบประจำเดือน {monthLabel} · อัปเดต{' '}
            {new Date(data.generatedAt).toLocaleString('th-TH')}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="คำขอใหม่ในเดือนนี้"
          value={data.summary.totalPrThisMonth}
          hint={`ส่งเรื่องแล้ว ${data.summary.submittedThisMonth}`}
        />
        <SummaryCard
          label="รอเจ้าหน้าที่ตรวจ"
          value={data.summary.pendingReview}
          tone={data.summary.pendingReview > 0 ? 'warn' : 'ok'}
          hint="SUBMITTED + REVIEWING"
        />
        <SummaryCard
          label="risk flag ที่ยังเปิด"
          value={data.summary.totalRiskFlagsActive}
          tone={data.riskCount.HIGH > 0 ? 'danger' : data.riskCount.MEDIUM > 0 ? 'warn' : 'ok'}
          hint={`HIGH ${data.riskCount.HIGH} · MEDIUM ${data.riskCount.MEDIUM} · LOW ${data.riskCount.LOW}`}
        />
        <SummaryCard
          label="AI calls ในเดือนนี้"
          value={data.aiUsageThisMonth.callCount}
          hint={`token IN ${data.aiUsageThisMonth.tokenInput.toLocaleString('th-TH')} / OUT ${data.aiUsageThisMonth.tokenOutput.toLocaleString('th-TH')}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Requests by status */}
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">คำขอตามสถานะ (ทั้งหมดในระบบ)</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(data.requestsByStatus)
              .filter(([, n]) => n > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const total = Object.values(data.requestsByStatus).reduce((s, n) => s + n, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">
                        {PR_STATUS_LABELS_TH[status as PurchaseRequestStatus] ?? status}
                      </span>
                      <span className="font-mono text-slate-500">{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.values(data.requestsByStatus).every((n) => n === 0) && (
              <p className="text-xs text-slate-500">ยังไม่มีคำขอในระบบ</p>
            )}
          </div>
          <Link
            href="/inbox"
            className="mt-4 inline-block text-xs text-brand-600 hover:underline"
          >
            ไป Inbox พัสดุ →
          </Link>
        </section>

        {/* Risk flags */}
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Risk flag ที่ยังเปิด</h2>
          {totalRisk === 0 ? (
            <p className="mt-4 text-xs text-slate-500">ไม่มี flag ค้าง — ดีมาก</p>
          ) : (
            <div className="mt-4 space-y-3">
              <RiskBar label="HIGH (วิกฤต)" count={data.riskCount.HIGH} total={totalRisk} colorClass="bg-red-500" />
              <RiskBar
                label="MEDIUM (ปานกลาง)"
                count={data.riskCount.MEDIUM}
                total={totalRisk}
                colorClass="bg-amber-500"
              />
              <RiskBar label="LOW (ต่ำ)" count={data.riskCount.LOW} total={totalRisk} colorClass="bg-slate-400" />
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top requesters */}
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">ผู้ขอซื้อมากที่สุดเดือนนี้</h2>
          {data.topRequesters.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">ยังไม่มีคำขอในเดือนนี้</p>
          ) : (
            <ol className="mt-4 space-y-2 text-sm">
              {data.topRequesters.map((r, idx) => (
                <li
                  key={r.userId}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-medium text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm text-slate-800">{r.fullName}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {r.count} คำขอ
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">กิจกรรมล่าสุด</h2>
            <Link href="/audit-logs" className="text-xs text-brand-600 hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">ยังไม่มีกิจกรรม</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>{new Date(a.createdAt).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="text-sm text-slate-800">
                    <span className="font-medium">{a.userName ?? '—'}</span>{' '}
                    <span className="text-slate-600">
                      {AUDIT_ACTION_LABELS_TH[a.action] ?? a.action}
                    </span>{' '}
                    {a.entityType === 'PurchaseRequest' && a.entityId ? (
                      <Link
                        href={`/requests/${a.entityId}` as never}
                        className="text-brand-600 hover:underline"
                      >
                        ({ENTITY_TYPE_LABELS_TH[a.entityType]})
                      </Link>
                    ) : (
                      <span className="text-slate-500">
                        ({ENTITY_TYPE_LABELS_TH[a.entityType] ?? a.entityType})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : 'text-brand-600';
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${toneClass}`}>
        {value.toLocaleString('th-TH')}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function RiskBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">{count}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${colorClass}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}
