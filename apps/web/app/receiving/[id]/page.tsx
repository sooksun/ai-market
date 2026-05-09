import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus, type ReceivingStatus } from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ReceivingForm } from './receiving-form';

interface PrLite {
  id: string;
  docNo: string | null;
  title: string;
  status: PurchaseRequestStatus;
  items: Array<{
    id: string;
    ordinal: number;
    name: string;
    quantity: string;
    unit: string;
  }>;
}

interface ReceivingItemRow {
  id: string;
  purchaseRequestItemId: string;
  quantityReceived: string | null;
  condition: string | null;
  conditionNotes: string | null;
  inspectedAt: string | null;
  inspectedById: string | null;
  purchaseRequestItem: {
    id: string;
    ordinal: number;
    name: string;
    unit: string;
    quantity: string;
  };
}

interface ReceivingRecord {
  id: string;
  status: ReceivingStatus;
  startedAt: string;
  finalizedAt: string | null;
  comment: string | null;
  items: ReceivingItemRow[];
}

const ALLOWED = ['INSPECTOR', 'PROCUREMENT', 'DIRECTOR', 'ADMIN'];

export default async function ReceivingDetailPage({
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

  const record = await apiFetch<ReceivingRecord | null>(
    `/purchase-requests/${id}/receiving`,
    { cookie },
  );

  const canStart =
    !record &&
    (pr.status === 'APPROVED' || pr.status === 'IN_RECEIVING');
  const canEdit =
    record &&
    record.status === 'IN_PROGRESS' &&
    user.roles.some((r) => ['INSPECTOR', 'PROCUREMENT', 'ADMIN'].includes(r));

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <Link
          href={`/requests/${id}` as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปคำขอ {pr.docNo ?? pr.title}
        </Link>
        <PageHeader
          eyebrow={`ตรวจรับ · ${pr.docNo ?? id}`}
          title={pr.title}
          subtitle="กรอกจำนวนและสภาพของแต่ละรายการ — เมื่อเสร็จแล้วกดปิดใบตรวจรับ"
        />

        {!record && !canStart && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200">
                <Icon name="AlertTriangle" className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink-900 dark:text-white">
                  คำขอนี้ยังไม่อนุมัติ
                </h2>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-200">
                  เริ่มตรวจรับได้หลังจากผ่านสายอนุมัติแล้ว (ปัจจุบัน: <strong>{pr.status}</strong>)
                </p>
              </div>
            </div>
          </Card>
        )}

        {(record || canStart) && (
          <ReceivingForm
            prId={pr.id}
            items={pr.items.map((it) => ({
              id: it.id,
              ordinal: it.ordinal,
              name: it.name,
              unit: it.unit,
              quantityRequested: Number(it.quantity),
            }))}
            existing={record}
            canEdit={Boolean(canEdit)}
            canStart={Boolean(canStart)}
          />
        )}
      </div>
    </AppShell>
  );
}
