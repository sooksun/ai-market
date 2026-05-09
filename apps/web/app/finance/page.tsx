import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  VOUCHER_STATUS_LABELS_TH,
  type VoucherStatus,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { fmtNum, classNames } from '@/components/ui/format';

interface InboxRow {
  id: string;
  docNo: string | null;
  title: string;
  status: string;
  approvedAt: string | null;
  closedAt: string | null;
  requester: { id: string; fullName: string };
  voucher: {
    id: string;
    status: VoucherStatus;
    voucherNumber: string | null;
    totalAmount: string;
    paidAt: string | null;
  } | null;
}

const ALLOWED = ['FINANCE', 'DIRECTOR', 'ADMIN'];

const VOUCHER_TONE: Record<VoucherStatus, string> = {
  PENDING: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  ISSUED: 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200',
  PAID: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  CANCELLED: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export default async function FinanceInboxPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const inbox = await apiFetch<InboxRow[]>('/finance/inbox', {
    cookie: cookieStore.toString(),
  });

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="งานการเงิน"
          title="ใบสำคัญและการเบิกจ่าย"
          subtitle="คำขอที่ตรวจรับแล้วและรอออกเลขใบสำคัญ / จ่ายจริง"
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่ PR</th>
                <th className="px-4 py-3 font-medium">เรื่อง</th>
                <th className="w-32 px-4 py-3 font-medium">เลขใบสำคัญ</th>
                <th className="w-32 px-4 py-3 font-medium text-right">ยอด (บาท)</th>
                <th className="w-32 px-4 py-3 font-medium">สถานะ</th>
                <th className="w-44 px-4 py-3 font-medium">วันที่จ่าย</th>
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
                    <Icon name="Banknote" className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                    ไม่มีใบที่รอจ่าย
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
                      href={`/finance/${row.id}` as never}
                      className="font-medium text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {row.title}
                    </Link>
                    <div className="text-[11px] text-ink-400 dark:text-ink-300">
                      ผู้ขอ: {row.requester.fullName}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {row.voucher?.voucherNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right font-medium text-ink-900 dark:text-white">
                    {row.voucher ? fmtNum(Number(row.voucher.totalAmount)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.voucher ? (
                      <span
                        className={classNames(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                          VOUCHER_TONE[row.voucher.status],
                        )}
                      >
                        {VOUCHER_STATUS_LABELS_TH[row.voucher.status]}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-400 dark:text-ink-300">
                        ยังไม่ได้สร้าง
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                    {row.voucher?.paidAt
                      ? new Date(row.voucher.paidAt).toLocaleDateString('th-TH')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/finance/${row.id}` as never}>
                      <Button size="sm" icon="ArrowRight">
                        จัดการ
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
