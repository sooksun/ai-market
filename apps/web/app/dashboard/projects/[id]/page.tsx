import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus } from '@ai-market/shared';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BarChart, Donut } from '@/components/ui/charts';
import { fmtNum, classNames } from '@/components/ui/format';
import { StatusBadge } from '@/components/ui/badge';

const ALLOWED = ['DIRECTOR', 'FINANCE', 'PROJECT_OWNER', 'AUDITOR', 'ADMIN'];

interface ProjectDrillData {
  project: { id: string; code: string | null; name: string; fiscalYear: number };
  summary: {
    allocated: string;
    held: string;
    committed: string;
    spent: string;
    available: string;
    prCount: number;
  };
  budgets: Array<{
    budgetId: string;
    budgetSource: { id: string; name: string; type: string };
    allocated: string;
    held: string;
    committed: string;
    spent: string;
    available: string;
  }>;
  monthlySpend: Array<{ ym: string; spend: string }>;
  prs: Array<{
    id: string;
    docNo: string | null;
    title: string;
    status: PurchaseRequestStatus;
    requester: { id: string; fullName: string };
    budgetSource: { id: string; name: string; type: string } | null;
    selectedTotal: string | null;
    vendorName: string | null;
    createdAt: string;
    approvedAt: string | null;
  }>;
  vendorMix: Array<{ vendorName: string; total: number; prCount: number }>;
}

const VENDOR_PALETTE = [
  '#7c5cf6',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#22c55e',
  '#06b6d4',
];

function fmtMonth(ym: string): string {
  const [, m] = ym.split('-');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return months[Number(m) - 1] ?? ym;
}

const STATUS_TO_BADGE: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  RETURNED: 'returned',
  APPROVED_FOR_COMPARISON: 'reviewing',
  IN_COMPARISON: 'reviewing',
  PENDING_APPROVAL: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_RECEIVING: 'submitted',
  RECEIVED: 'completed',
  CLOSED: 'completed',
  CANCELLED: 'rejected',
};

export default async function ProjectDrillPage({
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
  let data: ProjectDrillData;
  try {
    data = await apiFetch<ProjectDrillData>(`/dashboard/projects/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const tStatus = await getTranslations('prStatus');
  const safe = (k: string): string => {
    try {
      return tStatus(k);
    } catch {
      return k;
    }
  };

  const allocated = Number(data.summary.allocated);
  const held = Number(data.summary.held);
  const committed = Number(data.summary.committed);
  const spent = Number(data.summary.spent);
  const available = Number(data.summary.available);
  const usedPct = allocated > 0 ? ((spent + committed + held) / allocated) * 100 : 0;

  const spendBars = data.monthlySpend.map((m) => ({
    label: fmtMonth(m.ym),
    value: Number(m.spend),
  }));

  const vendorTotal = data.vendorMix.reduce((s, v) => s + v.total, 0);
  const vendorSegments = data.vendorMix.slice(0, 8).map((v, i) => ({
    value: v.total,
    color: VENDOR_PALETTE[i % VENDOR_PALETTE.length] ?? '#94a3b8',
    label: v.vendorName,
  }));

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <Link
          href={'/dashboard' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปแดชบอร์ด
        </Link>

        <PageHeader
          eyebrow={`โครงการ · ปี ${data.project.fiscalYear}${data.project.code ? ` · ${data.project.code}` : ''}`}
          title={data.project.name}
          subtitle={`${data.summary.prCount} คำขอ · งบรวม ${fmtNum(allocated)} ฿ · ใช้แล้ว ${usedPct.toFixed(1)}%`}
        />

        {/* Budget summary */}
        <Card className="p-5 mb-5">
          <SectionTitle
            icon={<Icon name="Wallet" className="w-3.5 h-3.5" />}
            title="ภาพรวมงบประมาณ"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <KvBlock label="จัดสรร" value={`${fmtNum(allocated)} ฿`} tone="brand" />
            <KvBlock label="ใช้แล้ว" value={`${fmtNum(spent)} ฿`} tone="emerald" />
            <KvBlock label="กันงบ" value={`${fmtNum(held + committed)} ฿`} tone="amber" />
            <KvBlock label="คงเหลือ" value={`${fmtNum(available)} ฿`} tone={available > 0 ? 'emerald' : 'rose'} />
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            {allocated > 0 && (
              <>
                {spent > 0 && (
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(spent / allocated) * 100}%` }}
                    title={`ใช้แล้ว ${fmtNum(spent)}`}
                  />
                )}
                {committed > 0 && (
                  <div
                    className="h-full bg-brand-400"
                    style={{ width: `${(committed / allocated) * 100}%` }}
                    title={`กันงบ ${fmtNum(committed)}`}
                  />
                )}
                {held > 0 && (
                  <div
                    className="h-full bg-amber-300"
                    style={{ width: `${(held / allocated) * 100}%` }}
                    title={`กันชั่วคราว ${fmtNum(held)}`}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Budgets per source */}
          <Card className="p-5 lg:col-span-2">
            <SectionTitle
              icon={<Icon name="Landmark" className="w-3.5 h-3.5" />}
              title="แหล่งงบที่ผูกกับโครงการ"
              sub={`${data.budgets.length} แหล่ง`}
            />
            {data.budgets.length === 0 ? (
              <p className="mt-4 text-xs text-ink-400 dark:text-ink-300">
                ยังไม่ได้จัดสรรงบจากแหล่งใด
              </p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
                  <tr>
                    <th className="px-2 py-2 font-medium">แหล่งงบ</th>
                    <th className="px-2 py-2 font-medium text-right">จัดสรร</th>
                    <th className="px-2 py-2 font-medium text-right">ใช้แล้ว</th>
                    <th className="px-2 py-2 font-medium text-right">กัน</th>
                    <th className="px-2 py-2 font-medium text-right">เหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-white/5">
                  {data.budgets.map((b) => (
                    <tr key={b.budgetId}>
                      <td className="px-2 py-2.5">
                        <div className="text-sm text-ink-900 dark:text-white">
                          {b.budgetSource.name}
                        </div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">
                          {b.budgetSource.type}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {fmtNum(Number(b.allocated))}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-200">
                        {fmtNum(Number(b.spent))}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-200">
                        {fmtNum(Number(b.held) + Number(b.committed))}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-medium">
                        {fmtNum(Number(b.available))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Vendor mix */}
          <Card className="p-5">
            <SectionTitle
              icon={<Icon name="Store" className="w-3.5 h-3.5" />}
              title="ผู้ขายของโครงการนี้"
              sub={data.vendorMix.length > 0 ? `${data.vendorMix.length} ราย` : 'ไม่มีข้อมูล'}
            />
            {vendorTotal === 0 ? (
              <div className="mt-4 text-center py-8 text-xs text-ink-400 dark:text-ink-300">
                <Icon name="Store" className="w-10 h-10 mx-auto mb-2" />
                ยังไม่มีใบเสนอราคาที่เลือก
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-4">
                <Donut
                  segments={vendorSegments}
                  size={140}
                  thickness={20}
                  centerLabel={fmtNum(vendorTotal)}
                  centerSub="บาท"
                />
                <ul className="w-full space-y-1.5 text-xs">
                  {data.vendorMix.slice(0, 6).map((v, i) => (
                    <li key={v.vendorName} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: VENDOR_PALETTE[i % VENDOR_PALETTE.length] }}
                      />
                      <span className="flex-1 truncate text-ink-700 dark:text-ink-100">
                        {v.vendorName}
                      </span>
                      <span className="font-mono tabular-nums text-ink-500 dark:text-ink-300">
                        {v.prCount}× · {fmtNum(v.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Monthly spend */}
        {spendBars.length > 0 && (
          <Card className="mt-5 p-5">
            <SectionTitle
              icon={<Icon name="TrendingUp" className="w-3.5 h-3.5" />}
              title="เบิกจ่ายรายเดือนของโครงการ"
            />
            <div className="mt-4">
              <BarChart data={spendBars} height={140} />
            </div>
          </Card>
        )}

        {/* PR list */}
        <Card className="mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 dark:border-white/5 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900 dark:text-white">
              คำขอซื้อในโครงการ
            </h2>
            <span className="text-xs text-ink-400 dark:text-ink-300 tabular-nums">
              {data.prs.length} รายการ
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่</th>
                <th className="px-4 py-3 font-medium">เรื่อง</th>
                <th className="px-4 py-3 font-medium">ผู้ขอ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">ผู้ขายที่เลือก</th>
                <th className="px-4 py-3 font-medium text-right">ยอด (บาท)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {data.prs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="Inbox" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีคำขอในโครงการนี้
                  </td>
                </tr>
              )}
              {data.prs.map((pr) => (
                <tr key={pr.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {pr.docNo ?? pr.id.slice(-6)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/requests/${pr.id}` as never}
                      className="font-medium text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {pr.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-100 text-sm">
                    {pr.requester.fullName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={STATUS_TO_BADGE[pr.status]}
                      label={safe(pr.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-700 dark:text-ink-100">
                    {pr.vendorName ?? <span className="text-ink-400 dark:text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {pr.selectedTotal !== null ? fmtNum(Number(pr.selectedTotal)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/requests/${pr.id}` as never}
                      className="inline-flex items-center text-xs text-brand-600 dark:text-brand-300 hover:underline"
                    >
                      <Icon name="ArrowRight" className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}

function KvBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'emerald' | 'amber' | 'rose';
}) {
  const tones: Record<typeof tone, string> = {
    brand: 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
    amber: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
    rose: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
  };
  return (
    <div className={classNames('rounded-xl px-4 py-3', tones[tone])}>
      <div className="text-[11px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
