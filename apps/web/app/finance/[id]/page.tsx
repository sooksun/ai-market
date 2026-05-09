import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  VOUCHER_STATUS_LABELS_TH,
  type VoucherStatus,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { KV } from '@/components/ui/kv';
import { fmtNum, classNames } from '@/components/ui/format';
import { VoucherActions } from './voucher-actions';

interface PrLite {
  id: string;
  docNo: string | null;
  title: string;
  status: string;
  approvedAt: string | null;
  requester: { id: string; fullName: string };
  project: { name: string; fiscalYear: number } | null;
  budgetSource: { name: string; type: string } | null;
}

interface VoucherDetail {
  id: string;
  status: VoucherStatus;
  voucherNumber: string | null;
  totalAmount: string;
  notes: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

const ALLOWED = ['FINANCE', 'DIRECTOR', 'ADMIN'];

const STATUS_TONE: Record<VoucherStatus, string> = {
  PENDING: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  ISSUED: 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200',
  PAID: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  CANCELLED: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export default async function FinanceVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect(`/requests/${id}`);
  }
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  let pr: PrLite;
  try {
    pr = await apiFetch<PrLite>(`/purchase-requests/${id}`, { cookie });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const voucher = await apiFetch<VoucherDetail | null>(
    `/purchase-requests/${id}/voucher`,
    { cookie },
  );
  const canEdit =
    user.roles.includes('FINANCE') || user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-4xl">
        <Link
          href={`/requests/${id}` as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปคำขอ {pr.docNo ?? pr.title}
        </Link>
        <PageHeader
          eyebrow={`การเงิน · ${pr.docNo ?? id}`}
          title={pr.title}
          subtitle={
            pr.project
              ? `โครงการ ${pr.project.name} (ปี ${pr.project.fiscalYear})${
                  pr.budgetSource
                    ? ` · แหล่งงบ ${pr.budgetSource.name} (${pr.budgetSource.type})`
                    : ''
                }`
              : undefined
          }
          actions={
            voucher && (
              <span
                className={classNames(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  STATUS_TONE[voucher.status],
                )}
              >
                {VOUCHER_STATUS_LABELS_TH[voucher.status]}
              </span>
            )
          }
        />

        <Card className="p-6">
          {voucher ? (
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <KV k="เลขใบสำคัญ" v={voucher.voucherNumber ?? '—'} mono />
              <KV
                k="ยอดรวม"
                v={`${fmtNum(Number(voucher.totalAmount))} ฿`}
                mono
              />
              <KV
                k="ออกเลขเมื่อ"
                v={
                  voucher.issuedAt
                    ? new Date(voucher.issuedAt).toLocaleString('th-TH')
                    : '—'
                }
              />
              <KV
                k="จ่ายเมื่อ"
                v={
                  voucher.paidAt
                    ? new Date(voucher.paidAt).toLocaleString('th-TH')
                    : '—'
                }
              />
              <KV k="วิธีจ่าย" v={voucher.paymentMethod ?? '—'} />
              <KV k="หลักฐาน/Ref" v={voucher.paymentRef ?? '—'} mono />
              {voucher.cancelledAt && (
                <KV
                  k="ยกเลิกเมื่อ"
                  v={new Date(voucher.cancelledAt).toLocaleString('th-TH')}
                />
              )}
              {voucher.cancelReason && (
                <KV k="เหตุผลยกเลิก" v={voucher.cancelReason} />
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200">
                <Icon name="AlertTriangle" className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink-900 dark:text-white">
                  ยังไม่มีใบสำคัญ
                </h2>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-200">
                  คำขอนี้สถานะ <strong>{pr.status}</strong> · กดปุ่มด้านล่างเพื่อสร้าง
                  ใบสำคัญ (ระบบจะคำนวณยอดจากใบเสนอราคาที่เลือก)
                </p>
              </div>
            </div>
          )}
        </Card>

        {canEdit && (
          <VoucherActions
            prId={id}
            prStatus={pr.status}
            voucher={voucher}
          />
        )}
      </div>
    </AppShell>
  );
}
