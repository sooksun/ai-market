import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus } from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';

interface PrListItem {
  id: string;
  docNo: string | null;
  title: string;
  status: PurchaseRequestStatus;
  createdAt: string;
  submittedAt: string | null;
  requester: { id: string; fullName: string };
  _count: { items: number; riskFlags: number };
}

interface PrListResponse {
  data: PrListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const TABS: Array<{ key: PurchaseRequestStatus; label: string; tone: string }> = [
  { key: 'SUBMITTED', label: 'รอตรวจ', tone: 'sky' },
  { key: 'REVIEWING', label: 'กำลังตรวจ', tone: 'amber' },
  { key: 'RETURNED', label: 'ส่งกลับแล้ว', tone: 'orange' },
  { key: 'APPROVED_FOR_COMPARISON', label: 'อนุมัติเข้ารอบ', tone: 'emerald' },
];

const ELEVATED_ROLES: Array<'PROCUREMENT' | 'ADMIN' | 'DIRECTOR'> = [
  'PROCUREMENT',
  'ADMIN',
  'DIRECTOR',
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  if (!user.roles.some((r) => ELEVATED_ROLES.includes(r as never))) {
    redirect('/requests');
  }

  const activeStatus = (TABS.find((t) => t.key === params.status)?.key ??
    TABS[0]!.key) as PurchaseRequestStatus;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [active, ...counts] = await Promise.all([
    apiFetch<PrListResponse>(`/purchase-requests?status=${activeStatus}&pageSize=50`, {
      cookie: cookieHeader,
    }),
    ...TABS.map((t) =>
      apiFetch<PrListResponse>(`/purchase-requests?status=${t.key}&pageSize=1`, {
        cookie: cookieHeader,
      }),
    ),
  ]);

  const countMap = new Map<string, number>(
    TABS.map((t, i) => [t.key, counts[i]?.meta.total ?? 0]),
  );

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="งานพัสดุของฉัน"
          title="Inbox เจ้าหน้าที่พัสดุ"
          subtitle="คำขอที่ต้องตรวจตามขั้น — รับเรื่อง · ส่งกลับแก้ไข · อนุมัติเข้ารอบเปรียบเทียบ"
        />

        <nav className="mb-4 inline-flex gap-1 p-1 rounded-2xl bg-ink-100/70 dark:bg-ink-800/60 ring-1 ring-ink-200/60 dark:ring-white/5">
          {TABS.map((t) => {
            const isActive = t.key === activeStatus;
            const count = countMap.get(t.key) ?? 0;
            return (
              <Link
                key={t.key}
                href={`/inbox?status=${t.key}` as never}
                className={classNames(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white dark:bg-ink-700 shadow-sm text-ink-900 dark:text-white'
                    : 'text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white',
                )}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={classNames(
                      'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                      isActive
                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200'
                        : 'bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-200',
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่</th>
                <th className="px-4 py-3 font-medium">เรื่อง</th>
                <th className="px-4 py-3 font-medium">รายการ</th>
                <th className="px-4 py-3 font-medium">เสี่ยง</th>
                <th className="px-4 py-3 font-medium">ผู้ขอ</th>
                <th className="px-4 py-3 font-medium">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {active.data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="CheckCircle2" className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                    ไม่มีคำขอใน "{TABS.find((t) => t.key === activeStatus)?.label}"
                  </td>
                </tr>
              )}
              {active.data.map((pr) => (
                <tr
                  key={pr.id}
                  className="hover:bg-ink-50/50 dark:hover:bg-ink-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-ink-500 dark:text-ink-300">
                    {pr.docNo ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/requests/${pr.id}` as never}
                      className="font-medium text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {pr.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-700 dark:text-ink-200">
                    {pr._count.items}
                  </td>
                  <td className="px-4 py-3">
                    {pr._count.riskFlags > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-200/60 dark:ring-rose-700/40 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-200">
                        <Icon name="AlertTriangle" className="w-3 h-3" />
                        {pr._count.riskFlags}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-300 dark:text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-200">
                    {pr.requester.fullName}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-300">
                    {(pr.submittedAt
                      ? new Date(pr.submittedAt)
                      : new Date(pr.createdAt)
                    ).toLocaleString('th-TH')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {active.meta.total > active.data.length && (
            <div className="border-t border-ink-100 dark:border-white/5 bg-ink-50/40 dark:bg-ink-900/40 px-4 py-2 text-xs text-ink-400 dark:text-ink-300">
              แสดง {active.data.length} จาก {active.meta.total} รายการ
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
