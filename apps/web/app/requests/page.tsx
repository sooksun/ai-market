import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus } from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';

interface PrListItem {
  id: string;
  docNo: string | null;
  title: string;
  status: PurchaseRequestStatus;
  createdAt: string;
  requester: { id: string; fullName: string };
  _count: { items: number; riskFlags: number };
}

interface PrListResponse {
  data: PrListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const STATUS_TO_BADGE: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  RETURNED: 'returned',
  APPROVED_FOR_COMPARISON: 'approved',
  IN_COMPARISON: 'reviewing',
  PENDING_APPROVAL: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_RECEIVING: 'reviewing',
  RECEIVED: 'completed',
  CLOSED: 'completed',
  CANCELLED: 'rejected',
};

export default async function RequestsPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const list = await apiFetch<PrListResponse>('/purchase-requests?pageSize=20', {
    cookie: cookieStore.toString(),
  });
  const tStatus = await getTranslations('prStatus');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="คำขอซื้อ · ของคุณและของโรงเรียน"
          title="รายการคำขอซื้อ"
          subtitle="คำขอซื้อ/จ้างที่อยู่ในขั้นตอนต่าง ๆ — กดที่ชื่อเรื่องเพื่อดูรายละเอียด"
          actions={
            <Link href={'/requests/new' as never}>
              <Button icon="Plus">สร้างคำขอใหม่</Button>
            </Link>
          }
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่</th>
                <th className="px-4 py-3 font-medium">เรื่อง</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">รายการ</th>
                <th className="px-4 py-3 font-medium">เสี่ยง</th>
                <th className="px-4 py-3 font-medium">ผู้ขอ</th>
                <th className="px-4 py-3 font-medium">วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {list.data.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="Inbox" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีคำขอซื้อ — กด "สร้างคำขอใหม่" เพื่อเริ่ม
                  </td>
                </tr>
              )}
              {list.data.map((pr) => (
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
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={STATUS_TO_BADGE[pr.status]!}
                      label={tStatus(pr.status)}
                    />
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
                    {new Date(pr.createdAt).toLocaleDateString('th-TH')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {list.meta.total > list.data.length && (
          <div className="mt-3 text-xs text-ink-400 dark:text-ink-300">
            แสดง {list.data.length} จาก {list.meta.total} รายการ
          </div>
        )}
      </div>
    </AppShell>
  );
}
