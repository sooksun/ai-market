import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  RECEIVING_STATUS_LABELS_TH,
  type ReceivingStatus,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';

interface InboxRow {
  id: string;
  docNo: string | null;
  title: string;
  status: string;
  approvedAt: string | null;
  requester: { id: string; fullName: string };
  receiving: { id: string; status: ReceivingStatus; startedAt: string } | null;
  _count: { items: number };
}

const ALLOWED = ['INSPECTOR', 'PROCUREMENT', 'DIRECTOR', 'ADMIN'];

const STATUS_TONE: Record<ReceivingStatus, string> = {
  IN_PROGRESS: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  COMPLETE: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  PARTIAL: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  REJECTED: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
  CANCELLED: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export default async function ReceivingInboxPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const inbox = await apiFetch<InboxRow[]>('/receivings/inbox', {
    cookie: cookieStore.toString(),
  });

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="งานตรวจรับ"
          title="ใบตรวจรับ"
          subtitle="คำขอที่อนุมัติแล้วและพร้อมตรวจรับของจากผู้ขาย"
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่</th>
                <th className="px-4 py-3 font-medium">เรื่อง</th>
                <th className="w-24 px-4 py-3 font-medium">รายการ</th>
                <th className="w-36 px-4 py-3 font-medium">สถานะตรวจรับ</th>
                <th className="w-36 px-4 py-3 font-medium">ผู้ขอ</th>
                <th className="w-44 px-4 py-3 font-medium">อนุมัติเมื่อ</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {inbox.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="PackageCheck" className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                    ไม่มีคำขอที่รอตรวจรับ
                  </td>
                </tr>
              )}
              {inbox.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {row.docNo ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/receiving/${row.id}` as never}
                      className="font-medium text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-700 dark:text-ink-100">
                    {row._count.items}
                  </td>
                  <td className="px-4 py-3">
                    {row.receiving ? (
                      <span
                        className={classNames(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                          STATUS_TONE[row.receiving.status],
                        )}
                      >
                        {RECEIVING_STATUS_LABELS_TH[row.receiving.status]}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-400 dark:text-ink-300">ยังไม่เริ่ม</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-100">
                    {row.requester.fullName}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                    {row.approvedAt
                      ? new Date(row.approvedAt).toLocaleString('th-TH')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/receiving/${row.id}` as never}>
                      <Button size="sm" icon="ArrowRight">
                        {row.receiving ? 'ดู / กรอก' : 'เริ่ม'}
                      </Button>
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
